import { db } from "@/lib/db";
import { user, account } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get GitHub access token for a user
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    // First check if token is stored in user table
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (userData?.githubToken) {
      return userData.githubToken;
    }

    // Otherwise, fetch from account table
    const accountData = await db.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, "github")),
    });

    if (accountData?.accessToken) {
      // Save to user table for easier access next time
      await db
        .update(user)
        .set({ githubToken: accountData.accessToken })
        .where(eq(user.id, userId));

      return accountData.accessToken;
    }

    return null;
  } catch (error) {
    console.error("Failed to get GitHub token:", error);
    return null;
  }
}

/**
 * Save GitHub token to user record
 */
export async function saveGitHubToken(userId: string, token: string): Promise<void> {
  try {
    await db.update(user).set({ githubToken: token }).where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to save GitHub token:", error);
    throw error;
  }
}
