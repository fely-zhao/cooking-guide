// ---------------------------------------------------------------------------
// OpenAI Chat Completions types (subset we depend on)
// ---------------------------------------------------------------------------

interface OpenAIContentBlock {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentBlock[];
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  /** DeepSeek: disable thinking mode for faster responses */
  thinking?: { type: 'enabled' | 'disabled' };
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface OpenAIAssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIChoice {
  index: number;
  message: OpenAIAssistantMessage;
  finish_reason: string;
}

export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  error?: { message: string; type: string };
}

// ---------------------------------------------------------------------------
// ApiClient — thin OpenAI transport interface
// ---------------------------------------------------------------------------

export interface ApiClient {
  /** Send a raw OpenAI Chat Completions request. */
  chatCompletions(request: OpenAIChatRequest): Promise<OpenAIChatResponse>;
}

// ---------------------------------------------------------------------------
// ApiProxy — HTTP transport to llm-server
// ---------------------------------------------------------------------------

const TIMEOUTS = {
  llm: 60_000,
} as const;

const MAX_RETRIES = 2;

export class ApiProxy implements ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async chatCompletions(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    return this.requestWithRetry<OpenAIChatResponse>(
      '/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      TIMEOUTS.llm,
    );
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private async requestWithRetry<T>(
    path: string,
    options: RequestInit,
    timeout: number,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.request<T>(path, options, timeout);
      } catch (error) {
        // Only retry on network errors, not HTTP errors
        if (error instanceof ApiProxyError) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES) {
          await delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  private async request<T>(path: string, options: RequestInit, timeout: number): Promise<T> {
    const response = await this.fetchWithTimeout(path, timeout, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body?.error?.message ?? `HTTP ${response.status}`;
      throw new ApiProxyError(message, response.status);
    }

    return body as T;
  }

  private async fetchWithTimeout(
    path: string,
    timeout: number,
    options: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ---------------------------------------------------------------------------
// ApiProxyError
// ---------------------------------------------------------------------------

export class ApiProxyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiProxyError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
