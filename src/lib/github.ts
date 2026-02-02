import { Octokit } from "@octokit/rest"
import simpleGit from "simple-git"
import path from "path"
import fs from "fs/promises"

export class GitHubService {
  private octokit: Octokit

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token })
  }

  async getUserRepos() {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    })
    return data
  }

  async getRepo(owner: string, repo: string) {
    const { data } = await this.octokit.rest.repos.get({ owner, repo })
    return data
  }

  async getRepoContents(owner: string, repo: string, path: string = "", ref?: string) {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    })
    return data
  }

  async createIssue(owner: string, repo: string, title: string, body?: string) {
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
    })
    return data
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
    })
    return data
  }

  async createBranch(owner: string, repo: string, branch: string, fromBranch: string = "main") {
    // Get the SHA of the latest commit on the base branch
    const { data: refData } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    })
    
    // Create a new branch from that SHA
    const { data } = await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: refData.object.sha,
    })
    return data
  }
}

export class RepoCloner {
  private reposDir: string

  constructor() {
    this.reposDir = path.join(process.cwd(), "repos")
  }

  async cloneRepo(repoUrl: string, projectId: string, branch: string = "main") {
    const targetDir = path.join(this.reposDir, projectId)
    
    // Ensure repos directory exists
    await fs.mkdir(this.reposDir, { recursive: true })
    
    // Remove existing directory if it exists
    try {
      await fs.rm(targetDir, { recursive: true, force: true })
    } catch {}

    // Clone the repository
    const git = simpleGit()
    await git.clone(repoUrl, targetDir, ["--branch", branch, "--single-branch"])
    
    return targetDir
  }

  async pullLatest(projectId: string) {
    const targetDir = path.join(this.reposDir, projectId)
    const git = simpleGit(targetDir)
    await git.pull()
  }

  async getRepoPath(projectId: string) {
    return path.join(this.reposDir, projectId)
  }
}