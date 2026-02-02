---
description: Create implementation plan for highest priority task ready for spec
---

## PART I - IF A TASK IS MENTIONED

0c. fetch the selected task from the database using the task ID
0d. read the task details and all comments to learn about past implementations and research, and any questions or concerns about them


### PART I - IF NO TASK IS MENTIONED

0.  read the project dashboard to see available tasks
0a. fetch the top 10 priority tasks in status "REQUIREMENTS" from the database
0b. select the highest priority SMALL or low complexity issue from the list (if no suitable issues exist, EXIT IMMEDIATELY and inform the user)
0c. fetch the selected task details including description and comments
0d. read the task and all comments to learn about past implementations and research, and any questions or concerns about them

### PART II - NEXT STEPS

think deeply

1. move the task to "REQUIREMENTS" status (if not already)
1a. check if an implementation plan exists in the task description or linked documents
1d. if the plan exists, you're done, respond with a link to the task
1e. if the research is insufficient or has unanswered questions, create a new plan document

think deeply

2. when the plan is complete:
2a. update the task description with the implementation plan
2b. add a comment with a link to the plan document
2c. move the task to "READY_TO_BUILD" status

think deeply, use TodoWrite to track your tasks. When fetching tasks, get the top 10 items by priority but only work on ONE item - specifically the highest priority SMALL or low complexity issue.

### PART III - When you're done


Print a message for the user (replace placeholders with actual values):

```
✅ Completed implementation plan for Task-XXXX: [task title]

Approach: [selected approach description]

The plan has been:

Created and attached to the task
Task moved to "READY_TO_BUILD" status

Implementation phases:
- Phase 1: [phase 1 description]
- Phase 2: [phase 2 description]
- Phase 3: [phase 3 description if applicable]

View the task: [task URL or reference]
```

## Kanban Status Mapping

- BACKLOG → New tasks not yet prioritized
- READY → Ready for development
- REQUIREMENTS → Needs specification/planning (equivalent to "ready for spec")
- READY_TO_BUILD → Plan complete, ready to implement (equivalent to "plan in review")
- IN_PROGRESS → Currently being worked on
- DONE → Completed
