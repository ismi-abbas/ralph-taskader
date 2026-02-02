import { auth as serverAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { project } from "@/db/schema";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export default async function NewProjectPage() {
  const session = await serverAuth.api.getSession({
    headers: await import("next/headers").then((h) => h.headers()),
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  async function createProject(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) return;

    const [newProject] = await db
      .insert(project)
      .values({
        name,
        description,
        ownerId: session!.user.id,
      })
      .returning();

    redirect(`/projects/${newProject.id}`);
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Create New Project</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <form action={createProject} className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-1 block">Project Name</label>
            <Input name="name" placeholder="Enter project name..." required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input name="description" placeholder="Enter project description..." />
          </div>
          <div className="flex gap-2">
            <Link href="/" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1">
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
