import type { ApiClient, OpenAIChatRequest, OpenAIChatResponse } from './api-proxy';

const MOCK_RECIPE_ARGS = JSON.stringify({
  name: '番茄炒蛋',
  ingredients: [
    { name: '番茄', amount: '2个' },
    { name: '鸡蛋', amount: '3个' },
    { name: '葱', amount: '适量' },
    { name: '盐', amount: '适量' },
    { name: '糖', amount: '少许' },
  ],
  steps: [
    { text: '番茄切块，鸡蛋打散备用', tag: 'instant' },
    { text: '热锅凉油，倒入蛋液翻炒至凝固', tag: 'wait_user' },
    { text: '加入番茄块翻炒出汁', tag: 'instant' },
    { text: '加入盐和糖调味，撒上葱花', tag: 'instant' },
    { text: '小火炖煮3分钟让味道融合', tag: 'wait_timer', duration_seconds: 180 },
  ],
});

/**
 * Detect whether the request is a recipe parsing call.
 * Looks for the `parse_recipe` function name in the tools array.
 */
function isParseRecipeRequest(req: OpenAIChatRequest): boolean {
  if (!req.tools || req.tools.length === 0) return false;
  return req.tools.some(tool => tool.type === 'function' && tool.function?.name === 'parse_recipe');
}

/**
 * Creates a mock API client for development/testing.
 * Returns realistic fake OpenAI-format responses without any network calls.
 */
export function createMockApiProxy(): ApiClient {
  return {
    async chatCompletions(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
      await delay(300);

      const now = Math.floor(Date.now() / 1000);
      const model = request.model || 'deepseek-v4-flash';

      if (isParseRecipeRequest(request)) {
        return {
          id: 'chatcmpl-mock-parse',
          object: 'chat.completion',
          created: now,
          model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_mock_parse',
                    type: 'function',
                    function: {
                      name: 'parse_recipe',
                      arguments: MOCK_RECIPE_ARGS,
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        };
      }

      return {
        id: 'chatcmpl-mock-ask',
        object: 'chat.completion',
        created: now,
        model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '保持中火翻炒，注意不要糊锅。',
            },
            finish_reason: 'stop',
          },
        ],
      };
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
