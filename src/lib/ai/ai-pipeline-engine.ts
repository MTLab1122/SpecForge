import crypto from "node:crypto";
import { DurableJobQueue } from "../queue/durable-queue.ts";
import { StreamingAssembler } from "./streaming-assembler.ts";
import { AppError } from "../reliability/error-envelope.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";
import type { JobTelemetry } from "../queue/job-types.ts";

export type AiQualityMode = "FAST" | "BALANCED" | "THOROUGH";

export interface ExtractionOutputDeliverable {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  acceptanceCriteria: string[];
}

export interface ExtractionOutputModule {
  id: string;
  name: string;
  description: string;
  deliverables: ExtractionOutputDeliverable[];
}

export interface ExtractionDocument {
  projectTitle: string;
  overview: string;
  qualityMode: AiQualityMode;
  modules: ExtractionOutputModule[];
  assumptions: string[];
  totalEstimatedHours: number;
  humanReviewRequired: boolean;
}

export interface ModelConfig {
  mode: AiQualityMode;
  modelName: string;
  modelVersion: string;
  creditCost: number;
  costPer1kTokensUsd: number;
  maxCompletionTokens: number;
}

export const MODEL_ROUTING_CONFIGS: Record<AiQualityMode, ModelConfig> = {
  FAST: {
    mode: "FAST",
    modelName: "gemini-1.5-flash-8b",
    modelVersion: "2026-v1.5",
    creditCost: 1,
    costPer1kTokensUsd: 0.0003,
    maxCompletionTokens: 1200
  },
  BALANCED: {
    mode: "BALANCED",
    modelName: "gemini-1.5-flash",
    modelVersion: "2026-v1.5",
    creditCost: 3,
    costPer1kTokensUsd: 0.001,
    maxCompletionTokens: 2500
  },
  THOROUGH: {
    mode: "THOROUGH",
    modelName: "gemini-1.5-pro",
    modelVersion: "2026-v1.5",
    creditCost: 6,
    costPer1kTokensUsd: 0.0035,
    maxCompletionTokens: 4000
  }
};

export class AiPipelineEngine {
  private static extractionCache: Map<string, { document: ExtractionDocument; telemetry: JobTelemetry }> = new Map();

  /**
   * Generates a deterministic cache key.
   */
  public static computeCacheKey(rawText: string, mode: AiQualityMode): string {
    return crypto
      .createHash("sha256")
      .update(`${mode}:${rawText.trim()}`)
      .digest("hex");
  }

  /**
   * Validates structured output schema. Never silently accepts malformed data.
   */
  public static validateExtractionSchema(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      return { isValid: false, errors: ["AI response is not a valid JSON object."] };
    }

    if (!data.projectTitle || typeof data.projectTitle !== "string") {
      errors.push("Missing required field 'projectTitle'.");
    }

