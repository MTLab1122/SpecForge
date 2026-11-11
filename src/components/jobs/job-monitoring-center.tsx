"use client";

import React, { useState } from "react";
import type { DurableJob, JobState, JobType } from "@/lib/queue/job-types";
import type { WorkspaceCostSummary } from "@/lib/billing/credit-ledger";

interface JobMonitoringCenterProps {
  initialJobs?: DurableJob[];
  costSummary?: WorkspaceCostSummary;
  onRetryJob?: (jobId: string) => Promise<void>;
  onCancelJob?: (jobId: string) => Promise<void>;
}

export function JobMonitoringCenter({
  initialJobs = [],
  costSummary,
  onRetryJob,
  onCancelJob
}: JobMonitoringCenterProps) {
  const [jobs, setJobs] = useState<DurableJob[]>(initialJobs);
  const [filterState, setFilterState] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "FAILED">("ALL");
  const [selectedJob, setSelectedJob] = useState<DurableJob | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredJobs = jobs.filter((j) => {
    if (filterState === "ACTIVE") return j.status === "QUEUED" || j.status === "PROCESSING" || j.status === "RETRYING";
    if (filterState === "COMPLETED") return j.status === "SUCCEEDED";
    if (filterState === "FAILED") return j.status === "FAILED" || j.status === "DEAD_LETTER";
    return true;
  });

  const getStatusBadge = (status: JobState) => {
    switch (status) {
      case "QUEUED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Queued</span>;
      case "PROCESSING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 animate-pulse">Processing</span>;
      case "SUCCEEDED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Succeeded</span>;
      case "RETRYING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Retrying</span>;
      case "FAILED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Failed</span>;
      case "DEAD_LETTER":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-900 font-bold">Dead Letter</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Cancelled</span>;
    }
  };

  const handleRetry = async (jobId: string) => {
    if (!onRetryJob) return;
    setActionLoading(jobId);
    try {
      await onRetryJob(jobId);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: "QUEUED" as JobState, attempts: 0 } : j))
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!onCancelJob) return;
    setActionLoading(jobId);
    try {
      await onCancelJob(jobId);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: "CANCELLED" as JobState } : j))
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. Header & AI Cost Summary Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI & Background Job Pipeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time monitoring of asynchronous tasks, credit reservations, retry policies, and model telemetry.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Workspace Plan: <strong className="ml-1 uppercase">{costSummary?.tier || "AGENCY"}</strong>
            </span>
          </div>
        </div>

        {/* Cost & Credit Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Credits</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {costSummary ? costSummary.remainingCredits.toLocaleString() : "520"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Quota: {costSummary ? costSummary.monthlyQuota.toLocaleString() : "1,000"} / month
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Consumed</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              {costSummary ? costSummary.creditsUsed.toLocaleString() : "480"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {costSummary ? `${costSummary.utilizationPercent}% utilized` : "48.0% utilized"}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Holds (Reserved)</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {costSummary ? costSummary.creditsReserved.toLocaleString() : "0"}
            </div>
            <div className="text-xs text-gray-500 mt-1">Refunded automatically on job failure</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Model Spend</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              ${costSummary ? (costSummary.creditsUsed * 0.015).toFixed(2) : "7.20"}
            </div>
            <div className="text-xs text-gray-500 mt-1">Hard plan limit enforced</div>
          </div>
        </div>
      </div>

      {/* 2. Job Queue Controls & Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2">
            {(["ALL", "ACTIVE", "COMPLETED", "FAILED"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterState(filter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterState === filter
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter === "ALL" && "All Jobs"}
                {filter === "ACTIVE" && "Active / Processing"}
                {filter === "COMPLETED" && "Succeeded"}
                {filter === "FAILED" && "Failed & Dead-Letter"}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Showing {filteredJobs.length} of {jobs.length} total tasks
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium text-xs">
              <tr>
                <th scope="col" className="px-6 py-3 text-left uppercase tracking-wider">Job ID & Type</th>
                <th scope="col" className="px-6 py-3 text-left uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left uppercase tracking-wider">Attempts</th>
                <th scope="col" className="px-6 py-3 text-left uppercase tracking-wider">Credits</th>
                <th scope="col" className="px-6 py-3 text-left uppercase tracking-wider">Model / Telemetry</th>
                <th scope="col" className="px-6 py-3 text-left uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3 text-right uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No background jobs found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-gray-900">{job.id}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{job.jobType}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                      {job.humanReviewRequired && (
                        <span className="block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit">
                          Human Review
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                      {job.attempts} / {job.maxAttempts}
                      {job.status === "RETRYING" && (
                        <span className="text-purple-600 block text-[10px]">Exp backoff</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900 font-medium">
                      {job.creditsCommitted > 0
                        ? `${job.creditsCommitted} charged`
                        : job.creditsReserved > 0
                        ? `${job.creditsReserved} held`
                        : "0"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {job.telemetry?.modelName ? (
                        <div>
                          <div className="font-medium text-gray-800">{job.telemetry.modelName}</div>
                          <div className="text-[11px] text-gray-500">
                            {job.telemetry.latencyMs}ms • {job.telemetry.outputTokens || 0} tokens
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Inspect
                      </button>

                      {(job.status === "FAILED" || job.status === "DEAD_LETTER") && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          disabled={actionLoading === job.id}
                          className="text-amber-600 hover:text-amber-800 font-semibold disabled:opacity-50"
                        >
                          {actionLoading === job.id ? "Retrying..." : "Retry"}
                        </button>
                      )}

                      {(job.status === "QUEUED" || job.status === "PROCESSING") && (
                        <button
                          onClick={() => handleCancel(job.id)}
                          disabled={actionLoading === job.id}
                          className="text-rose-600 hover:text-rose-800 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Job Inspector Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Job Inspector: {selectedJob.id}</h3>
                <p className="text-xs text-gray-500">{selectedJob.jobType} • {selectedJob.idempotencyKey}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Status:</span>{" "}
                {getStatusBadge(selectedJob.status)}
              </div>
              <div>
                <span className="text-gray-500 font-medium">Timeout Budget:</span>{" "}
                {selectedJob.timeoutMs / 60000} mins
              </div>
              <div>
                <span className="text-gray-500 font-medium">Attempts:</span>{" "}
                {selectedJob.attempts} of {selectedJob.maxAttempts}
              </div>
              <div>
                <span className="text-gray-500 font-medium">Credits:</span>{" "}
                {selectedJob.creditsCommitted} committed ({selectedJob.creditsReserved} reserved)
              </div>
            </div>

            {selectedJob.errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                <div className="font-bold">Error Message:</div>
                <div className="mt-1 font-mono">{selectedJob.errorMessage}</div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Payload:</div>
              <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto max-h-40">
                {JSON.stringify(selectedJob.payload, null, 2)}
              </pre>
            </div>

            {selectedJob.result && (
              <div>
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Result:</div>
                <pre className="bg-gray-900 text-emerald-300 text-xs p-3 rounded-lg overflow-x-auto max-h-48">
                  {JSON.stringify(selectedJob.result, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
