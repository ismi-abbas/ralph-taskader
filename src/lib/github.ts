import { Octokit } from "@octokit/rest";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";
import { generateTextFromPrompt } from "./openrouter-sdk";
import { RalphPlan } from "./ralph";

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getUserRepos() {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });
    return data;
  }

  async getRepo(owner: string, repo: string) {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    return data;
  }

  async getRepoContents(
    owner: string,
    repo: string,
    path: string = "",
    ref?: string
  ) {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    return data;
  }

  async createIssue(owner: string, repo: string, title: string, body?: string) {
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
    });
    return data;
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ) {
    const { data } = await this.octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    });
    return data;
  }

  async createBranch(
    owner: string,
    repo: string,
    branch: string,
    fromBranch: string = "main"
  ) {
    // Get the SHA of the latest commit on the base branch
    const { data: refData } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    // Create a new branch from that SHA
    const { data } = await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: refData.object.sha,
    });
    return data;
  }
}

export class RepoCloner {
  private reposDir: string;

  constructor() {
    this.reposDir = path.join(process.cwd(), "repos");
  }

  async cloneRepo(repoUrl: string, projectId: string, branch: string = "main") {
    const targetDir = path.join(this.reposDir, projectId);

    // Ensure repos directory exists
    await fs.mkdir(this.reposDir, { recursive: true });

    // Remove existing directory if it exists
    try {
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch {}

    // Clone the repository
    const git = simpleGit();
    await git.clone(repoUrl, targetDir, ["--branch", branch, "--single-branch"]);

    return targetDir;
  }

  async pullLatest(projectId: string) {
    const targetDir = path.join(this.reposDir, projectId);
    const git = simpleGit(targetDir);
    await git.pull();
  }

  async getRepoPath(projectId: string) {
    return path.join(this.reposDir, projectId);
  }
}

export interface BuildExecutorOptions {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  projectId: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  githubToken: string;
  ralphPlan: RalphPlan;
}

export interface BuildResult {
  success: boolean;
  message: string;
  prUrl?: string;
  branchName?: string;
  filesChanged?: string[];
}

export class BuildExecutor {
  private cloner: RepoCloner;
  private githubService: GitHubService;

  constructor(githubToken: string) {
    this.cloner = new RepoCloner();
    this.githubService = new GitHubService(githubToken);
  }

