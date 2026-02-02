import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { task } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const taskData = await db.query.task.findFirst({
    where: eq(task.id, id),
    with: {
      project: {
        columns: {
          ownerId: true,
        },
      },
      comments: {
        with: {
          author: {
            columns: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: [asc(task.createdAt)],
      },
      ralphPlan: true,
    },
  });

  if (!taskData || taskData.project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(taskData);
}
