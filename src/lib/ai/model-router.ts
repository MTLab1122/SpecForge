import crypto from "crypto";
import { ExtractionQualityModeEnum } from "@/lib/validations/trustworthy-ai";

export interface ModelEstimateResult {
  qualityMode: "FAST" | "BALANCED" | "THOROUGH";
  modelName: string;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  estimatedCreditCost: number;
  estimatedDurationSeconds: number;
  cacheKey: string;
  isCached: boolean;
}

// In-memory cache for repeated extraction results
const EXTRACTION_CACHE = new Map<string, any>();

export class AiModelRouter {
  /**
   * Computes cache key and estimates model requirements, token count, and credit cost
   */
  public static calculateEstimate(
    rawText: string,
    qualityMode: "FAST" | "BALANCED" | "THOROUGH"
  ): ModelEstimateResult {
    const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
    const estimatedPromptTokens = Math.ceil(wordCount * 1.35) + 800; // prompt instructions overhead

    // Generate deterministic cache key
    const cacheKey = crypto
      .createHash("sha256")
      .update(`${rawText}_${qualityMode}`)
      .digest("hex");

    const isCached = EXTRACTION_CACHE.has(cacheKey);

    switch (qualityMode) {
      case "FAST":
        return {
          qualityMode: "FAST",
          modelName: "gemini-1.5-flash-8b",
          estimatedPromptTokens,
          estimatedCompletionTokens: 1200,
          estimatedCreditCost: isCached ? 0 : 1,
          estimatedDurationSeconds: isCached ? 0.5 : 3.5,
          cacheKey,
          isCached
        };

      case "BALANCED":
        return {
          qualityMode: "BALANCED",
          modelName: "gemini-1.5-flash",
          estimatedPromptTokens,
          estimatedCompletionTokens: 2500,
          estimatedCreditCost: isCached ? 0 : 3,
          estimatedDurationSeconds: isCached ? 0.5 : 7.0,
          cacheKey,
          isCached
        };

      case "THOROUGH":
        return {
          qualityMode: "THOROUGH",
          modelName: "gemini-1.5-pro",
          estimatedPromptTokens,
          estimatedCompletionTokens: 4000,
          estimatedCreditCost: isCached ? 0 : 6,
          estimatedDurationSeconds: isCached ? 0.5 : 15.0,
          cacheKey,
          isCached
        };
    }
  }

  /**
   * Retrieves cached extraction payload if present
   */
  public static getCachedExtraction(cacheKey: string): any | null {
    return EXTRACTION_CACHE.get(cacheKey) || null;
  }

  /**
   * Saves extraction payload into cache
   */
  public static setCachedExtraction(cacheKey: string, payload: any): void {
    EXTRACTION_CACHE.set(cacheKey, payload);
  }
}
