import { ReliableJobQueue } from "@/lib/reliability/job-queue";
import { StreamingAssembler } from "@/lib/ai/streaming-assembler";
import { AudioTranscriptionPipeline } from "@/lib/ai/transcription-pipeline";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";
import { ValidationError } from "@/lib/transactions/constraints";

describe("Phase 3.4 — Background Jobs & AI Pipeline Reliability Suite", () => {
  beforeEach(() => {
    ReliableJobQueue.resetQueue();
    AudioTranscriptionPipeline.clearCache();
    CircuitBreakerRegistry.resetAll();
  });

  describe("1. Reliable Leased Job Worker, Heartbeats & DLQ", () => {
    it("should enqueue and lease the highest-priority pending job", async () => {
      await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "EXPORT_TASKS",
        payload: { projectId: "p1" },
        priority: 1
      });

      await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "AI_EXTRACTION",
        payload: { projectId: "p2" },
        priority: 10 // Higher priority
      });

      const leasedJob = await ReliableJobQueue.dequeue("worker_node_1", 60_000);
      expect(leasedJob).not.toBeNull();
      expect(leasedJob?.jobType).toBe("AI_EXTRACTION");
      expect(leasedJob?.status).toBe("PROCESSING");
      expect(leasedJob?.lockedBy).toBe("worker_node_1");
      expect(leasedJob?.leaseExpiresAt).toBeDefined();
      expect(leasedJob?.heartbeatAt).toBeDefined();
    });

    it("should extend worker lease via heartbeat", async () => {
      const job = await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "LONG_REPORT",
        payload: { reportId: "rep_1" }
      });

      const leased = await ReliableJobQueue.dequeue("worker_node_2", 10_000);
      expect(leased).not.toBeNull();
      const initialExpiry = leased!.leaseExpiresAt!.getTime();

      // Extend lease by 30 seconds
      const renewed = ReliableJobQueue.heartbeat(leased!.id, "worker_node_2", 30_000);
      expect(renewed).toBe(true);

      const refreshed = ReliableJobQueue.getJob(leased!.id);
      expect(refreshed!.leaseExpiresAt!.getTime()).toBeGreaterThan(initialExpiry);
    });

    it("should reject heartbeat from unauthorized worker or non-processing job", async () => {
      const job = await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "TASK_SYNC",
        payload: {}
      });

      const leased = await ReliableJobQueue.dequeue("worker_node_1", 10_000);
      // Imposter worker attempts heartbeat
      const rejected = ReliableJobQueue.heartbeat(leased!.id, "imposter_worker_node", 30_000);
      expect(rejected).toBe(false);
    });

    it("should reap hung or expired leases and return jobs to PENDING", async () => {
      const job = await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "BATCH_ENRICHMENT",
        payload: {}
      });

      const leased = await ReliableJobQueue.dequeue("worker_hung", 5_000); // 5s lease
      expect(leased?.status).toBe("PROCESSING");

      // Simulate time passage past lease expiry
      const futureTime = new Date(Date.now() + 10_000);
      const reapedCount = ReliableJobQueue.reapExpiredLeases(futureTime);
      expect(reapedCount).toBe(1);

      const recovered = ReliableJobQueue.getJob(leased!.id);
      expect(recovered?.status).toBe("PENDING");
      expect(recovered?.lockedBy).toBeNull();
      expect(recovered?.leaseExpiresAt).toBeNull();
    });

    it("should retry with exponential backoff and route to DLQ when maxAttempts exceeded", async () => {
      const job = await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "EXTERNAL_WEBHOOK",
        payload: { url: "https://api.external.com/fail" },
        maxAttempts: 2
      });

      // Attempt 1: fails, schedules retry with backoff
      const leased1 = await ReliableJobQueue.dequeue("worker_1");
      const fail1 = await ReliableJobQueue.markFailed({
        jobId: leased1!.id,
        error: "502 Bad Gateway",
        baseDelayMs: 50
      });
      expect(fail1.isDeadLetter).toBe(false);
      expect(fail1.nextRunAt).toBeDefined();

      // Reset runAt to simulate delay passing
      const j1 = ReliableJobQueue.getJob(leased1!.id);
      j1!.nextRunAt = new Date(Date.now() - 100);

      // Attempt 2: fails again, hits maxAttempts -> routes to DEAD_LETTER
      const leased2 = await ReliableJobQueue.dequeue("worker_1");
      const fail2 = await ReliableJobQueue.markFailed({
        jobId: leased2!.id,
        error: "504 Gateway Timeout"
      });
      expect(fail2.isDeadLetter).toBe(true);

      const deadLetters = ReliableJobQueue.listDeadLetters("org_alpha");
      expect(deadLetters.length).toBe(1);
      expect(deadLetters[0].id).toBe(job.id);

      // Replay dead letter
      const replayed = await ReliableJobQueue.replayDeadLetter(job.id);
      expect(replayed.status).toBe("PENDING");
      expect(replayed.attempts).toBe(0);
    });
  });

  describe("2. Streaming LLM Chunk Assembler & Partial Failure Recovery", () => {
    it("should assemble a complete chunk stream and parse JSON data", async () => {
      async function* mockStream() {
        yield { sequenceNumber: 1, text: '{"modules": [', isFinal: false, timestamp: Date.now() };
        yield { sequenceNumber: 2, text: '{"id": "mod_1", "name": "Auth"}', isFinal: false, timestamp: Date.now() };
        yield { sequenceNumber: 3, text: ']}', isFinal: true, timestamp: Date.now() };
      }

      const result = await StreamingAssembler.assembleStream(mockStream());
      expect(result.totalChunks).toBe(3);
      expect(result.recoveredFromTruncation).toBe(false);
      expect(result.parsedData).toEqual({
        modules: [{ id: "mod_1", name: "Auth" }]
      });
    });

    it("should repair truncated JSON missing closing brackets and quotes", () => {
      const truncatedMarkdown = "```json\n" +
        '{\n' +
        '  "projectTitle": "Autonomous Logistics Platform",\n' +
        '  "modules": [\n' +
        '    {"id": "m1", "title": "Fleet Tracking", "status": "ACTIVE"},\n' +
        '    {"id": "m2", "title": "Route Optimization'; // cut off midway through string

      const { data, wasRepaired } = StreamingAssembler.repairAndParseJson<any>(truncatedMarkdown);
      expect(wasRepaired).toBe(true);
      expect(data.projectTitle).toBe("Autonomous Logistics Platform");
      expect(data.modules.length).toBe(2);
      expect(data.modules[0].title).toBe("Fleet Tracking");
      expect(data.modules[1].title).toBe("Route Optimization");
    });

    it("should repair trailing commas before closing braces/brackets", () => {
      const malformedJson = '{"features": ["SSO", "AuditLogs",], "total": 2,}';
      const { data, wasRepaired } = StreamingAssembler.repairAndParseJson<any>(malformedJson);
      expect(data.features).toEqual(["SSO", "AuditLogs"]);
      expect(data.total).toBe(2);
    });

    it("should execute with fallback model when primary model fails", async () => {
      const primaryFail = async () => {
        throw new Error("Gemini Pro API rate limit 429");
      };

      const fallbackSuccess = async () => ({
        modules: ["Fallback Module 1", "Fallback Module 2"]
      });

      const res = await StreamingAssembler.executeWithFallback({
        primaryModel: primaryFail,
        fallbackModel: fallbackSuccess
      });

      expect(res.modelUsed).toBe("gemini-1.5-flash-fallback");
      expect(res.degradedMode).toBe(true);
      expect(res.data.modules.length).toBe(2);
    });
  });

  describe("3. Audio Transcription Pipeline & Deduplication", () => {
    it("should process audio recording with progress updates and structured diarization", async () => {
      const progressEvents: number[] = [];

      const result = await AudioTranscriptionPipeline.processAudio({
        organizationId: "org_alpha",
        userId: "usr_lead",
        fileName: "client_discovery_call.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 8 * 1024 * 1024,
        onProgress: (pct) => progressEvents.push(pct)
      });

      expect(result.status).toBe("COMPLETED");
      expect(result.durationSeconds).toBeGreaterThan(0);
      expect(result.segments.length).toBe(3);
      expect(result.candidateActionItems.length).toBeGreaterThan(0);
      expect(progressEvents).toContain(100);
      expect(result.isCached).toBe(false);
    });

    it("should return cached result for duplicate audio upload", async () => {
      const payload = {
        organizationId: "org_alpha",
        userId: "usr_lead",
        fileName: "repeat_recording.wav",
        mimeType: "audio/wav",
        sizeBytes: 4 * 1024 * 1024
      };

      const first = await AudioTranscriptionPipeline.processAudio(payload);
      expect(first.isCached).toBe(false);

      const second = await AudioTranscriptionPipeline.processAudio(payload);
      expect(second.isCached).toBe(true);
      expect(second.audioHash).toBe(first.audioHash);
    });

    it("should reject disallowed audio mime types and files exceeding 25MB", async () => {
      await expect(
        AudioTranscriptionPipeline.processAudio({
          organizationId: "org_alpha",
          userId: "usr_lead",
          fileName: "malicious.exe",
          mimeType: "application/x-msdownload",
          sizeBytes: 1024
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        AudioTranscriptionPipeline.processAudio({
          organizationId: "org_alpha",
          userId: "usr_lead",
          fileName: "giant_podcast.mp3",
          mimeType: "audio/mpeg",
          sizeBytes: 30 * 1024 * 1024 // 30MB
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
