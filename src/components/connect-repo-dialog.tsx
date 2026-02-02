"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitHubLogoIcon } from "@radix-ui/react-icons"
import { Loader2, GitBranch } from "lucide-react"

interface ConnectRepoDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    repoUrl: string
    branch: string
  }) => Promise<void>
}

export function ConnectRepoDialog({
  isOpen,
  onClose,
  onSubmit,
}: ConnectRepoDialogProps) {
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repoUrl.trim()) return

    setIsSubmitting(true)
    await onSubmit({
      repoUrl: repoUrl.trim(),
      branch: branch.trim() || "main",
    })
    setIsSubmitting(false)
    setRepoUrl("")
    setBranch("main")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitHubLogoIcon className="w-5 h-5" />
            Connect GitHub Repository
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Repository URL
            </label>
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the HTTPS URL of your GitHub repository
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              Branch
            </label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Connect Repository
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}