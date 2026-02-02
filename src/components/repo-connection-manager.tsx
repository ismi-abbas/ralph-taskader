"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Github, RefreshCw, Unlink, CheckCircle, AlertCircle, Loader2, KeyRound } from "lucide-react";
import {
  relinkRepository,
  unlinkRepository,
  refreshGitHubToken,
  checkGitHubTokenStatus,
} from "@/app/actions-repo";
import { RepoSelector } from "./repo-selector";
import { authClient } from "@/lib/auth-client";

interface RepoConnectionManagerProps {
  projectId: string;
  userId: string;
  repoConnection?: {
    repoUrl: string;
    repoOwner: string;
    repoName: string;
    branch: string;
  } | null;
}

export function RepoConnectionManager({
  projectId,
  userId,
  repoConnection,
}: RepoConnectionManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{
    exists: boolean;
    valid: boolean;
    message: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCheckToken = async () => {
    const status = await checkGitHubTokenStatus(userId);
    setTokenStatus(status);
  };

  const handleRefreshToken = async () => {
    setIsLoading(true);
    try {
      const result = await refreshGitHubToken(userId);
      setMessage(result.message);
      if (result.success) {
        await handleCheckToken();
      }
    } catch (error) {
      setMessage("Failed to refresh token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelink = async (repoUrl: string, branch: string) => {
    setIsLoading(true);
    try {
      await relinkRepository(projectId, { repoUrl, branch });
      setMessage("Repository relinked successfully!");
      setTimeout(() => {
        setIsOpen(false);
        setIsRepoSelectorOpen(false);
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage("Failed to relink repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Are you sure you want to unlink this repository?")) return;
    setIsLoading(true);
    try {
      await unlinkRepository(projectId);
      setMessage("Repository unlinked successfully!");
      setTimeout(() => {
        setIsOpen(false);
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage("Failed to unlink repository");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Github className="w-4 h-4 mr-2" />
            {repoConnection ? "Manage Repo" : "Connect Repo"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Repository Connection</DialogTitle>
            <DialogDescription>Manage your GitHub repository connection and token</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* GitHub Token Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>GitHub Token Status</Label>
                <Button variant="ghost" size="sm" onClick={handleCheckToken} disabled={isLoading}>
                  Check Status
                </Button>
              </div>

              {tokenStatus && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    tokenStatus.valid
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : tokenStatus.exists
                        ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tokenStatus.valid ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {tokenStatus.message}
                  </div>
                </div>
              )}

              {!tokenStatus?.valid && (
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">To fix token issues:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Sign out of the application</li>
                    <li>Sign in again with GitHub</li>
                    <li>Grant repository access when prompted</li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleRefreshToken}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh Token
                  </Button>
                </div>
              )}

              {/* Re-request Access Button */}
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Need to grant additional repository permissions?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    authClient.signIn.social({
                      provider: "github",
                      callbackURL: window.location.href,
                    });
                  }}
                  disabled={isLoading}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Re-authorize GitHub Access
                </Button>
              </div>
            </div>

            {/* Repository Connection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Repository</Label>
                {repoConnection ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      <span className="font-medium">
                        {repoConnection.repoOwner}/{repoConnection.repoName}
                      </span>
                      <span className="bg-zinc-100 px-2 py-0.5 rounded text-xs">
                        {repoConnection.branch}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No repository connected
                  </div>
                )}
              </div>

              {message && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    message.includes("success")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsRepoSelectorOpen(true)} 
                  disabled={isLoading} 
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Github className="w-4 h-4 mr-2" />
                  )}
                  {repoConnection ? "Change Repository" : "Select Repository"}
                </Button>

                {repoConnection && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleUnlink}
                    disabled={isLoading}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Unlink
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RepoSelector
        projectId={projectId}
        isOpen={isRepoSelectorOpen}
        onClose={() => setIsRepoSelectorOpen(false)}
        onSuccess={() => {
          setIsRepoSelectorOpen(false);
          setIsOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
