import { db } from "./src/lib/db";
import { user, account } from "./src/db/schema";
import { eq, and } from "drizzle-orm";

async function checkGitHubTokens() {
  console.log("Checking GitHub tokens in database...\n");

  // Get all users
  const users = await db.query.user.findMany();
  console.log(`Found ${users.length} users:`);

  for (const u of users) {
    console.log(`\nUser: ${u.name} (${u.email})`);
    console.log(`  ID: ${u.id}`);
    console.log(`  GitHub Token in user table: ${u.githubToken ? "✅ Present" : "❌ Missing"}`);

    // Check account table
    const acc = await db.query.account.findFirst({
      where: and(eq(account.userId, u.id), eq(account.providerId, "github")),
    });

    if (acc) {
      console.log(`  GitHub account found:`);
      console.log(`    Account ID: ${acc.accountId}`);
      console.log(`    Access Token: ${acc.accessToken ? "✅ Present" : "❌ Missing"}`);
      console.log(`    Scope: ${acc.scope || "N/A"}`);
    } else {
      console.log(`  ❌ No GitHub account linked`);
    }
  }

  process.exit(0);
}

checkGitHubTokens().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
