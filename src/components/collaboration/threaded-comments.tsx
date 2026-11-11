"use client";

import React, { useState } from "react";

export interface CommentAttachmentItem {
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface ThreadedCommentItem {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  entityType: "SCOPE_ITEM" | "ESTIMATE" | "PROPOSAL" | "TASK" | "GENERAL";
  entityId?: string;
  entityLabel?: string;
  mentions: string[];
  isResolved: boolean;
  createdAtTimeAgo: string;
  attachments?: CommentAttachmentItem[];
  replies?: ThreadedCommentItem[];
}

interface ThreadedCommentsProps {
  projectId: string;
  entityType: "SCOPE_ITEM" | "ESTIMATE" | "PROPOSAL" | "TASK" | "GENERAL";
  entityId?: string;
  entityLabel?: string;
  comments: ThreadedCommentItem[];
  onAddComment: (content: string, parentId?: string, mentions?: string[]) => void;
  onToggleResolve: (commentId: string, isResolved: boolean) => void;
}

export function ThreadedComments({
  projectId,
  entityType,
  entityId,
  entityLabel,
  comments,
  onAddComment,
  onToggleResolve
}: ThreadedCommentsProps) {
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    // Detect @mentions (e.g. @Farhan, @Sarah)
    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(newCommentText.matchAll(mentionRegex)).map((m) => m[1]);

    onAddComment(newCommentText, undefined, mentions);
    setNewCommentText("");
  };

  const handlePostReply = (parentId: string) => {
    if (!replyText.trim()) return;

    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(replyText.matchAll(mentionRegex)).map((m) => m[1]);

    onAddComment(replyText, parentId, mentions);
    setReplyText("");
    setReplyingToId(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Discussion & Mentions {entityLabel ? `• ${entityLabel}` : ""}
          </h3>
          <p className="text-xs text-slate-500">
            Threaded feedback linked to {entityType.toLowerCase().replace("_", " ")}
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {comments.length} comments
        </span>
      </div>

      {/* Comments List */}
      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No comments yet on this {entityType.toLowerCase().replace("_", " ")}. Type below or use @mention to start the discussion.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3.5 rounded-xl border transition space-y-2 ${
                comment.isResolved
                  ? "bg-slate-50/50 border-slate-200 text-slate-500"
                  : "bg-white border-slate-200 shadow-2xs"
              }`}
            >
              {/* Author Info & Status Resolution Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                    {comment.authorName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">{comment.authorName}</span>
                    <span className="text-[10px] font-mono text-slate-400 ml-1.5 uppercase">
                      {comment.authorRole}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5">• {comment.createdAtTimeAgo}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {comment.isResolved && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Resolved ✓
                    </span>
                  )}
                  <button
                    onClick={() => onToggleResolve(comment.id, !comment.isResolved)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
                  >
                    {comment.isResolved ? "Reopen" : "Resolve"}
                  </button>
                </div>
              </div>

              {/* Comment Content */}
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>

              {/* Attachments if any */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {comment.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 transition"
                    >
                      <span>📎</span>
                      <span>{att.fileName}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Threaded Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-4 ml-2 border-l-2 border-slate-200 space-y-2 pt-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-slate-800">{reply.authorName}</span>
                        <span className="text-slate-400">• {reply.createdAtTimeAgo}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Button / Box */}
              {!comment.isResolved && (
                <div className="pt-1">
                  {replyingToId === comment.id ? (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        placeholder="Write a reply... Use @ to mention teammates"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-blue-600"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setReplyingToId(null)}
                          className="text-xs text-slate-400 px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handlePostReply(comment.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingToId(comment.id)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                    >
                      ↳ Reply to thread
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Comment Input Box */}
      <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-100 space-y-2">
        <textarea
          rows={2}
          placeholder="Add a comment... (Type @ to mention teammates or clients)"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600 bg-slate-50/50 focus:bg-white transition"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Tip: Mentions like @Sarah trigger instant notifications.
          </span>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs transition"
          >
            Post Comment
          </button>
        </div>
      </form>
    </div>
  );
}

