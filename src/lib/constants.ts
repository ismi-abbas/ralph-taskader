export const taskStatuses = [
  { id: "BACKLOG", label: "Backlog", color: "bg-zinc-200" },
  { id: "READY", label: "Ready", color: "bg-blue-200" },
  { id: "REQUIREMENTS", label: "Requirements", color: "bg-yellow-200" },
  { id: "READY_TO_BUILD", label: "Ready to Build", color: "bg-orange-200" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-purple-200" },
  { id: "DONE", label: "Done", color: "bg-green-200" },
] as const;

export const priorities = [
  { id: "LOW", label: "Low", color: "bg-zinc-400" },
  { id: "MEDIUM", label: "Medium", color: "bg-blue-400" },
  { id: "HIGH", label: "High", color: "bg-orange-400" },
  { id: "CRITICAL", label: "Critical", color: "bg-red-500" },
] as const;

export type TaskStatus = (typeof taskStatuses)[number]["id"];
export type Priority = (typeof priorities)[number]["id"];