  async executeBuild(options: BuildExecutorOptions): Promise<BuildResult> {
    const {
      taskId,
      taskTitle,
      taskDescription,
      projectId,
      repoUrl,
      repoOwner,
      repoName,
      branch,
      ralphPlan,
    } = options;

    const branchName = `ralph-task-${taskId}`;
    const repoPath = await this.cloner.getRepoPath(projectId);

    try {
      // Step 1: Clone or pull the repository
      console.log(`Cloning repository ${repoUrl}...`);
      await this.cloner.cloneRepo(repoUrl, projectId, branch);

      // Step 2: Create a new branch via GitHub API
      console.log(`Creating branch ${branchName}...`);
      try {
        await this.githubService.createBranch(
          repoOwner,
          repoName,
          branchName,
          branch
        );
      } catch (error: any) {
        // Branch might already exist, that's okay
        if (error.status !== 422) {
          throw error;
        }
        console.log(`Branch ${branchName} already exists, continuing...`);
      }

      // Step 3: Checkout the new branch locally
      const git = simpleGit(repoPath);
      await git.checkoutBranch(branchName, `origin/${branch}`);

      // Step 4: Generate code changes using AI
      console.log("Generating code changes...");
      const filesChanged = await this.generateCodeChanges(
        repoPath,
        taskTitle,
        taskDescription,
        ralphPlan
      );

      if (filesChanged.length === 0) {
        return {
          success: false,
          message: "No files were changed. The AI could not generate appropriate changes.",
        };
      }

      // Step 5: Commit the changes
      console.log("Committing changes...");
      await git.add(".");
      await git.commit(
        `feat: ${taskTitle}\n\n${ralphPlan.overview}\n\nChanges:\n${filesChanged
          .map((f) => `- ${f}`)
          .join("\n")}`
      );

      // Step 6: Push the branch
      console.log("Pushing branch...");
      await git.push("origin", branchName);

      // Step 7: Create a pull request
      console.log("Creating pull request...");
      const prBody = this.generatePRBody(taskTitle, taskDescription, ralphPlan);
      const pr = await this.githubService.createPullRequest(
        repoOwner,
        repoName,
        `feat: ${taskTitle}`,
        branchName,
        branch,
        prBody
      );

      return {
        success: true,
        message: `Successfully created PR #${pr.number}: ${pr.title}`,
        prUrl: pr.html_url,
        branchName,
        filesChanged,
      };
    } catch (error) {
      console.error("Build execution error:", error);
      return {
        success: false,
        message: `Build failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async generateCodeChanges(
    repoPath: string,
    taskTitle: string,
    taskDescription: string,
    ralphPlan: RalphPlan
  ): Promise<string[]> {
    const filesChanged: string[] = [];

    // Process each file that needs to be modified
    for (const filePath of ralphPlan.filesToModify) {
      const fullPath = path.join(repoPath, filePath);

      try {
        // Read the current file content
        let currentContent = "";
        try {
          currentContent = await fs.readFile(fullPath, "utf-8");
        } catch {
          // File doesn't exist, will create new
          console.log(`File ${filePath} doesn't exist, will create new file`);
        }

        // Find the relevant implementation step for this file
        const relevantSteps = ralphPlan.implementationPlan.filter((step) =>
          step.files.some((f) => filePath.includes(f) || f.includes(filePath))
        );

        // Generate the new content using AI
        const prompt = `You are an expert software developer. Modify the following file to implement the requested feature.

Task: ${taskTitle}
Description: ${taskDescription || "No description provided"}

File to modify: ${filePath}

Current file content:
\`\`\`
${currentContent || "(New file)"}
\`\`\`

Implementation plan:
${ralphPlan.overview}

Relevant implementation steps:
${relevantSteps
  .map(
    (step) =>
      `Step ${step.step}: ${step.title}\n${step.description}\nFiles: ${step.files.join(", ")}`
  )
  .join("\n\n")}

Dependencies to install: ${ralphPlan.dependencies.join(", ") || "None"}

Testing strategy: ${ralphPlan.testingStrategy}

Please provide the complete new content for this file. If this is a new file, provide the full file content. If modifying an existing file, provide the complete modified content.

Respond with ONLY the file content, no markdown code blocks, no explanations.`;

        const newContent = await generateTextFromPrompt(prompt, {
          system:
            "You are an expert software developer. Write clean, well-documented code. Provide only the file content, no explanations.",
          temperature: 0.3,
          maxTokens: 4000,
        });

        // Ensure the directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Write the new content
        await fs.writeFile(fullPath, newContent, "utf-8");
        filesChanged.push(filePath);

        console.log(`Modified file: ${filePath}`);
      } catch (error) {
        console.error(`Failed to modify file ${filePath}:`, error);
        // Continue with other files
      }
    }

    return filesChanged;
  }

  private generatePRBody(
    taskTitle: string,
    taskDescription: string,
    ralphPlan: RalphPlan
  ): string {
    const implementationSteps = ralphPlan.implementationPlan
      .map(
        (step) =>
          `### Step ${step.step}: ${step.title}\n${step.description}\n\n**Files:** ${step.files.join(", ")}`
      )
      .join("\n\n");

    return `## ${taskTitle}

${taskDescription || "No description provided"}

## Overview

${ralphPlan.overview}

## Implementation Plan

${implementationSteps}

## Dependencies

${ralphPlan.dependencies.length > 0 ? ralphPlan.dependencies.map((d) => `- ${d}`).join("\n") : "None"}

## Testing Strategy

${ralphPlan.testingStrategy}

---

*This PR was automatically generated by Ralph AI.*`;
  }
}
