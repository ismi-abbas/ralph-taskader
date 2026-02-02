import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Initialize Anthropic client with API key from environment
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Model configuration
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateTextOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateObjectOptions<T extends z.ZodType> {
  schema: T;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generate text using Claude SDK
 */
export async function generateText(
  messages: ClaudeMessage[],
  options: GenerateTextOptions = {}
): Promise<string> {
  const { system, temperature = 0.7, maxTokens = 4096 } = options;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from Claude');
  }

  return content.text;
}

/**
 * Generate a single text response from a prompt
 */
export async function generateTextFromPrompt(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  return generateText([{ role: 'user', content: prompt }], options);
}

/**
 * Generate structured object using Claude SDK with Zod schema
 * Uses function calling/tool use for structured output
 */
export async function generateObject<T extends z.ZodType>(
  messages: ClaudeMessage[],
  options: GenerateObjectOptions<T>
): Promise<z.infer<T>> {
  const { schema, system, temperature = 0.7, maxTokens = 4096 } = options;

  // Convert Zod schema to JSON schema for Claude
  const jsonSchema = zodToJsonSchema(schema);
  
  // Create a tool for structured output
  const toolName = 'generate_structured_output';
  
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: system || 'You are a helpful assistant that generates structured data. Always use the provided tool to output your response.',
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    tools: [
      {
        name: toolName,
        description: 'Generate structured output according to the schema',
        input_schema: jsonSchema as any,
      },
    ],
    tool_choice: { type: 'tool', name: toolName },
  });

  // Extract the tool use from response
  const toolUse = response.content.find(
    (content): content is { type: 'tool_use'; id: string; name: string; input: unknown } => 
      content.type === 'tool_use'
  );

  if (!toolUse) {
    throw new Error('Expected tool_use response from Claude for structured output');
  }

  // Validate the output against the Zod schema
  const parsed = schema.safeParse(toolUse.input);
  
  if (!parsed.success) {
    throw new Error(`Schema validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}

/**
 * Generate structured object from a single prompt
 */
export async function generateObjectFromPrompt<T extends z.ZodType>(
  prompt: string,
  options: GenerateObjectOptions<T>
): Promise<z.infer<T>> {
  return generateObject([{ role: 'user', content: prompt }], options);
}

/**
 * Simple conversion of Zod schema to JSON schema
 * This is a basic implementation - for production, consider using zod-to-json-schema package
 */
function zodToJsonSchema(schema: z.ZodType): unknown {
  // For now, we'll use a simple approach
  // In production, you might want to use the 'zod-to-json-schema' package
  const def = (schema as any)._def;
  
  if (schema instanceof z.ZodObject) {
    const shape = (schema as z.ZodObject<any>).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodType);
      if (!(value as z.ZodType).isOptional()) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required,
    };
  }
  
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  
  if (schema instanceof z.ZodArray) {
    const elementSchema = (schema as z.ZodArray<any>).element;
    return {
      type: 'array',
      items: zodToJsonSchema(elementSchema),
    };
  }
  
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema((schema as z.ZodOptional<any>).unwrap());
  }
  
  // Default fallback
  return { type: 'object' };
}

// Export the anthropic client for direct use if needed
export { anthropic, CLAUDE_MODEL };
