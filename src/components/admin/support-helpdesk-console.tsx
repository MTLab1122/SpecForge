"use client";

import React, { useState } from "react";
import type {
  SupportTicketItem,
  TicketStatus,
  TicketPriority
} from "@/lib/admin/support-engine";
import {
  Headphones,
  Clock,
  User,
  Shield,
  Lock,
  Send,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Filter
} from "lucide-react";

interface SupportHelpdeskConsoleProps {
  tickets: SupportTicketItem[];
  onUpdateStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  onAssignTicket: (ticketId: string, assignedUserId: string, assignedName: string) => Promise<void>;
  onSendMessage: (ticketId: string, message: string, isInternalNote: boolean) => Promise<void>;
}

export const SupportHelpdeskConsole: React.FC<SupportHelpdeskConsoleProps> = ({
  tickets,
  onUpdateStatus,
  onAssignTicket,
  onSendMessage
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || "");
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredTickets = tickets.filter(
    (t) => statusFilter === "ALL" || t.status === statusFilter
  );

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      setIsSending(true);
      await onSendMessage(selectedTicket.id, replyMessage, isInternalNote);
      setReplyMessage("");
    } finally {
      setIsSending(false);
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case "URGENT": return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300";
      case "HIGH": return "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-300";
      case "MEDIUM": return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* Left Column: Tickets Queue List (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Support Queue ({filteredTickets.length})
            </h3>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
          {filteredTickets.map((t) => {
            const isSelected = t.id === selectedTicket?.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {t.ticketNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    SLA: {t.slaTargetHours}h
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                  {t.subject}
                </h4>
                <p className="text-slate-500 line-clamp-2">{t.description}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="truncate max-w-[160px]">{t.creatorEmail}</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{t.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Ticket Conversation & Actions (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {selectedTicket ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[82vh]">
            {/* Ticket Header & Status Select */}
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {selectedTicket.subject}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => onUpdateStatus(selectedTicket.id, e.target.value as TicketStatus)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="WAITING_ON_CUSTOMER">WAITING ON CUSTOMER</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
                <span>Customer: <strong>{selectedTicket.creatorEmail}</strong></span>
                <span>Assigned: <strong>{selectedTicket.assignedName || "Unassigned"}</strong></span>
                <span>Target SLA: <strong>{selectedTicket.slaTargetHours} Hours</strong></span>
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {selectedTicket.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl text-xs space-y-1.5 ${
                    m.isInternalNote
                      ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50"
                      : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {m.authorName}
                      </span>
                      {m.isInternalNote && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Private Staff Note</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {m.message}
                  </p>
                </div>
              ))}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {isInternalNote ? "Adding Internal Staff Note (Customer cannot see)" : "Sending Public Customer Reply"}
                </span>

                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border text-xs">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      !isInternalNote ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Customer Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      isInternalNote ? "bg-amber-500 text-white shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Staff Note
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <textarea
                  rows={3}
                  placeholder={
                    isInternalNote
                      ? "Add private diagnostics, API trace info, or handoff notes..."
                      : "Type response to customer..."
                  }
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className={`px-4 rounded-xl text-white font-semibold text-xs flex items-center justify-center shadow transition-colors disabled:opacity-50 ${
                    isInternalNote ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
            <Headphones className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Ticket Selected
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

