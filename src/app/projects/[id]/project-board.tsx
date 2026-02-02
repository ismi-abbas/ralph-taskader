"use client"

import React, { useState } from "react"
import type { TaskStatus, Priority, BuildStatus, Task as TaskType, Comment as CommentType, RalphPlan as RalphPlanType } from "@/db/schema"
import { KanbanBoard } from "@/components/kanban-board"
import { TaskDialog } from "@/components/task-dialog"
import { CreateTaskDialog } from "@/components/create-task-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  createTask,
  updateTaskStatus,
  addComment,
  approveBuild,
} from "@/app/actions"

type Task = TaskType & {
  comments: { id: string }[]
}

type Comment = CommentType & { 
  author: { name: string | null; image: string | null } 
}

type RalphPlan = RalphPlanType

interface ProjectBoardProps {
  project: {
    id: string
    name: string
    description: string | null
    repoConnection: {
      repoUrl: string
      repoOwner: string
      repoName: string
      branch: string
    } | null
    tasks: Task[]
  }
  currentUser: {
    id: string
    name: string
    image: string | null
  }
}

export function ProjectBoard({ project, currentUser }: ProjectBoardProps) {
  const [selectedTask, setSelectedTask] = useState<(TaskType & {
    comments: Comment[]
    ralphPlan: RalphPlan | null
  }) | null>(null)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [tasks, setTasks] = useState(project.tasks)

  const handleTaskClick = async (task: Task) => {
    // Fetch full task details including comments and Ralph plan
    const response = await fetch(`/api/tasks/${task.id}`)
    const fullTask = await response.json()
    setSelectedTask(fullTask)
    setIsTaskDialogOpen(true)
  }

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatus(taskId, project.id, newStatus)
    // Refresh tasks
    const response = await fetch(`/api/projects/${project.id}/tasks`)
    const updatedTasks = await response.json()
    setTasks(updatedTasks)
  }

  const handleCreateTask = async (data: {
    title: string
    description: string
    priority: string
  }) => {
    await createTask(project.id, {
      ...data,
      priority: data.priority as Priority,
    })
    // Refresh tasks
    const response = await fetch(`/api/projects/${project.id}/tasks`)
    const updatedTasks = await response.json()
    setTasks(updatedTasks)
  }

  const handleAddComment = async (taskId: string, content: string) => {
    await addComment(taskId, project.id, currentUser.id, content)
    // Refresh selected task
    const response = await fetch(`/api/tasks/${taskId}`)
    const fullTask = await response.json()
    setSelectedTask(fullTask)
  }

  const handleApproveBuild = async (taskId: string) => {
    await approveBuild(taskId, project.id)
    // Refresh selected task
    const response = await fetch(`/api/tasks/${taskId}`)
    const fullTask = await response.json()
    setSelectedTask(fullTask)
    // Refresh tasks
    const tasksResponse = await fetch(`/api/projects/${project.id}/tasks`)
    const updatedTasks = await tasksResponse.json()
    setTasks(updatedTasks)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <KanbanBoard
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskClick={handleTaskClick}
      />

      <TaskDialog
        task={selectedTask}
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false)
          setSelectedTask(null)
        }}
        onStatusChange={handleTaskMove}
        onAddComment={handleAddComment}
        onApproveBuild={handleApproveBuild}
        currentUser={currentUser}
      />

      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTask}
        projectId={project.id}
      />
    </div>
  )
}
