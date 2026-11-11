"use client";

import React, { useState } from "react";
import { InvoiceStatus } from "@/lib/validations/commercial-estimation";
import {
  Receipt,
  DollarSign,
  Calendar,
  Plus,
  CreditCard,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  title: string;
  status: InvoiceStatus;
  currency: string;
  totalAmount: number;
  invoicedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  issueDate: string;
  dueDate?: string;
  notes?: string;
}

interface InvoiceLinkagePanelProps {
  estimateId: string;
  projectId: string;
  estimateGrandTotal: number;
  currency?: string;
  invoices?: InvoiceItem[];
  onCreateInvoice?: (data: { title: string; invoiceNumber: string; invoicedAmount: number; dueDate?: string; notes?: string }) => Promise<void>;
  onRecordPayment?: (invoiceId: string, amountPaid: number, notes?: string) => Promise<void>;
}

export const InvoiceLinkagePanel: React.FC<InvoiceLinkagePanelProps> = ({
  estimateId,
  projectId,
  estimateGrandTotal,
  currency = "USD",
  invoices = [],
  onCreateInvoice,
  onRecordPayment
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  // Form states
  const [invTitle, setInvTitle] = useState("");
  const [invNumber, setInvNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [invAmount, setInvAmount] = useState<number>(Number((estimateGrandTotal * 0.3).toFixed(2)));
  const [invDueDate, setInvDueDate] = useState("");
  const [invNotes, setInvNotes] = useState("");

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState("");

  // Ledger Aggregations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.invoicedAmount, 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalOutstanding = totalInvoiced - totalPaid;
  const unbilledCapacity = Math.max(0, estimateGrandTotal - totalInvoiced);
  const percentBilled = estimateGrandTotal > 0 ? Number(((totalInvoiced / estimateGrandTotal) * 100).toFixed(1)) : 0;
  const percentCollected = totalInvoiced > 0 ? Number(((totalPaid / totalInvoiced) * 100).toFixed(1)) : 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateInvoice) return;
    await onCreateInvoice({
      title: invTitle || "Project Milestone Invoice",
      invoiceNumber: invNumber,
      invoicedAmount: invAmount,
      dueDate: invDueDate || undefined,
      notes: invNotes
    });
    setShowCreateModal(false);
    setInvTitle("");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRecordPayment || !selectedInvoice) return;
    await onRecordPayment(selectedInvoice.id, paymentAmount, paymentReference);
    setShowPaymentModal(false);
    setSelectedInvoice(null);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
      case "PARTIALLY_PAID":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300";
      case "ISSUED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
      case "OVERDUE":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
    }
  };

  return (
    <div className="w-full space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <Receipt className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Estimate-to-Invoice Ledger Linkage</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Map approved scope estimates directly to milestone invoices, track paid amounts, and manage outstanding receivable balances.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Issue Milestone Invoice
        </button>
      </div>

      {/* Compliance Disclaimer Banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 text-xs">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Financial Ledger Notice:</strong> SpecForge tracks invoices, milestone billings, and manual payments as a commercial ledger. Direct card gateway transactions and merchant payment collections are handled externally.
        </span>
      </div>

      {/* 4 Financial Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Estimate Total */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Approved Estimate</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {currency} {estimateGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Commercial baseline budget</div>
        </div>

        {/* Total Invoiced */}
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Total Invoiced</div>
          <div className="text-xl font-bold text-blue-950 dark:text-blue-100 mt-1">
            {currency} {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">{percentBilled}% of estimate billed</div>
        </div>

        {/* Total Paid (Collected) */}
        <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total Paid (Collected)</div>
          <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100 mt-1">
            {currency} {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">{percentCollected}% collected to date</div>
        </div>

        {/* Outstanding Receivables */}
        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Outstanding Receivable</div>
          <div className="text-xl font-bold text-amber-950 dark:text-amber-100 mt-1">
            {currency} {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Unbilled remaining: {currency} {unbilledCapacity.toLocaleString()}</div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Invoice # & Milestone Title</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Issued Date</th>
              <th className="py-3 px-3">Due Date</th>
              <th className="py-3 px-3 text-right">Invoiced Amount</th>
              <th className="py-3 px-3 text-right">Paid Amount</th>
              <th className="py-3 px-3 text-right">Outstanding</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No invoices issued yet. Click &quot;Issue Milestone Invoice&quot; to link an invoice to this estimate.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    <div className="font-mono text-indigo-600 dark:text-indigo-400">{inv.invoiceNumber}</div>
                    <div className="text-slate-600 dark:text-slate-300 text-[11px]">{inv.title}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{inv.issueDate}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{inv.dueDate || "Net 15"}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                    {currency} {inv.invoicedAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {currency} {inv.paidAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                    {currency} {inv.outstandingAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {inv.status !== "PAID" && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setPaymentAmount(inv.outstandingAmount);
                          setShowPaymentModal(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded border border-emerald-200 dark:border-emerald-800 transition"
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Milestone Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Issue Milestone Invoice</h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Number</label>
              <input
                type="text"
                required
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Milestone Description</label>
              <input
                type="text"
                required
                placeholder="e.g. 30% Kickoff & UX Architecture Deposit"
                value={invTitle}
                onChange={(e) => setInvTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={invAmount}
                  onChange={(e) => setInvAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={invDueDate}
                  onChange={(e) => setInvDueDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Quick percentage buttons */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Presets:</span>
              {[25, 30, 50, 100].map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => setInvAmount(Number(((estimateGrandTotal * pct) / 100).toFixed(2)))}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Instructions / Notes</label>
              <textarea
                rows={2}
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
                placeholder="Direct wire instructions / bank transfer details"
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Issue Invoice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handlePaymentSubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Record Manual Payment</h4>
            <p className="text-xs text-slate-500">
              Invoice <strong>{selectedInvoice.invoiceNumber}</strong> · Outstanding: {currency} {selectedInvoice.outstandingAmount.toLocaleString()}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount Paid ({currency})</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={selectedInvoice.outstandingAmount}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reference / Bank Transaction ID</label>
              <input
                type="text"
                placeholder="e.g. Wire #WR-98218 / Check #1042"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

