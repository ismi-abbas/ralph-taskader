import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { project, task } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const projectData = await db.query.project.findFirst({
    where: eq(project.id, id),
  });

  if (!projectData || projectData.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const tasks = await db.query.task.findMany({
    where: eq(task.projectId, id),
    with: {
      comments: {
        columns: {
          id: true,
        },
      },
    },
    orderBy: [desc(task.createdAt)],
  });

  return NextResponse.json(tasks);
}
