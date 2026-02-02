# Ralph Migration: Prisma → Drizzle + NextAuth → Better Auth

## ✅ COMPLETED

### 1. Dependencies
- ✅ Installed drizzle-orm, better-sqlite3, better-auth
- ✅ Installed @paralleldrive/cuid2, drizzle-kit
- ✅ Removed old NextAuth API route

### 2. Database Schema
- ✅ Created full Drizzle schema (`src/db/schema.ts`)
- ✅ Converted all 10 tables with relations
- ✅ Added Better Auth compatible auth tables
- ✅ Generated and applied migrations
- ✅ New database created successfully

### 3. Auth Setup
- ✅ Better Auth config (`src/lib/auth.ts`)
- ✅ Auth API routes (`src/app/api/auth/[...all]/route.ts`)
- ✅ Removed old NextAuth route

### 4. Database Client
- ✅ Updated `src/lib/db.ts` to export Drizzle client
- ✅ Created `src/db/index.ts` with Drizzle client

### 5. Server Actions (CONVERTED)
- ✅ `src/app/actions.ts` - All functions converted to Drizzle queries

### 6. Pages (CONVERTED)
- ✅ `src/app/page.tsx` - Home page with projects list
- ✅ `src/app/projects/new/page.tsx` - New project form
- ✅ `src/app/projects/[id]/page.tsx` - Project detail page

## 🔄 REMAINING WORK

### 7. Components (NEEDS UPDATE)
- ⏳ `src/app/projects/[id]/project-board.tsx`
- ⏳ `src/components/kanban-board.tsx`
- ⏳ `src/components/kanban-column.tsx`
- ⏳ `src/components/kanban-card.tsx`
- ⏳ `src/components/task-dialog.tsx`

### 8. API Routes (NEEDS UPDATE)
- ⏳ `src/app/api/projects/[id]/tasks/route.ts`
- ⏳ `src/app/api/tasks/[id]/route.ts`

### 9. Services (NEEDS UPDATE)
- ⏳ `src/lib/ralph.ts` - Update Prisma references

### 10. Auth Pages
- ⏳ Create sign-in page for Better Auth
- ⏳ Update sign-out handling

### 11. Environment Variables
Need to update `.env.local`:
```
DATABASE_URL="file:./dev.db"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3000"
OPENAI_API_KEY="your-openai-key"
```

### 12. Package.json Cleanup
- ⏳ Remove Prisma dependencies
- ⏳ Remove NextAuth dependencies

### 13. Testing
- ⏳ Test auth flow (sign in/out)
- ⏳ Test project creation
- ⏳ Test task management
- ⏳ Test repo connection
- ⏳ Test Ralph AI features

## ⚠️ KNOWN ISSUES

1. **Auth imports** - Some files still import from old auth location
2. **Type compatibility** - May need type adjustments for Better Auth session
3. **JSON fields** - Drizzle uses `$type` for JSON, may need runtime checks
4. **Timestamps** - Drizzle uses integer timestamps, dates need conversion

## 📝 NOTES

- Old Prisma database backed up as `dev.db.prisma.bak`
- Drizzle migrations in `drizzle/` folder
- Better Auth follows different session structure than NextAuth
- GitHub OAuth needs re-configuration for Better Auth

## 🚀 NEXT STEPS

1. Update remaining components
2. Update API routes  
3. Create auth sign-in page
4. Test the application
5. Clean up dependencies
6. Update environment variables
