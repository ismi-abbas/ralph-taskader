# Ralph - AI Task Manager

An AI-powered task management application similar to Plane but simpler. Features a Kanban board, GitHub integration, and AI-generated implementation plans ("Ralph Plans").

## Features

- **Kanban Board**: Drag-and-drop task management with 6 columns:
  - Backlog
  - Ready (triggers AI analysis)
  - Requirements
  - Ready to Build (human approval gate)
  - In Progress
  - Done

- **GitHub Integration**: Connect repositories and clone them locally for analysis

- **AI Feature Builder**: When a task moves to "Ready", Ralph analyzes the codebase and creates a technical implementation plan

- **Human-in-the-loop**: AI only starts building when a human clicks "Approve & Build"

## Tech Stack

- Next.js 14+ with App Router
- TypeScript
- Prisma + SQLite
- tRPC-style Server Actions
- shadcn/ui components
- Octokit (GitHub API)
- OpenAI API
- @dnd-kit (drag-and-drop)

## Setup Instructions

### 1. Clone and Install

```bash
cd ralph-task-manager/my-app
npm install
```

### 2. Set up Environment Variables

Copy `.env.local` and fill in your credentials:

```bash
cp .env.local .env.local
```

Required environment variables:
- `DATABASE_URL` - SQLite database path (default: `file:./dev.db`)
- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret
- `NEXTAUTH_SECRET` - Random secret for NextAuth.js
- `NEXTAUTH_URL` - Your app URL (default: `http://localhost:3000`)
- `OPENAI_API_KEY` - OpenAI API key for Ralph AI features

### 3. Set up GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: "Ralph Task Manager"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Generate a client secret
5. Copy Client ID and Client Secret to `.env.local`

### 4. Initialize Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

### 1. Sign In
- Click "Continue with GitHub" to sign in

### 2. Create a Project
- Click "New Project" on the home page
- Enter project name and description

### 3. Connect Repository
- In your project, click "Connect Repo"
- Enter your GitHub repository URL (e.g., `https://github.com/owner/repo`)
- Select branch (default: `main`)

### 4. Create Tasks
- Click "Add Task" to create new tasks
- Set title, description, and priority

### 5. Move Tasks Through Workflow
- Drag tasks between columns
- When moved to **Ready**: Ralph analyzes the codebase and generates a plan
- When moved to **Ready to Build**: Awaiting human approval
- Click **Approve & Build** to start AI implementation

### 6. Review Ralph's Plan
- Click on any task to view details
- See "Ralph's Plan" with:
  - Overview
  - Files to modify
  - Step-by-step implementation plan
  - Testing strategy

## Project Structure

```
my-app/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Auth pages
│   │   ├── projects/     # Project pages
│   │   ├── actions.ts    # Server actions
│   │   └── ...
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── kanban-board.tsx
│   │   ├── kanban-column.tsx
│   │   ├── kanban-card.tsx
│   │   ├── task-dialog.tsx
│   │   └── ...
│   └── lib/              # Utilities
│       ├── auth.ts       # NextAuth config
│       ├── db.ts         # Prisma client
│       ├── github.ts     # GitHub service
│       ├── ralph.ts      # AI service
│       └── ...
├── prisma/
│   └── schema.prisma     # Database schema
├── repos/                # Cloned repositories
└── README.md
```

## Database Schema

### Main Models

- **User**: Users authenticated via GitHub
- **Project**: Projects owned by users
- **RepoConnection**: GitHub repo linked to a project
- **Task**: Tasks with status, priority, and build status
- **Comment**: Comments on tasks (including AI-generated ones)
- **RalphPlan**: AI-generated implementation plans
- **CodeIndex**: Indexed code files for AI context

## License

MIT