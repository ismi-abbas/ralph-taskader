"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { project, task, comment, ralphPlan, repoConnection } from "@/db/schema"
import type { TaskStatus, Priority } from "@/db/schema"
import { ralphService } from "@/lib/ralph"
import { RepoCloner } from "@/lib/github"
import { eq, desc } from "drizzle-orm"

export async function getProject(projectId: string) {
  const projectData = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    with: {
      repoConnection: true,
      tasks: {
        with: {
          comments: true,
          ralphPlan: true,
        },
        orderBy: [desc(task.createdAt)],
      },
    },
  })
  return projectData
}

export async function createTask(
  projectId: string,
  data: {
    title: string
    description?: string
    priority?: Priority
  }
) {
  const [newTask] = await db
    .insert(task)
    .values({
      ...data,
      projectId,
      status: "BACKLOG" as TaskStatus,
    })
    .returning()

  revalidatePath(`/projects/${projectId}`)
  return newTask
}

export async function updateTaskStatus(
  taskId: string,
  projectId: string,
  status: TaskStatus
) {
  const [updatedTask] = await db
    .update(task)
    .set({ status })
    .where(eq(task.id, taskId))
    .returning()

  // Get full task with relations
  const fullTask = await db.query.task.findFirst({
    where: eq(task.id, taskId),
    with: {
      project: {
        with: {
          repoConnection: true,
        },
      },
      comments: true,
      ralphPlan: true,
    },
  })

  if (!fullTask) throw new Error("Task not found")

  // Trigger Ralph analysis when task moves to "READY"
  if (status === "READY" && !fullTask.ralphPlan && fullTask.project.repoConnection) {
    try {
      // Ensure repo is cloned
      const repoCloner = new RepoCloner()
      const repoPath = await repoCloner.getRepoPath(fullTask.projectId)
      
      // Analyze codebase
      await ralphService.analyzeCodebase(fullTask.projectId)

      // Generate plan
      const plan = await ralphService.generatePlan(
        fullTask.title,
        fullTask.description || "",
        fullTask.projectId
      )

      // Save Ralph plan
      await db.insert(ralphPlan).values({
        taskId: fullTask.id,
        overview: plan.overview,
        filesToModify: plan.filesToModify,
        implementationPlan: plan.implementationPlan,
        dependencies: plan.dependencies || [],
        testingStrategy: plan.testingStrategy,
      })

      // Add AI comment
      await db.insert(comment).values({
        taskId: fullTask.id,
        content: `I've analyzed the codebase and created an implementation plan for this task. Check the "Ralph's Plan" section for details.`,
        authorId: fullTask.project.ownerId,
        isAIGenerated: true,
      })
    } catch (error) {
      console.error("Ralph analysis failed:", error)
      // Add error comment
      await db.insert(comment).values({
        taskId: fullTask.id,
        content: `I encountered an error while analyzing the codebase: ${error instanceof Error ? error.message : "Unknown error"}. Please ensure the repository is properly connected.`,
        authorId: fullTask.project.ownerId,
        isAIGenerated: true,
      })
    }
  }

  // Update build status when task moves to "READY_TO_BUILD"
  if (status === "READY_TO_BUILD" && fullTask.ralphPlan) {
    await db
      .update(task)
      .set({ buildStatus: "PENDING_APPROVAL" })
      .where(eq(task.id, taskId))
  }

  revalidatePath(`/projects/${projectId}`)
  return fullTask
}

export async function addComment(
  taskId: string,
  projectId: string,
  userId: string,
  content: string
) {
  const [newComment] = await db
    .insert(comment)
    .values({
      taskId,
      authorId: userId,
      content,
      isAIGenerated: false,
    })
    .returning()

  // Get comment with author
  const fullComment = await db.query.comment.findFirst({
    where: eq(comment.id, newComment.id),
    with: {
      author: {
        columns: {
          name: true,
          image: true,
        },
      },
    },
  })

  revalidatePath(`/projects/${projectId}`)
  return fullComment
}

export async function connectRepo(
  projectId: string,
  data: {
    repoUrl: string
    branch: string
  },
  githubToken: string
) {
  // Parse repo URL
  const urlMatch = data.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/)
  if (!urlMatch) {
    throw new Error("Invalid GitHub repository URL")
  }

  const [, repoOwner, repoName] = urlMatch

  // Clone the repository
  const repoCloner = new RepoCloner()
  await repoCloner.cloneRepo(data.repoUrl, projectId, data.branch)

  // Check if repo connection exists
  const existing = await db.query.repoConnection.findFirst({
    where: eq(repoConnection.projectId, projectId),
  })

  if (existing) {
    // Update
    await db
      .update(repoConnection)
      .set({
        repoUrl: data.repoUrl,
        repoName,
        repoOwner,
        branch: data.branch,
        lastSyncedAt: new Date(),
      })
      .where(eq(repoConnection.projectId, projectId))
  } else {
    // Create
    await db.insert(repoConnection).values({
      projectId,
      repoUrl: data.repoUrl,
      repoName,
      repoOwner,
      branch: data.branch,
    })
  }

  // Analyze codebase
  await ralphService.analyzeCodebase(projectId)

  revalidatePath(`/projects/${projectId}`)
}

export async function approveBuild(taskId: string, projectId: string) {
  const [updatedTask] = await db
    .update(task)
    .set({ buildStatus: "IN_PROGRESS" })
    .where(eq(task.id, taskId))
    .returning()

  const fullTask = await db.query.task.findFirst({
    where: eq(task.id, taskId),
    with: {
      ralphPlan: true,
    },
  })

  if (!fullTask?.ralphPlan) {
    throw new Error("No Ralph plan found for this task")
  }

  try {
    // Execute build
    const result = await ralphService.executeBuild(
      taskId,
      projectId,
      {
        overview: fullTask.ralphPlan.overview,
        filesToModify: fullTask.ralphPlan.filesToModify as string[],
        implementationPlan: fullTask.ralphPlan.implementationPlan as Array<{
          step: number;
          title: string;
          description: string;
          files: string[];
        }>,
        dependencies: (fullTask.ralphPlan.dependencies as string[]) || [],
        testingStrategy: fullTask.ralphPlan.testingStrategy || "",
      }
    )

    // Update task status
    await db
      .update(task)
      .set({
        buildStatus: result.success ? "COMPLETED" : "FAILED",
      })
      .where(eq(task.id, taskId))

    // Add comment
    await db.insert(comment).values({
      taskId,
      authorId: fullTask.projectId,
      content: result.message,
      isAIGenerated: true,
    })

    revalidatePath(`/projects/${projectId}`)
    return result
  } catch (error) {
    await db
      .update(task)
      .set({ buildStatus: "FAILED" })
      .where(eq(task.id, taskId))

    await db.insert(comment).values({
      taskId,
      authorId: fullTask.projectId,
      content: `Build failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      isAIGenerated: true,
    })

    revalidatePath(`/projects/${projectId}`)
    throw error
  }
}
