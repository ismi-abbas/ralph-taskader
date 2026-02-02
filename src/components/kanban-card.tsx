"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { priorities } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  task: Task & { comments: { id: string }[] };
  onClick: () => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorities.find((p) => p.id === task.priority);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
        isDragging && "opacity-50 rotate-2",
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {priority && <div className={cn("w-2 h-2 rounded-full", priority.color)} />}
            <span className="text-xs text-muted-foreground">{task.priority.toLowerCase()}</span>
          </div>
          {task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span className="text-xs">{task.comments.length}</span>
            </div>
          )}
        </div>
        {task.buildStatus !== "NOT_STARTED" && (
          <Badge variant="outline" className="mt-2 text-xs">
            {task.buildStatus.replace(/_/g, " ")}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