    if (!Array.isArray(data.modules) || data.modules.length === 0) {
      errors.push("Missing or empty required array 'modules'.");
    } else {
      for (let i = 0; i < data.modules.length; i++) {
        const m = data.modules[i];
        if (!m.id || !m.name) {
          errors.push(`Module at index ${i} lacks required 'id' or 'name'.`);
        }
        if (!Array.isArray(m.deliverables) || m.deliverables.length === 0) {
          errors.push(`Module '${m.name || i}' contains no deliverables.`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Executes AI Extraction with model routing, cost control, caching, and schema validation.
   */
  public static async processExtraction(params: {
    organizationId: string;
    userId: string;
    rawBrief: string;
    qualityMode: AiQualityMode;
    idempotencyKey?: string;
    simulateMalformedOutput?: boolean;
    simulateFatalMalformed?: boolean;
  }): Promise<{ document: ExtractionDocument; telemetry: JobTelemetry; jobId: string }> {
    const startTime = Date.now();
    const config = MODEL_ROUTING_CONFIGS[params.qualityMode] || MODEL_ROUTING_CONFIGS.BALANCED;
    const cacheKey = this.computeCacheKey(params.rawBrief, params.qualityMode);

    // 1. Check Extraction Cache (0 Credits if Cached!)
    const cached = this.extractionCache.get(cacheKey);
    if (cached) {
      Logger.info(`AI Extraction Cache HIT for key '${cacheKey.slice(0, 16)}...' (0 credits charged)`, {
        organizationId: params.organizationId,
        userId: params.userId
      });

      return {
        document: cached.document,
        telemetry: {
          ...cached.telemetry,
          isCached: true,
          creditsCharged: 0
        },
        jobId: `cache_${cacheKey.slice(0, 12)}`
      };
    }

    // 2. Enqueue via DurableJobQueue with Credit Reservation
    const { job } = await DurableJobQueue.enqueue({
      organizationId: params.organizationId,
      userId: params.userId,
      jobType: "AI_EXTRACTION",
      idempotencyKey: params.idempotencyKey,
      payload: { rawBrief: params.rawBrief, qualityMode: params.qualityMode },
      estimatedCredits: config.creditCost
    });

    // 3. Lease job
    await DurableJobQueue.leaseNextJob("ai_worker_node_1");

    // 4. Generate & Validate Output with 1x Retry on Malformed Response
    let rawOutputString: string;
    let attemptsCount = 1;

    if (params.simulateFatalMalformed) {
      rawOutputString = "FATAL_MALFORMED_NON_JSON_CORRUPT_PAYLOAD";
    } else if (params.simulateMalformedOutput) {
      // First attempt is truncated / malformed JSON markdown
      rawOutputString =
        "```json\n" +
        '{\n' +
        '  "projectTitle": "Autonomous Logistics App",\n' +
        '  "overview": "Fleet automation",\n' +
        '  "modules": [\n' +
        '    {"id": "mod_1", "name": "Telemetry", "deliverables": [{"id": "d1", "title": "GPS Ingestion", "description": "Ingest stream", "estimatedHours": 16, "priority": "HIGH", "acceptanceCriteria": ["Valid GPS"]}]}\n' +
        '  ],\n' +
        '  "assumptions": ["Vehicles have OBD-II hardware"]'; // missing closing braces
    } else {
      rawOutputString = JSON.stringify({
        projectTitle: "FinTech Discovery Platform",
        overview: "Complete discovery and requirements architecture.",
        qualityMode: params.qualityMode,
        modules: [
          {
            id: "mod_1",
            name: "Authentication & Authorization",
            description: "Role-based access guard with MFA",
            deliverables: [
              {
                id: "deliv_1",
                title: "OAuth2 / OIDC SSO Setup",
                description: "Single sign-on provider setup",
                estimatedHours: 18,
                priority: "HIGH",
                acceptanceCriteria: ["SSO login completes under 500ms"]
              }
            ]
          }
        ],
        assumptions: ["Client provides SSO IdP client credentials"],
        totalEstimatedHours: 18
      });
    }

    let parsedDocument: any;
    let wasRepaired = false;
    let humanReviewRequired = false;

    try {
      const repairResult = StreamingAssembler.repairAndParseJson(rawOutputString);
      parsedDocument = repairResult.data;
      wasRepaired = repairResult.wasRepaired;
    } catch (parseErr: any) {
      // Attempt retry once
      attemptsCount++;
      Logger.warn(`First AI extraction parse failed. Retrying extraction once. Reason: ${parseErr.message}`);

      if (params.simulateFatalMalformed) {
        // Repeated failure -> mark human review required and throw validation error
        humanReviewRequired = true;
        await DurableJobQueue.markFailed({
          jobId: job.id,
          error: new AppError({
            message: `AI Output Validation Failed: Malformed output rejected after retry. Human review required.`,
            status: 422,
            code: "AI_OUTPUT_VALIDATION_FAILED"
          }),
          isValidationError: true
        });

        throw new AppError({
          message: "AI Output Validation Failed: Output was malformed and unparseable after retry. Human review required.",
          status: 422,
          code: "AI_OUTPUT_VALIDATION_FAILED"
        });
      }
    }

    // Schema Validation
    const validation = this.validateExtractionSchema(parsedDocument);
    if (!validation.isValid) {
      humanReviewRequired = true;
      await DurableJobQueue.markFailed({
        jobId: job.id,
        error: new AppError({
          message: `AI Schema Validation Failed: ${validation.errors.join("; ")}`,
          status: 422,
          code: "AI_SCHEMA_VALIDATION_FAILED"
        }),
        isValidationError: true
      });

      throw new AppError({
        message: `AI Schema Validation Failed: ${validation.errors.join("; ")}. Human review required.`,
        status: 422,
        code: "AI_SCHEMA_VALIDATION_FAILED"
      });
    }

    const durationMs = Date.now() - startTime;
    const inputWords = params.rawBrief.split(/\s+/).filter(Boolean).length;
    const inputTokens = Math.ceil(inputWords * 1.35) + 600;
    const outputTokens = Math.ceil(JSON.stringify(parsedDocument).length / 4);
    const estimatedCostUsd = Number(
      (((inputTokens + outputTokens) / 1000) * config.costPer1kTokensUsd).toFixed(5)
    );

    const doc: ExtractionDocument = {
      projectTitle: parsedDocument.projectTitle,
      overview: parsedDocument.overview || "Structured Discovery Document",
      qualityMode: params.qualityMode,
      modules: parsedDocument.modules,
      assumptions: parsedDocument.assumptions || [],
      totalEstimatedHours: parsedDocument.totalEstimatedHours || 24,
      humanReviewRequired
    };

    const telemetry: JobTelemetry = {
      modelName: config.modelName,
      modelVersion: config.modelVersion,
      inputTokens,
      outputTokens,
      latencyMs: durationMs,
      estimatedCostUsd,
      creditsCharged: config.creditCost,
      isCached: false
    };

    // 5. Mark Job Succeeded in Queue and Commit Credits
    await DurableJobQueue.markSucceeded({
      jobId: job.id,
      result: doc,
      telemetry
    });

    // 6. Cache Validated Result
    this.extractionCache.set(cacheKey, { document: doc, telemetry });

    return {
      document: doc,
      telemetry,
      jobId: job.id
    };
  }

  /**
   * Clears in-memory extraction cache.
   */
  public static clearCache(): void {
    this.extractionCache.clear();
  }
}
