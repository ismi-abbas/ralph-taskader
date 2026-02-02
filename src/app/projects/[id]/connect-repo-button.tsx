"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Github, Plus } from "lucide-react";
import { RepoSelector } from "@/components/repo-selector";

interface ConnectRepoButtonProps {
  projectId: string;
}

export function ConnectRepoButton({ projectId }: ConnectRepoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    // Refresh the page to show the connected repo
    window.location.reload();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Github className="w-4 h-4 mr-2" />
        Connect Repo
      </Button>

      <RepoSelector
        projectId={projectId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
