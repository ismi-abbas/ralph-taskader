import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github } from "lucide-react"

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">R</span>
          </div>
          <CardTitle className="text-2xl">Welcome to Ralph</CardTitle>
          <CardDescription>
            AI-powered task management and code generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a href="/api/auth/signin/github" className="block">
            <Button className="w-full" size="lg">
              <Github className="w-5 h-5 mr-2" />
              Continue with GitHub
            </Button>
          </a>
          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
