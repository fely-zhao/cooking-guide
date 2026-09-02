import type { ApiClient, OpenAIChatRequest, OpenAIChatResponse } from './api-proxy';
import i18n from '../i18n';
import type {
  ParseRecipeRequest,
  ParseRecipeResponse,
  AskQuestionRequest,
  AskQuestionResponse,
} from '../types/api';

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = 'deepseek-v4-flash';

// 结构化解析 system prompt：i18n 阶段 4 起随 UI 语言取（llm.systemPrompt），
// 并显式声明输出语言 —— 英文模式录中文菜谱直接得英文菜谱（数据语言跟会话语言）
const getSystemPrompt = (): string => i18n.t('llm.systemPrompt');

const PARSE_RECIPE_FUNCTION = {
  name: 'parse_recipe',
  description: 'Parse any recipe input into structured JSON with step tags',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'string' },
          },
          required: ['name', 'amount'],
        },
      },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            tag: {
              type: 'string',
              enum: ['instant', 'wait_user', 'wait_timer'],
            },
            duration_seconds: { type: 'integer', minimum: 1 },
          },
          required: ['text', 'tag'],
        },
      },
    },
    required: ['name', 'ingredients', 'steps'],
  },
} as const;

const ASK_SYSTEM_PROMPT_PREFIX = '你是烹饪助手，正在指导用户做菜。回答简短，30字以内。';

// ---------------------------------------------------------------------------
// LLMService
// ---------------------------------------------------------------------------

export class LLMService {
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  // -----------------------------------------------------------------------
  // parseRecipe
  // -----------------------------------------------------------------------

  async parseRecipe(request: ParseRecipeRequest): Promise<ParseRecipeResponse> {
    const chatRequest = this.buildParseRecipeRequest(request);
    const response = await this.apiClient.chatCompletions(chatRequest);
    return this.extractParseRecipe(response);
  }

  // -----------------------------------------------------------------------
  // askQuestion
  // -----------------------------------------------------------------------

  async askQuestion(request: AskQuestionRequest): Promise<AskQuestionResponse> {
    const chatRequest = this.buildAskQuestionRequest(request);
    const response = await this.apiClient.chatCompletions(chatRequest);
    return this.extractAskQuestion(response);
  }

  // -----------------------------------------------------------------------
  // Request builders
  // -----------------------------------------------------------------------

  private buildParseRecipeRequest(req: ParseRecipeRequest): OpenAIChatRequest {
    const userContent =
      typeof req.input === 'string'
        ? req.input
        : [
            {
              type: 'image_url' as const,
              image_url: { url: req.input.image_base64, detail: 'auto' as const },
            },
          ];

    return {
      model: MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: userContent },
      ],
      tools: [
        {
          type: 'function',
          function: PARSE_RECIPE_FUNCTION,
        },
      ],
      thinking: { type: 'disabled' },
    };
  }

  private buildAskQuestionRequest(req: AskQuestionRequest): OpenAIChatRequest {
    const systemPrompt = `${ASK_SYSTEM_PROMPT_PREFIX}\n当前菜谱：${req.context.recipe_name}\n当前步骤：${req.context.current_step.text}`;

    return {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: req.question },
      ],
      max_tokens: 150,
      temperature: 0.5,
      thinking: { type: 'disabled' },
    };
  }

  // -----------------------------------------------------------------------
  // Response extractors
  // -----------------------------------------------------------------------

  private extractParseRecipe(response: OpenAIChatResponse): ParseRecipeResponse {
    const choice = nthChoice(response, 0);
    const toolCall = firstToolCall(choice);
    if (!toolCall) {
      throw new LLMError('No function call in parseRecipe response');
    }
    if (toolCall.function.name !== 'parse_recipe') {
      throw new LLMError(`Unexpected function call: ${toolCall.function.name}`);
    }

    let args: unknown;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new LLMError('Failed to parse function call arguments');
    }

    return validateParseRecipeResponse(args);
  }

  private extractAskQuestion(response: OpenAIChatResponse): AskQuestionResponse {
    const choice = nthChoice(response, 0);
    const answer = choice.message.content;
    if (!answer || typeof answer !== 'string') {
      throw new LLMError('No text content in askQuestion response');
    }
    return validateAskQuestionResponse({ answer });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nthChoice(response: OpenAIChatResponse, n: number) {
  const choice = response.choices?.[n];
  if (!choice) {
    throw new LLMError('No choices in response');
  }
  return choice;
}

function firstToolCall(choice: OpenAIChatResponse['choices'][number]) {
  return choice.message?.tool_calls?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------

const VALID_TAGS = ['instant', 'wait_user', 'wait_timer'] as const;

function validateParseRecipeResponse(value: unknown): ParseRecipeResponse {
  if (typeof value !== 'object' || value === null) {
    throw new LLMError('Response must be a non-null object');
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.name !== 'string') {
    throw new LLMError('Response missing required string field: name');
  }

  if (!Array.isArray(obj.ingredients)) {
    throw new LLMError('Response missing required array field: ingredients');
  }

  for (const ing of obj.ingredients) {
    if (typeof ing !== 'object' || ing === null) {
      throw new LLMError('Each ingredient must be a non-null object');
    }
    const i = ing as Record<string, unknown>;
    if (typeof i.name !== 'string') {
      throw new LLMError('Each ingredient must have a string field: name');
    }
    if (typeof i.amount !== 'string') {
      throw new LLMError('Each ingredient must have a string field: amount');
    }
  }

  if (!Array.isArray(obj.steps)) {
    throw new LLMError('Response missing required array field: steps');
  }

  for (const step of obj.steps) {
    if (typeof step !== 'object' || step === null) {
      throw new LLMError('Each step must be a non-null object');
    }
    const s = step as Record<string, unknown>;
    if (typeof s.text !== 'string') {
      throw new LLMError('Each step must have a string field: text');
    }
    if (!VALID_TAGS.includes(s.tag as (typeof VALID_TAGS)[number])) {
      throw new LLMError(`Invalid step tag: ${String(s.tag)}`);
    }
    if (
      s.duration_seconds != null &&
      (typeof s.duration_seconds !== 'number' || s.duration_seconds < 1)
    ) {
      throw new LLMError('duration_seconds must be a positive integer when present');
    }
    // Normalize: null → absent (DeepSeek may output null for non-timer steps)
    if (s.duration_seconds === null) {
      delete s.duration_seconds;
    }
  }

  return value as ParseRecipeResponse;
}

function validateAskQuestionResponse(value: unknown): AskQuestionResponse {
  if (typeof value !== 'object' || value === null) {
    throw new LLMError('Response must be a non-null object');
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.answer !== 'string') {
    throw new LLMError('Response missing required string field: answer');
  }

  return value as AskQuestionResponse;
}
