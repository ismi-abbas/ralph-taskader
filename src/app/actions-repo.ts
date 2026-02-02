"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { repoConnection, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGitHubToken } from "@/lib/github-token";
import { GitHubService } from "@/lib/github";

/**
 * Relink a repository connection
 */
export async function relinkRepository(
  projectId: string,
  data: {
    repoUrl: string;
    branch?: string;
  },
) {
  // Parse repo URL to get owner and name
  const urlMatch = data.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!urlMatch) {
    throw new Error("Invalid GitHub repository URL");
  }

  const [, repoOwner, repoNameWithGit] = urlMatch;
  const repoName = repoNameWithGit.replace(/\.git$/, "");
  const branch = data.branch || "main";

  // Check if connection exists
  const existing = await db.query.repoConnection.findFirst({
    where: eq(repoConnection.projectId, projectId),
  });

  if (existing) {
    // Update existing connection
    await db
      .update(repoConnection)
      .set({
        repoUrl: data.repoUrl,
        repoName,
        repoOwner,
        branch,
        lastSyncedAt: new Date(),
      })
      .where(eq(repoConnection.projectId, projectId));
  } else {
    // Create new connection
    await db.insert(repoConnection).values({
      projectId,
      repoUrl: data.repoUrl,
      repoName,
      repoOwner,
      branch,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true, repoOwner, repoName, branch };
}

/**
 * Delete repository connection
 */
export async function unlinkRepository(projectId: string) {
  await db.delete(repoConnection).where(eq(repoConnection.projectId, projectId));

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/**
 * Refresh GitHub token for a user
 * This will re-fetch the token from the account table
 */
export async function refreshGitHubToken(userId: string) {
  try {
    // Force refresh by clearing the cached token
    await db.update(user).set({ githubToken: null }).where(eq(user.id, userId));

    // Re-fetch from account table
    const token = await getGitHubToken(userId);

    if (!token) {
      return {
        success: false,
        message: "No GitHub token found. Please sign out and sign in again with GitHub.",
      };
    }

    // Validate the token by making a test API call
    const githubService = new GitHubService(token);
    try {
      await githubService.getUserRepos();
      return {
        success: true,
        message: "GitHub token refreshed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Token is invalid or expired. Please sign out and sign in again with GitHub.",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Check GitHub token status
 */
export async function checkGitHubTokenStatus(userId: string) {
  const token = await getGitHubToken(userId);

  if (!token) {
    return {
      exists: false,
      valid: false,
      message: "No GitHub token found",
    };
  }

  // Test the token
  const githubService = new GitHubService(token);
  try {
    await githubService.getUserRepos();
    return {
      exists: true,
      valid: true,
      message: "Token is valid",
    };
  } catch (error) {
    return {
      exists: true,
      valid: false,
      message: "Token is invalid or expired",
    };
  }
}
