"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { User } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
}

export function CommentList({ taskId, comments }: { taskId: string; comments: Comment[] }) {
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();

  const addComment = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setDraft("");
    },
  });

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-3">
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      <div className="space-y-3 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
              {c.author.image ? (
                <Image src={c.author.image} alt={c.author.name ?? ""} width={28} height={28} />
              ) : (
                <User className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-gray-700">{c.author.name ?? "Unknown"}</span>
                <span className="text-xs text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <textarea
          rows={2}
          placeholder="Add a comment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        <button
          disabled={!draft.trim() || addComment.isPending}
          onClick={() => addComment.mutate(draft.trim())}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {addComment.isPending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </div>
  );
}
