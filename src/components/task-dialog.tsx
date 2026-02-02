"use client";

import React, { useState } from "react";
import type {
  Task,
  TaskStatus,
  Comment,
  RalphPlan,
  Priority,
} from "@/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskStatuses, priorities } from "@/lib/constants";
import { Loader2, Sparkles, Play, CheckCircle, Bot, User } from "lucide-react";

interface TaskDialogProps {
  task:
    | (Task & {
        comments: (Comment & {
          author: { name: string | null; image: string | null };
        })[];
        ralphPlan: RalphPlan | null;
      })
    | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAddComment: (taskId: string, content: string) => Promise<void>;
  onApproveBuild: (taskId: string) => Promise<void>;
  currentUser: { id: string; name: string | null; image: string | null } | null;
}

export function TaskDialog({
  task,
  isOpen,
  onClose,
  onStatusChange,
  onAddComment,
  onApproveBuild,
  currentUser,
}: TaskDialogProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  if (!task) return null;

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    await onAddComment(task.id, comment);
    setComment("");
    setIsSubmitting(false);
  };

  const handleApproveBuild = async () => {
    setIsApproving(true);
    await onApproveBuild(task.id);
    setIsApproving(false);
  };

  const getStatusBadge = (status: TaskStatus) => {
    const statusConfig = taskStatuses.find((s) => s.id === status);
    return statusConfig ? (
      <Badge variant="outline" className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    ) : null;
  };

  const getPriorityBadge = (priority: Priority) => {
    const priorityConfig = priorities.find((p) => p.id === priority);
    return priorityConfig ? (
      <Badge variant="outline" className={priorityConfig.color}>
        {priorityConfig.label}
      </Badge>
    ) : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select
                value={task.status}
                onValueChange={(value) =>
                  onStatusChange(task.id, value as TaskStatus)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${status.color}`}
                        />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Priority:</span>
              {getPriorityBadge(task.priority)}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Ralph Plan */}
          {task.ralphPlan && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium text-blue-900">Ralph&apos;s Plan</h4>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">Overview</h5>
                  <p className="text-blue-700">{task.ralphPlan.overview}</p>
                </div>
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">
                    Files to Modify
                  </h5>
                  <ul className="list-disc list-inside text-blue-700">
                    {(task.ralphPlan.filesToModify as string[]).map(
                      (file: string, i: number) => (
                        <li key={i}>{file}</li>
                      ),
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">
                    Implementation Plan
                  </h5>
                  <ol className="list-decimal list-inside text-blue-700 space-y-1">
                    {(
                      task.ralphPlan.implementationPlan as Array<{
                        step: number;
                        title: string;
                        description: string;
                        files: string[];
                      }>
                    ).map((step, i: number) => (
                      <li key={i}>
                        <span className="font-medium">{step.title}</span>:{" "}
                        {step.description}
                      </li>
                    ))}
                  </ol>
                </div>
                {task.ralphPlan.testingStrategy && (
                  <div>
                    <h5 className="font-medium text-blue-800 mb-1">
                      Testing Strategy
                    </h5>
                    <p className="text-blue-700">
                      {task.ralphPlan.testingStrategy}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Build Approval */}
          {task.status === "READY_TO_BUILD" &&
            task.buildStatus === "PENDING_APPROVAL" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-orange-900">
                      Ready to Build
                    </h4>
                    <p className="text-sm text-orange-700">
                      Ralph has prepared the implementation plan. Click approve
                      to start the build.
                    </p>
                  </div>
                  <Button
                    onClick={handleApproveBuild}
                    disabled={isApproving}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isApproving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Approve & Build
                  </Button>
                </div>
              </div>
            )}

          {task.buildStatus === "IN_PROGRESS" && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                <span className="font-medium text-purple-900">
                  Build in Progress
                </span>
              </div>
            </div>
          )}

          {task.buildStatus === "COMPLETED" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">
                  Build Completed
                </span>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h4 className="font-medium mb-3">Comments</h4>
            <div className="space-y-3 mb-4">
              {task.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                    {comment.isAIGenerated ? (
                      <Bot className="w-4 h-4 text-blue-500" />
                    ) : comment.author.image ? (
                      <img
                        src={comment.author.image}
                        alt={comment.author.name || ""}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.isAIGenerated
                          ? "Ralph"
                          : comment.author.name || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comment?.createdAt.toString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <div className="flex gap-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
                rows={2}
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmitting || !comment.trim()}
                className="self-end"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
