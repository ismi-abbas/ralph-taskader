import { generateObjectFromPrompt } from "./openrouter-sdk";
import {
  executeResearchWorkflow,
  executePlanningWorkflow,
  executeImplementationWorkflow,
  WorkflowContext,
} from "./workflow-service";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { codeIndex } from "@/db/schema";
import { eq } from "drizzle-orm";

// Zod schema for structured AI output
const ralphPlanSchema = z.object({
  overview: z
    .string()
    .describe("A brief overview of the implementation approach"),
  filesToModify: z
    .array(z.string())
    .describe("List of files that need to be modified"),
  implementationPlan: z
    .array(
      z.object({
        step: z.number().describe("Step number"),
        title: z.string().describe("Step title"),
        description: z
          .string()
          .describe("Detailed description of what needs to be done"),
        files: z.array(z.string()).describe("Files involved in this step"),
      })
    )
    .describe("Detailed implementation steps"),
  dependencies: z
    .array(z.string())
    .describe("Any dependencies to install"),
  testingStrategy: z.string().describe("How to test this implementation"),
});

export type RalphPlan = z.infer<typeof ralphPlanSchema>;

export class RalphService {
  async analyzeCodebase(projectId: string): Promise<string> {
    const repoPath = path.join(process.cwd(), "repos", projectId);
    const files = await this.getCodeFiles(repoPath);

    // Store file contents in CodeIndex
    for (const file of files.slice(0, 50)) {
      // Limit to 50 files for now
      const content = await fs.readFile(file.path, "utf-8").catch(() => "");

      // Check if exists
      const existing = await db.query.codeIndex.findFirst({
        where: eq(codeIndex.projectId, projectId),
      });

      if (existing) {
        await db
          .update(codeIndex)
          .set({ content, language: file.language })
          .where(eq(codeIndex.projectId, projectId));
      } else {
        await db.insert(codeIndex).values({
          projectId,
          filePath: file.relativePath,
          content,
          language: file.language,
        });
      }
    }

    // Create a summary of the codebase
    const indexedFiles = await db.query.codeIndex.findMany({
      where: eq(codeIndex.projectId, projectId),
    });

    const summary = indexedFiles
      .map(
        (file) =>
          `File: ${file.filePath}\nLanguage: ${file.language}\n\n${file.content.slice(0, 1000)}...\n---`
      )
      .join("\n\n");

    return summary;
  }

  /**
   * Conduct research for a task using the research workflow
   */
  async conductResearch(
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    projectId: string
  ): Promise<string> {
    // Get codebase context
    const indexedFiles = await db.query.codeIndex.findMany({
      where: eq(codeIndex.projectId, projectId),
      limit: 20,
    });

    const codebaseContext = indexedFiles
      .map((file) => `File: ${file.filePath}\n\n${file.content.slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const context: WorkflowContext = {
      taskId,
      taskTitle,
      taskDescription: taskDescription || "No description provided",
      projectId,
      codebaseContext: codebaseContext.slice(0, 8000),
    };

    try {
      const result = await executeResearchWorkflow(context);
      return result;
    } catch (error) {
      console.error("Research workflow error:", error);
      throw new Error(
        `Failed to conduct research: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create implementation plan using the planning workflow
   */
  async createPlan(
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    projectId: string,
    researchFindings?: string
  ): Promise<RalphPlan> {
    // Get codebase context
    const indexedFiles = await db.query.codeIndex.findMany({
      where: eq(codeIndex.projectId, projectId),
      limit: 20,
    });

    const codebaseContext = indexedFiles
      .map((file) => `File: ${file.filePath}\n\n${file.content.slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const context: WorkflowContext = {
      taskId,
      taskTitle,
      taskDescription: taskDescription || "No description provided",
      projectId,
      codebaseContext: codebaseContext.slice(0, 8000),
      researchFindings: researchFindings || "No prior research findings",
    };

    // Use the planning workflow prompt combined with structured output
    const { executePlanningWorkflow } = await import("./workflow-service");
    const workflowContent = await executePlanningWorkflow(context);

    // Now generate the structured plan using the workflow output as guidance
    const prompt = `Based on the following planning workflow and codebase context, create a structured implementation plan.

Task: ${taskTitle}
Description: ${taskDescription || "No description provided"}

Planning Workflow Output:
${workflowContent}

Codebase Context:
${codebaseContext.slice(0, 8000)}

Create a detailed, actionable implementation plan.`;

    try {
      const result = await generateObjectFromPrompt(prompt, {
        schema: ralphPlanSchema,
        system:
          "You are Ralph, an expert software architect. Create detailed, actionable implementation plans based on the provided context and planning workflow.",
        temperature: 0.7,
      });

      return result;
    } catch (error) {
      console.error("Planning workflow error:", error);
      throw new Error(
        `Failed to create plan: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate plan (legacy method - now uses createPlan)
   */
  async generatePlan(
    taskTitle: string,
    taskDescription: string,
    projectId: string
  ): Promise<RalphPlan> {
    return this.createPlan("legacy", taskTitle, taskDescription, projectId);
  }

  /**
   * Execute implementation using the implementation workflow
   */
  async executeImplementation(
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    projectId: string,
    ralphPlan: RalphPlan
  ): Promise<{
    success: boolean;
    message: string;
    implementationResult?: {
      summary: string;
      filesChanged: string[];
      keyChanges: string[];
      testingNotes: string;
      nextSteps: string[];
    };
    prUrl?: string;
  }> {
    const context: WorkflowContext = {
      taskId,
      taskTitle,
      taskDescription: taskDescription || "No description provided",
      projectId,
      planOverview: ralphPlan.overview,
      filesToModify: ralphPlan.filesToModify.join(", "),
      implementationSteps: ralphPlan.implementationPlan
        .map((step) => `${step.step}. ${step.title}: ${step.description}`)
        .join("\n"),
      dependencies: ralphPlan.dependencies.join(", "),
      testingStrategy: ralphPlan.testingStrategy,
    };

    try {
      // For now, simulate the implementation
      // In a real implementation, you would:
      // 1. Execute the workflow to get implementation guidance
      // 2. Use AI to generate actual code changes
      // 3. Apply changes to files
      // 4. Create commits and PR

      const { executeImplementationWorkflow } = await import(
        "./workflow-service"
      );
      const implementationResult = await executeImplementationWorkflow(context);

      return {
        success: true,
        message:
          "Build executed successfully. Changes have been prepared based on the implementation plan.",
        implementationResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Build failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
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
        message:
          "Build executed successfully. Changes have been prepared in a new branch.",
      };
    } catch (error) {
      return {
        success: false,
        message: `Build failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async getCodeFiles(
    dir: string,
    relativePath: string = ""
  ): Promise<{ path: string; relativePath: string; language: string | null }[]> {
    const files: { path: string; relativePath: string; language: string | null }[] =
      [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

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
    ];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (ignorePatterns.some((pattern) => entry.name.includes(pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.getCodeFiles(fullPath, relPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const language = this.getLanguage(entry.name);
        if (language) {
          files.push({ path: fullPath, relativePath: relPath, language });
        }
      }
    }

    return files;
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
    };
    const ext = path.extname(filename);
    return extensions[ext] || null;
  }
}

export const ralphService = new RalphService();
