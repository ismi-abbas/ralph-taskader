import OpenAI from "openai";
import { z } from "zod";

// Initialize OpenAI client configured for OpenRouter
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model configuration - defaults to a free model
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2.5";

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
  reasoning_details?: unknown;
}

export interface GenerateTextOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: boolean;
  model?: string;
}

export interface GenerateObjectOptions<T extends z.ZodType> {
  schema: T;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Generate text using OpenRouter via OpenAI SDK
 */
export async function generateText(
  messages: OpenRouterMessage[],
  options: GenerateTextOptions = {},
): Promise<string> {
  const {
    system,
    temperature = 0.7,
    maxTokens = 4096,
    reasoning = false,
    model = DEFAULT_MODEL,
  } = options;

  const apiMessages: OpenRouterMessage[] = [];

  if (system) {
    apiMessages.push({ role: "system", content: system });
  }

  apiMessages.push(...messages);

  const requestBody: any = {
    model,
    messages: apiMessages,
    temperature,
    max_tokens: maxTokens,
  };

  // Add reasoning if enabled (for supported models)
  if (reasoning) {
    requestBody.reasoning = { enabled: true };
  }

  try {
    console.log("OpenRouter request:", requestBody);
    const response = await openrouter.chat.completions.create(requestBody);
    console.log("OpenRouter response:", response);

    return response.choices[0].message.content || "";
  } catch (error: any) {
    // Check if it's an OpenRouter API error with more details
    if (error.status === 400 && error.error) {
      const errorMessage = error.error.message || error.message;
      throw new Error(`OpenRouter API error (400): ${errorMessage}`);
    }
    if (error instanceof Error) {
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate a single text response from a prompt
 */
export async function generateTextFromPrompt(
  prompt: string,
  options: GenerateTextOptions = {},
): Promise<string> {
  return generateText([{ role: "user", content: prompt }], options);
}

/**
 * Generate structured object using OpenRouter with Zod schema
 * Uses JSON mode for structured output
 */
export async function generateObject<T extends z.ZodType>(
  messages: OpenRouterMessage[],
  options: GenerateObjectOptions<T>,
): Promise<z.infer<T>> {
  const { schema, system, temperature = 0.7, maxTokens = 4096, model = DEFAULT_MODEL } = options;

  const apiMessages: OpenRouterMessage[] = [];

  if (system) {
    apiMessages.push({ role: "system", content: system });
  }

  apiMessages.push(...messages);

  // Add schema instruction to the last user message
  const schemaDescription = JSON.stringify(zodToJsonSchema(schema), null, 2);
  const lastMessage = apiMessages[apiMessages.length - 1];
  if (lastMessage && lastMessage.role === "user") {
    lastMessage.content += `\n\nYou must respond with a valid JSON object matching this schema:\n${schemaDescription}\n\nImportant: Respond with ONLY the JSON object, no markdown code blocks, no explanations.`;
  }

  const requestBody: any = {
    model,
    messages: apiMessages,
    temperature,
    max_tokens: maxTokens,
  };

  try {
    const response = await openrouter.chat.completions.create(requestBody);

    let content = response.choices[0].message.content || "";

    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        content = jsonObjectMatch[0];
      }
    }

    // Parse and validate the JSON response
    const parsed = JSON.parse(content);
    const validated = schema.safeParse(parsed);

    if (!validated.success) {
      throw new Error(`Schema validation failed: ${validated.error.message}`);
    }

    return validated.data;
  } catch (error: any) {
    // Check if it's an OpenRouter API error with more details
    if (error.status === 400 && error.error) {
      const errorMessage = error.error.message || error.message;
      throw new Error(`OpenRouter API error (400): ${errorMessage}`);
    }
    if (error instanceof Error) {
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate structured object from a single prompt
 */
export async function generateObjectFromPrompt<T extends z.ZodType>(
  prompt: string,
  options: GenerateObjectOptions<T>,
): Promise<z.infer<T>> {
  return generateObject([{ role: "user", content: prompt }], options);
}

/**
 * Simple conversion of Zod schema to JSON schema
 */
function zodToJsonSchema(schema: z.ZodType): unknown {
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
      type: "object",
      properties,
      required,
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof z.ZodArray) {
    const elementSchema = (schema as z.ZodArray<any>).element;
    return {
      type: "array",
      items: zodToJsonSchema(elementSchema),
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema((schema as z.ZodOptional<any>).unwrap());
  }

  return { type: "object" };
}

// Export the client for direct use if needed
export { openrouter, DEFAULT_MODEL };
