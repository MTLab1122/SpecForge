import { CircuitBreakerRegistry } from "../reliability/circuit-breaker-registry.ts";
import { Logger } from "../reliability/observability.ts";
import { AppError } from "../reliability/error-envelope.ts";

export interface StreamChunk {
  sequenceNumber: number;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface StreamAssemblyResult<T = any> {
  rawText: string;
  parsedData: T;
  totalChunks: number;
  totalTokensEstimated: number;
  durationMs: number;
  recoveredFromTruncation: boolean;
  modelUsed: string;
  degradedMode: boolean;
}

export class StreamingAssembler {
  private static readonly DEFAULT_CHUNK_TIMEOUT_MS = 15_000;
  private static readonly DEFAULT_TOTAL_TIMEOUT_MS = 60_000;

  /**
   * Cleans, repairs, and parses partial or truncated JSON output.
   */
  public static repairAndParseJson<T = any>(rawInput: string): { data: T; wasRepaired: boolean } {
    let cleaned = rawInput.trim();

    // 1. Strip markdown code fence if present
    const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
    if (markdownMatch && markdownMatch[1]) {
      cleaned = markdownMatch[1].trim();
    }

    // Try direct parse first
    try {
      const parsed = JSON.parse(cleaned);
      return { data: parsed, wasRepaired: false };
    } catch {
      // Proceed to repair
    }

    // 2. Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

    // 3. Balance open strings, arrays, and objects
    let inString = false;
    let isEscaped = false;
    const stack: ("{" | "[")[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"' && !isEscaped) {
        inString = !inString;
      } else if (!inString) {
        if (char === "{" || char === "[") {
          stack.push(char);
        } else if (char === "}" && stack[stack.length - 1] === "{") {
          stack.pop();
        } else if (char === "]" && stack[stack.length - 1] === "[") {
          stack.pop();
        }
      }
      isEscaped = char === "\\" && !isEscaped;
    }

    let repaired = cleaned;

    // Close open string literal
    if (inString) {
      repaired += '"';
    }

    // Strip trailing incomplete key-value fragments like `"incomplete_prop":`
    repaired = repaired.replace(/,\s*"[^"]*":?\s*$/g, "");
    repaired = repaired.replace(/,\s*$/g, "");

    // Close unclosed objects and arrays in LIFO order
    while (stack.length > 0) {
      const top = stack.pop();
      if (top === "{") repaired += "}";
      if (top === "[") repaired += "]";
    }

    try {
      const data = JSON.parse(repaired);
      return { data, wasRepaired: true };
    } catch (finalErr: any) {
      throw new AppError({
        message: `Failed to repair and parse JSON output: ${finalErr.message}`,
        status: 502,
        code: "AI_JSON_PARSE_FAILED"
      });
    }
  }

  /**
   * Assembles an asynchronous stream of token chunks with timeout guards and JSON repair.
   */
  public static async assembleStream<T = any>(
    chunkStream: AsyncIterable<StreamChunk>,
    options: {
      expectedSchema?: string;
      chunkTimeoutMs?: number;
      totalTimeoutMs?: number;
      primaryModel?: string;
    } = {}
  ): Promise<StreamAssemblyResult<T>> {
    const startTime = Date.now();
    const chunkTimeout = options.chunkTimeoutMs || this.DEFAULT_CHUNK_TIMEOUT_MS;
    const totalTimeout = options.totalTimeoutMs || this.DEFAULT_TOTAL_TIMEOUT_MS;
    const model = options.primaryModel || "gemini-1.5-pro";

    let accumulatedText = "";
    let chunkCount = 0;
    let lastChunkTime = Date.now();

    try {
      for await (const chunk of chunkStream) {
        const now = Date.now();
        if (now - lastChunkTime > chunkTimeout) {
          throw new AppError({
            message: `AI streaming chunk timeout exceeded (${chunkTimeout}ms without tokens).`,
            status: 504,
            code: "AI_STREAM_CHUNK_TIMEOUT"
          });
        }
        if (now - startTime > totalTimeout) {
          throw new AppError({
            message: `AI total streaming budget exceeded (${totalTimeout}ms).`,
            status: 504,
            code: "AI_STREAM_TOTAL_TIMEOUT"
          });
        }

        accumulatedText += chunk.text;
        chunkCount++;
        lastChunkTime = now;

        if (chunk.isFinal) {
          break;
        }
      }
    } catch (streamErr: any) {
      Logger.warn(`Stream interrupted after ${chunkCount} chunks. Attempting partial recovery.`, {
        error: { name: streamErr.name, message: streamErr.message }
      });
    }

    if (!accumulatedText.trim()) {
      throw new AppError({
        message: "No content received from AI streaming provider.",
        status: 502,
        code: "AI_EMPTY_RESPONSE"
      });
    }

    const { data, wasRepaired } = this.repairAndParseJson<T>(accumulatedText);
    const estimatedTokens = Math.ceil(accumulatedText.length / 4);

    return {
      rawText: accumulatedText,
      parsedData: data,
      totalChunks: chunkCount,
      totalTokensEstimated: estimatedTokens,
      durationMs: Date.now() - startTime,
      recoveredFromTruncation: wasRepaired,
      modelUsed: model,
      degradedMode: wasRepaired
    };
  }

  /**
   * Executes AI generation with Circuit Breaker and automated secondary model fallback.
   */
  public static async executeWithFallback<T = any>(params: {
    primaryModel: () => Promise<T>;
    fallbackModel: () => Promise<T>;
    serviceName?: string;
  }): Promise<{ data: T; modelUsed: string; degradedMode: boolean }> {
    const serviceName = params.serviceName || "AI_GEMINI";
    const breaker = CircuitBreakerRegistry.get(serviceName);

    try {
      const data = await breaker.execute(params.primaryModel);
      return {
        data,
        modelUsed: "gemini-1.5-pro",
        degradedMode: false
      };
    } catch (primaryErr: any) {
      Logger.warn(`Primary AI Model failed or circuit open. Executing fallback model. Reason: ${primaryErr.message}`);

      try {
        const fallbackData = await params.fallbackModel();
        return {
          data: fallbackData,
          modelUsed: "gemini-1.5-flash-fallback",
          degradedMode: true
        };
      } catch (fallbackErr: any) {
        throw new AppError({
          message: `Both primary and secondary AI models failed: ${fallbackErr.message}`,
          status: 503,
          code: "AI_ALL_MODELS_UNAVAILABLE"
        });
      }
    }
  }
}
