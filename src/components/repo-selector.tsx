"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Github, Loader2, Search, RefreshCw } from "lucide-react";
import { relinkRepository } from "@/app/actions-repo";

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  description: string | null;
  private: boolean;
  updatedAt: string;
}

interface RepoSelectorProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RepoSelector({ projectId, isOpen, onClose, onSuccess }: RepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/github/repos");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch repositories");
      }
      const data = await response.json();
      setRepos(data.repositories);
      setFilteredRepos(data.repositories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repositories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRepos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = repos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredRepos(filtered);
    } else {
      setFilteredRepos(repos);
    }
  }, [searchQuery, repos]);

  const handleConnect = async () => {
    if (!selectedRepo) return;

    const repo = repos.find((r) => r.id.toString() === selectedRepo);
    if (!repo) return;

    setIsConnecting(true);
    setError(null);

    try {
      await relinkRepository(projectId, {
        repoUrl: repo.cloneUrl,
        branch: repo.defaultBranch,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect repository");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Select GitHub Repository
          </DialogTitle>
          <DialogDescription>
            Choose a repository from your GitHub account to connect to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={isLoading}
            />
          </div>

          {/* Refresh button */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={fetchRepos} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Repository List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 p-4 text-center">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchRepos}>
                  Try Again
                </Button>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {searchQuery ? "No repositories match your search" : "No repositories found"}
              </div>
            ) : (
              <RadioGroup value={selectedRepo} onValueChange={setSelectedRepo} className="divide-y">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedRepo === repo.id.toString() ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedRepo(repo.id.toString())}
                  >
                    <RadioGroupItem
                      value={repo.id.toString()}
                      id={repo.id.toString()}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={repo.id.toString()} className="font-medium cursor-pointer">
                          {repo.fullName}
                        </Label>
                        {repo.private && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            Private
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Branch: {repo.defaultBranch}</span>
                        <span>Updated: {new Date(repo.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={isConnecting}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={!selectedRepo || isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4 mr-2" />
                  Connect Repository
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
