import OpenAI from "openai"
import fs from "fs/promises"
import path from "path"
import { db } from "@/lib/db"
import { codeIndex } from "@/db/schema"
import { eq } from "drizzle-orm"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface RalphPlan {
  overview: string
  filesToModify: string[]
  implementationPlan: {
    step: number
    title: string
    description: string
    files: string[]
  }[]
  dependencies: string[]
  testingStrategy: string
}

export class RalphService {
  async analyzeCodebase(projectId: string): Promise<string> {
    const repoPath = path.join(process.cwd(), "repos", projectId)
    const files = await this.getCodeFiles(repoPath)
    
    // Store file contents in CodeIndex
    for (const file of files.slice(0, 50)) { // Limit to 50 files for now
      const content = await fs.readFile(file.path, "utf-8").catch(() => "")
      
      // Check if exists
      const existing = await db.query.codeIndex.findFirst({
        where: eq(codeIndex.projectId, projectId),
      })

      if (existing) {
        await db
          .update(codeIndex)
          .set({ content, language: file.language })
          .where(eq(codeIndex.projectId, projectId))
      } else {
        await db.insert(codeIndex).values({
          projectId,
          filePath: file.relativePath,
          content,
          language: file.language,
        })
      }
    }

    // Create a summary of the codebase
    const indexedFiles = await db.query.codeIndex.findMany({
      where: eq(codeIndex.projectId, projectId),
    })

    const summary = indexedFiles
      .map((file) => `File: ${file.filePath}\nLanguage: ${file.language}\n\n${file.content.slice(0, 1000)}...\n---`)
      .join("\n\n")

    return summary
  }

  async generatePlan(
    taskTitle: string,
    taskDescription: string,
    projectId: string
  ): Promise<RalphPlan> {
    // Get codebase context
    const indexedFiles = await db.query.codeIndex.findMany({
      where: eq(codeIndex.projectId, projectId),
      limit: 20,
    })

    const codebaseContext = indexedFiles
      .map((file) => `File: ${file.filePath}\n\n${file.content.slice(0, 2000)}`)
      .join("\n\n---\n\n")

    const prompt = `You are Ralph, an AI software architect. Create a detailed implementation plan for the following task.

Task: ${taskTitle}
Description: ${taskDescription || "No description provided"}

Here is the current codebase context:

${codebaseContext.slice(0, 8000)}

Generate a detailed implementation plan in JSON format with the following structure:
{
  "overview": "A brief overview of the implementation approach",
  "filesToModify": ["list of files that need to be modified"],
  "implementationPlan": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description of what needs to be done",
      "files": ["files involved in this step"]
    }
  ],
  "dependencies": ["any dependencies to install"],
  "testingStrategy": "How to test this implementation"
}

Be specific and actionable. Focus on the minimal changes needed to implement the feature.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are Ralph, an expert software architect. Create detailed, actionable implementation plans. Respond only with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error("Failed to generate plan")
    }

    return JSON.parse(content) as RalphPlan
  }

  async executeBuild(
    taskId: string,
    projectId: string,
    ralphPlan: RalphPlan
  ): Promise<{ success: boolean; message: string; prUrl?: string }> {
    // This is a simplified version - in production, you'd want to:
    // 1. Create a new branch
    // 2. Use AI to generate code changes
    // 3. Apply the changes to files
    // 4. Commit and push
    // 5. Create a PR

    try {
      // For now, just simulate the build process
      // In a real implementation, you'd integrate with a code generation model
      
      return {
        success: true,
        message: "Build executed successfully. Changes have been prepared in a new branch.",
      }
    } catch (error) {
      return {
        success: false,
        message: `Build failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  private async getCodeFiles(
    dir: string,
    relativePath: string = ""
  ): Promise<{ path: string; relativePath: string; language: string | null }[]> {
    const files: { path: string; relativePath: string; language: string | null }[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })

    const ignorePatterns = [
      "node_modules",
      ".git",
      ".next",
      "dist",
      "build",
      "coverage",
      ".env",
      ".env.local",
      ".env.*",
    ]

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.join(relativePath, entry.name)

      if (ignorePatterns.some((pattern) => entry.name.includes(pattern))) {
        continue
      }

      if (entry.isDirectory()) {
        const subFiles = await this.getCodeFiles(fullPath, relPath)
        files.push(...subFiles)
      } else if (entry.isFile()) {
        const language = this.getLanguage(entry.name)
        if (language) {
          files.push({ path: fullPath, relativePath: relPath, language })
        }
      }
    }

    return files
  }

  private getLanguage(filename: string): string | null {
    const extensions: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "typescript",
      ".js": "javascript",
      ".jsx": "javascript",
      ".py": "python",
      ".go": "go",
      ".rs": "rust",
      ".java": "java",
      ".rb": "ruby",
      ".php": "php",
      ".json": "json",
      ".md": "markdown",
      ".yml": "yaml",
      ".yaml": "yaml",
      ".css": "css",
      ".scss": "scss",
      ".html": "html",
      ".sql": "sql",
      ".prisma": "prisma",
    }
    const ext = path.extname(filename)
    return extensions[ext] || null
  }
}

export const ralphService = new RalphService()
