import { auth as serverAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { project } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Folder } from "lucide-react";
import SignOutButton from "./signout-button";

export default async function Home() {
  const session = await serverAuth.api.getSession({
    headers: await import("next/headers").then((h) => h.headers()),
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const projects = await db.query.project.findMany({
    where: eq(project.ownerId, session.user.id),
    with: {
      tasks: {
        columns: {
          id: true,
        },
      },
    },
    orderBy: [desc(project.updatedAt)],
  });

  const projectsWithCount = projects.map((p) => ({
    ...p,
    _count: { tasks: p.tasks.length },
  }));

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <h1 className="text-xl font-bold">Ralph</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Projects</h2>
            <p className="text-muted-foreground">
              Manage your projects and tasks
            </p>
          </div>
          <Link href="/projects/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {projectsWithCount.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <Link href="/projects/new">
                <Button>Create Project</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsWithCount.map((proj) => (
              <Link key={proj.id} href={`/projects/${proj.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle>{proj.name}</CardTitle>
                    <CardDescription>
                      {proj.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{proj._count.tasks} tasks</span>
                      <span>Updated {proj.updatedAt.toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
