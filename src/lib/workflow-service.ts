import fs from "fs/promises";
import path from "path";
import { generateTextFromPrompt, generateObjectFromPrompt } from "./openrouter-sdk";
import { z } from "zod";

const WORKFLOW_DIR = path.join(process.cwd(), "workflow-file");

export interface WorkflowContext {
  taskId?: string;
  taskTitle?: string;
  taskDescription?: string;
  projectId?: string;
  [key: string]: any;
}

/**
 * Read a workflow file and return its content
 */
async function readWorkflowFile(filename: string): Promise<string> {
  const filePath = path.join(WORKFLOW_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Failed to read workflow file ${filename}: ${error}`);
  }
}

/**
 * Replace template variables in the workflow content
 */
function replaceTemplateVariables(content: string, context: WorkflowContext): string {
  let result = content;

  // Replace common template variables
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      const placeholder = new RegExp(`\\[${key}\\]|\\{${key}\\}`, "gi");
      result = result.replace(placeholder, String(value));
    }
  }

  // Replace date placeholder
  const today = new Date().toISOString().split("T")[0];
  result = result.replace(/\[today\]|\{today\}/gi, today);

  return result;
}

/**
 * Execute research workflow using the research.md prompt
 */
export async function executeResearchWorkflow(context: WorkflowContext): Promise<string> {
  const workflowContent = await readWorkflowFile("research.md");
  const prompt = replaceTemplateVariables(workflowContent, context);

  const result = await generateTextFromPrompt(prompt, {
    system:
      "You are a research assistant. Follow the workflow instructions carefully and provide detailed research findings.",
    temperature: 0.7,
    maxTokens: 4000,
  });

  return result;
}

/**
 * Execute planning workflow using the plan.md prompt
 */
export async function executePlanningWorkflow(context: WorkflowContext): Promise<string> {
  const workflowContent = await readWorkflowFile("plan.md");
  const prompt = replaceTemplateVariables(workflowContent, context);

  const result = await generateTextFromPrompt(prompt, {
    system:
      "You are a technical planning assistant. Follow the workflow instructions carefully and create detailed implementation plans.",
    temperature: 0.7,
    maxTokens: 4000,
  });

  return result;
}

/**
 * Schema for implementation workflow output
 */
const implementationSchema = z.object({
  summary: z.string().describe("Summary of what was implemented"),
  filesChanged: z.array(z.string()).describe("List of files that were modified"),
  keyChanges: z.array(z.string()).describe("Key changes made"),
  testingNotes: z.string().describe("Notes on how to test the implementation"),
  nextSteps: z.array(z.string()).describe("Recommended next steps"),
});

export type ImplementationResult = z.infer<typeof implementationSchema>;

/**
 * Execute implementation workflow using the impl.md prompt
 */
export async function executeImplementationWorkflow(
  context: WorkflowContext,
): Promise<ImplementationResult> {
  const workflowContent = await readWorkflowFile("impl.md");
  const prompt = replaceTemplateVariables(workflowContent, context);

  const result = await generateObjectFromPrompt(prompt, {
    schema: implementationSchema,
    system:
      "You are an implementation assistant. Follow the workflow instructions carefully and implement the requested changes. Provide structured output about what was done.",
    temperature: 0.7,
    maxTokens: 4000,
  });

  return result;
}

/**
 * Get raw workflow content for a specific workflow type
 */
export async function getWorkflowContent(
  workflowType: "research" | "plan" | "impl",
): Promise<string> {
  const filename = `${workflowType}.md`;
  return readWorkflowFile(filename);
}

/**
 * Execute any workflow with custom options
 */
export async function executeWorkflow(
  workflowType: "research" | "plan" | "impl",
  context: WorkflowContext,
  options: {
    system?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<string> {
  const workflowContent = await getWorkflowContent(workflowType);
  const prompt = replaceTemplateVariables(workflowContent, context);

  const result = await generateTextFromPrompt(prompt, {
    system: options.system || `You are a ${workflowType} assistant.`,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 4000,
  });

  return result;
}
