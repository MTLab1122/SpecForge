"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Reply,
  Paperclip,
  CheckCircle2,
  Send,
  AtSign,
  User,
  Filter,
  CornerDownRight
} from "lucide-react";

export interface CommentAttachment {
  name: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface ClientCommentItem {
  id: string;
  parentId?: string | null;
  authorName: string;
  authorEmail: string;
  sectionKey: string;
  targetItemTitle?: string;
  content: string;
  isResolved: boolean;
  createdAt: string;
  attachments?: CommentAttachment[];
  replies?: ClientCommentItem[];
}

interface ClientThreadedCommentsProps {
  proposalId: string;
  comments: ClientCommentItem[];
  availableSections?: Array<{ key: string; label: string }>;
  teamMentions?: Array<{ name: string; role: string }>;
  onAddComment: (comment: {
    sectionKey: string;
    targetItemTitle?: string;
    content: string;
    authorName: string;
    authorEmail: string;
    parentId?: string;
    attachments?: CommentAttachment[];
  }) => Promise<void>;
  onToggleResolve?: (commentId: string, currentResolved: boolean) => Promise<void>;
}

export const ClientThreadedComments: React.FC<ClientThreadedCommentsProps> = ({
  proposalId,
  comments,
  availableSections = [
    { key: "GENERAL", label: "General Project Feedback" },
    { key: "deliverables.0", label: "Deliverable 1: UX Design System" },
    { key: "deliverables.1", label: "Deliverable 2: Core Frontend & API" },
    { key: "milestones.0", label: "Milestone 1: Kickoff & Specs" },
    { key: "milestones.1", label: "Milestone 2: Staging Demo" },
    { key: "investment", label: "Commercial Terms & Pricing" }
  ],
  teamMentions = [
    { name: "Sarah Lin", role: "Lead Architect" },
    { name: "Marcus Brody", role: "Technical PM" },
    { name: "Elena Rostova", role: "UI/UX Lead" }
  ],
  onAddComment,
  onToggleResolve
}) => {
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [newContent, setNewContent] = useState("");
  const [targetSectionKey, setTargetSectionKey] = useState("GENERAL");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentFields, setShowAttachmentFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !authorName.trim() || !authorEmail.trim()) return;

    try {
      setIsSubmitting(true);
      const attachments =
        attachmentName && attachmentUrl
          ? [{ name: attachmentName, url: attachmentUrl }]
          : undefined;

      const secLabel = availableSections.find((s) => s.key === targetSectionKey)?.label;

      await onAddComment({
        sectionKey: targetSectionKey,
        targetItemTitle: secLabel,
        content: newContent,
        authorName,
        authorEmail,
        attachments
      });

      setNewContent("");
      setAttachmentName("");
      setAttachmentUrl("");
      setShowAttachmentFields(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyContent.trim() || !authorName.trim() || !authorEmail.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddComment({
        sectionKey: targetSectionKey,
        content: replyContent,
        authorName,
        authorEmail,
        parentId
      });

      setReplyContent("");
      setReplyingToId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertMention = (name: string) => {
    setNewContent((prev) => `${prev} @${name} `);
  };

  // Group root comments and replies
  const rootComments = comments.filter((c) => !c.parentId);
  const filteredComments =
    selectedSection === "ALL"
      ? rootComments
      : rootComments.filter((c) => c.sectionKey === selectedSection);

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" /> Client & Team Discussion
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Leave comments, ask questions on specific deliverable cards, and coordinate with the agency team.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Filter by Section:</span>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Comments ({comments.length})</option>
            {availableSections.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* New Comment Input Box */}
      <form
        onSubmit={handlePostComment}
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Post a Comment or Question</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Your Email</label>
            <input
              type="email"
              required
              placeholder="john@client.com"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Link to Scope Section</label>
            <select
              value={targetSectionKey}
              onChange={(e) => setTargetSectionKey(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
            >
              {availableSections.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <textarea
            rows={3}
            required
            placeholder="Type your feedback, question, or change request here..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Mentions & Attachments Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1 font-medium">
              <AtSign className="w-3.5 h-3.5" /> Mention:
            </span>
            {teamMentions.map((m) => (
              <button
                type="button"
                key={m.name}
                onClick={() => insertMention(m.name)}
                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400 text-[11px] font-medium transition"
              >
                @{m.name}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowAttachmentFields((prev) => !prev)}
              className="ml-2 flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium"
            >
              <Paperclip className="w-3.5 h-3.5" /> Attach Link
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> Post Comment
          </button>
        </div>

        {/* Attachment Sub-fields */}
        {showAttachmentFields && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              placeholder="Attachment Title (e.g. Figma Brand File)"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
            <input
              type="url"
              placeholder="https://..."
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
          </div>
        )}
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            No comments logged for this view yet. Feel free to ask questions or suggest edits above.
          </div>
        ) : (
          filteredComments.map((comment) => {
            const replies = comments.filter((c) => c.parentId === comment.id);

            return (
              <div
                key={comment.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                      {comment.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {comment.authorName}
                        <span className="text-[11px] text-slate-400 font-normal">({comment.authorEmail})</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{comment.createdAt}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {comment.targetItemTitle && (
                      <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        {comment.targetItemTitle}
                      </span>
                    )}

                    {comment.isResolved ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300">
                        Resolved
                      </span>
                    ) : onToggleResolve ? (
                      <button
                        onClick={() => onToggleResolve(comment.id, comment.isResolved)}
                        className="text-[11px] text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {comment.attachments.map((att, aIdx) => (
                      <a
                        key={aIdx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:underline px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" /> {att.name}
                      </a>
                    ))}
                  </div>
                )}

                {/* Reply Toggle */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                    className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition"
                  >
                    <Reply className="w-3.5 h-3.5" /> Reply {replies.length > 0 && `(${replies.length})`}
                  </button>
                </div>

                {/* Threaded Replies */}
                {replies.length > 0 && (
                  <div className="pl-6 space-y-3 pt-2 border-l-2 border-slate-100 dark:border-slate-800">
                    {replies.map((reply) => (
                      <div key={reply.id} className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                          <span>{reply.authorName}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{reply.createdAt}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 pl-5">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyingToId === comment.id && (
                  <div className="pt-3 pl-6 border-l-2 border-indigo-500 space-y-2 text-xs">
                    <textarea
                      rows={2}
                      placeholder="Write your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handlePostReply(comment.id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded font-medium"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
