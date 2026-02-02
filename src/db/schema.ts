import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// Helper for timestamps
const timestamps = {
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
};

// Enums
export const taskStatusEnum = [
  "BACKLOG",
  "READY",
  "REQUIREMENTS",
  "READY_TO_BUILD",
  "IN_PROGRESS",
  "DONE",
] as const;
export const priorityEnum = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const buildStatusEnum = [
  "NOT_STARTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
] as const;

export type TaskStatus = (typeof taskStatusEnum)[number];
export type Priority = (typeof priorityEnum)[number];
export type BuildStatus = (typeof buildStatusEnum)[number];

// Better Auth tables (following Better Auth schema)
export const user = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  githubToken: text("github_token"),
  ...timestamps,
});

export const session = pgTable("session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

export const account = pgTable(
  "account",
  {
    id: text("id").$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [{ pk: primaryKey({ columns: [table.providerId, table.accountId] }) }],
);

export const verification = pgTable("verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

// Application tables
export const project = pgTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const repoConnection = pgTable("repo_connection", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .unique()
    .references(() => project.id, { onDelete: "cascade" }),
  repoUrl: text("repo_url").notNull(),
  repoName: text("repo_name").notNull(),
  repoOwner: text("repo_owner").notNull(),
  branch: text("branch").notNull().default("main"),
  lastSyncedAt: timestamp("last_synced_at"),
  ...timestamps,
});

export const task = pgTable("task", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("BACKLOG"),
  priority: text("priority").notNull().default("MEDIUM"),
  buildStatus: text("build_status").notNull().default("NOT_STARTED"),
  githubIssueUrl: text("github_issue_url"),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const comment = pgTable("comment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  content: text("content").notNull(),
  taskId: text("task_id")
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  isAIGenerated: boolean("is_ai_generated").notNull().default(false),
  ...timestamps,
});

export const ralphPlan = pgTable("ralph_plan", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  taskId: text("task_id")
    .notNull()
    .unique()
    .references(() => task.id, { onDelete: "cascade" }),
  overview: text("overview").notNull(),
  filesToModify: text("files_to_modify").array().notNull(),
  implementationPlan: jsonb("implementation_plan").notNull(),
  dependencies: text("dependencies").array(),
  testingStrategy: text("testing_strategy"),
  ...timestamps,
});

export const codeIndex = pgTable("code_index", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text("project_id").notNull(),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding"),
  language: text("language"),
  ...timestamps,
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  projects: many(project),
  comments: many(comment),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  owner: one(user, {
    fields: [project.ownerId],
    references: [user.id],
  }),
  repoConnection: one(repoConnection, {
    fields: [project.id],
    references: [repoConnection.projectId],
  }),
  tasks: many(task),
}));

export const repoConnectionRelations = relations(repoConnection, ({ one }) => ({
  project: one(project, {
    fields: [repoConnection.projectId],
    references: [project.id],
  }),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  comments: many(comment),
  ralphPlan: one(ralphPlan, {
    fields: [task.id],
    references: [ralphPlan.taskId],
  }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  task: one(task, {
    fields: [comment.taskId],
    references: [task.id],
  }),
  author: one(user, {
    fields: [comment.authorId],
    references: [user.id],
  }),
}));

export const ralphPlanRelations = relations(ralphPlan, ({ one }) => ({
  task: one(task, {
    fields: [ralphPlan.taskId],
    references: [task.id],
  }),
}));

// Type exports
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Project = typeof project.$inferSelect;
export type Task = typeof task.$inferSelect & {
  status: TaskStatus;
  priority: Priority;
  buildStatus: BuildStatus;
};
export type Comment = typeof comment.$inferSelect;
export type RalphPlan = typeof ralphPlan.$inferSelect;
export type RepoConnection = typeof repoConnection.$inferSelect;
export type CodeIndex = typeof codeIndex.$inferSelect;
export type Verification = typeof verification.$inferSelect;
