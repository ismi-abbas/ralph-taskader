import { auth as serverAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { project } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Github } from "lucide-react";
import { ProjectBoard } from "./project-board";
import { RepoConnectionManager } from "@/components/repo-connection-manager";
import { ConnectRepoButton } from "./connect-repo-button";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await serverAuth.api.getSession({
    headers: await import("next/headers").then((h) => h.headers()),
  });

  const { id } = await params;

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const projectData = await db.query.project.findFirst({
    where: eq(project.id, id),
    with: {
      repoConnection: true,
      tasks: {
        with: {
          comments: {
            columns: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!projectData || projectData.ownerId !== session.user.id) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Projects
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{projectData.name}</h1>
                {projectData.description && (
                  <p className="text-sm text-muted-foreground">{projectData.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {projectData.repoConnection ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Github className="w-4 h-4" />
                    <span>
                      {projectData.repoConnection.repoOwner}/{projectData.repoConnection.repoName}
                    </span>
                    <span className="bg-zinc-100 px-2 py-0.5 rounded text-xs">
                      {projectData.repoConnection.branch}
                    </span>
                  </div>
                  <RepoConnectionManager
                    projectId={id}
                    userId={session.user.id}
                    repoConnection={projectData.repoConnection}
                  />
                </div>
              ) : (
                <ConnectRepoButton projectId={id} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {!projectData.repoConnection && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Connect a Repository</CardTitle>
              <CardDescription className="text-blue-700">
                Connect a GitHub repository to enable AI-powered task planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-600">
                  Select a repository from your GitHub account to get started.
                </p>
                <ConnectRepoButton projectId={id} />
              </div>
            </CardContent>
          </Card>
        )}

        <ProjectBoard
          project={projectData}
          currentUser={{
            id: session.user.id,
            name: session.user.name || "",
            image: session.user.image || null,
          }}
        />
      </div>
    </main>
  );
}
