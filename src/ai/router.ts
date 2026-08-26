// These providers are optional peer dependencies in deployments that only use
// the local engine. Keep the router type-checkable in those deployments.
// @ts-expect-error Optional dependency; install @ai-sdk/openai to enable it.
import { createOpenAI } from '@ai-sdk/openai';
// @ts-expect-error Optional dependency; install @ai-sdk/anthropic to enable it.
import { createAnthropic } from '@ai-sdk/anthropic';

// Local AI Endpoint (Ollama / LM Studio)
const localEngine = createOpenAI({
  baseURL: process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1',
  apiKey: 'local-key',
});

export const OpenArvaRouter = {
  // Cloud Providers
  // Use Google's OpenAI-compatible endpoint to avoid requiring @ai-sdk/google.
  gemini: createOpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY,
  }),
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  groq: createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY }),
  grok: createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY }),
  kimi: createOpenAI({ baseURL: 'https://api.moonshot.cn/v1', apiKey: process.env.KIMI_API_KEY }),
  mistral: createOpenAI({ baseURL: 'https://api.mistral.ai/v1', apiKey: process.env.MISTRAL_API_KEY }),

  // Local AI Engine (Llama 3, Qwen 2.5, DeepSeek-R1, Gemma 2, Phi-4)
  local: (modelName: string) => localEngine(modelName),

  // Smart Model Selection for Task Execution
  selectModel(taskType: string) {
    switch (taskType) {
      case 'coding':
      case 'software_engineering':
        return this.groq('llama-3.3-70b-versatile');
      case 'deep_reasoning':
      case 'accounting':
      case 'engineering':
        return this.local('deepseek-r1');
      case 'multilingual_translation':
      case 'bureaucracy_documents':
      case 'agriculture_research':
        return this.gemini('gemini-3.6-flash');
      default:
        return this.openai('gpt-4o');
    }
  }
};