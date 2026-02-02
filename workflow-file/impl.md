---
description: Implement highest priority small task with worktree setup
---

## PART I - IF A TASK IS MENTIONED

0c. fetch the selected task from the database using the task ID
0d. read the task details, description, and any comments to understand the implementation plan and any concerns

## PART I - IF NO TASK IS MENTIONED

0.  read the project dashboard to see available tasks
0a. fetch the top 10 priority tasks in status "READY" from the database
0b. select the highest priority SMALL or low complexity issue from the list (if no suitable issues exist, EXIT IMMEDIATELY and inform the user)
0c. fetch the selected task details including description and comments
0d. read the task and all comments to understand the implementation plan and any concerns

## PART II - NEXT STEPS

think deeply

1. move the task to "IN_PROGRESS" status:
1a. check if there's a linked implementation plan in the task description or comments
1b. if no plan exists, move the task back to "REQUIREMENTS" and EXIT with an explanation

think deeply about the implementation

2. set up worktree for implementation:
2a. read `hack/create_worktree.sh` if it exists, or create a new worktree manually
2b. create a new branch with the task ID: `git checkout -b task-XXXX`
2c. launch implementation session with the plan

think deeply, use TodoWrite to track your tasks. When fetching tasks, get the top 10 items by priority but only work on ONE item - specifically the highest priority SMALL or low complexity issue.

## Kanban Status Mapping

- BACKLOG → New tasks not yet prioritized
- READY → Ready for development (equivalent to "ready for dev")
- REQUIREMENTS → Needs specification/planning (equivalent to "ready for spec")
- READY_TO_BUILD → Approved and ready to implement
- IN_PROGRESS → Currently being worked on (equivalent to "in dev")
- DONE → Completed
