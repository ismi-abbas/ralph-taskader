---
description: Research highest priority task needing investigation
---

## PART I - IF A TASK IS MENTIONED

0c. fetch the selected task from the database using the task ID
0d. read the task details and all comments to understand what research is needed and any previous attempts

## PART I - IF NO TASK IS MENTIONED

0.  read the project dashboard to see available tasks
0a. fetch the top 10 priority tasks in status "BACKLOG" or "REQUIREMENTS" that need research from the database
0b. select the highest priority SMALL or low complexity issue from the list (if no suitable issues exist, EXIT IMMEDIATELY and inform the user)
0c. fetch the selected task details including description and comments
0d. read the task and all comments to understand what research is needed and any previous attempts

## PART II - NEXT STEPS

think deeply

1. move the task to "REQUIREMENTS" status (research in progress)
1a. read any linked documents in the task description or comments to understand context
1b. if insufficient information to conduct research, add a comment asking for clarification and move back to "BACKLOG"

think deeply about the research needs

2. conduct the research:
2a. search the codebase for relevant implementations and patterns
2b. examine existing similar features or related code
2c. identify technical constraints and opportunities
2d. if web research is needed, research external solutions, APIs, or best practices
2e. Be unbiased - don't think too much about an ideal implementation plan, just document all related files and how the systems work today
2f. document findings in a new document: `docs/research/YYYY-MM-DD-task-XXXX-description.md`
   - Format: `YYYY-MM-DD-task-XXXX-description.md` where:
     - YYYY-MM-DD is today's date
     - task-XXXX is the task ID (omit if no task)
     - description is a brief kebab-case description of the research topic
   - Examples:
     - With task: `2025-01-08-task-1478-parent-child-tracking.md`
     - Without task: `2025-01-08-error-handling-patterns.md`

think deeply about the findings

3. synthesize research into actionable insights:
3a. summarize key findings and technical decisions
3b. identify potential implementation approaches
3c. note any risks or concerns discovered

4. update the task:
4a. attach the research document to the task by updating the description or adding a comment
4b. add a comment summarizing the research outcomes
4c. move the task to "READY" status (research in review)

think deeply, use TodoWrite to track your tasks. When fetching tasks, get the top 10 items by priority but only work on ONE item - specifically the highest priority issue.

## PART III - When you're done

Print a message for the user (replace placeholders with actual values):

```
✅ Completed research for Task-XXXX: [task title]

Research topic: [research topic description]

The research has been:

Created at docs/research/YYYY-MM-DD-task-XXXX-description.md
Attached to the task
Task moved to "READY" status

Key findings:
- [Major finding 1]
- [Major finding 2]
- [Major finding 3]

View the task: [task URL or reference]
```

## Kanban Status Mapping

- BACKLOG → New tasks needing research (equivalent to "research needed")
- READY → Research complete, ready for planning (equivalent to "research in review")
- REQUIREMENTS → Research in progress (equivalent to "research in progress")
- READY_TO_BUILD → Plan complete
- IN_PROGRESS → Implementation in progress
- DONE → Completed
