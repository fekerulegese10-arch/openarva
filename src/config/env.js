import dotenv from 'dotenv';

dotenv.config();

export const supportedProviders = [
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'deepseek',
  'mistral',
  'xai',
  'moonshot',
  'ollama',
  'lmstudio',
  'local',
];

export const providerModelDefaults = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
  anthropic: ['claude-3-5-sonnet', 'claude-3-7-sonnet', 'claude-3-haiku'],
  gemini: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b', 'gemma2-9b-it'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  mistral: ['mistral-large-latest', 'codestral-latest', 'pixtral-large-latest'],
  xai: ['grok-beta', 'grok-2'],
  moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  ollama: ['llama3.1', 'qwen2.5-coder', 'deepseek-r1', 'mistral'],
  lmstudio: ['local-model', 'deepseek-r1', 'qwen2.5-coder'],
  local: ['llama3.1', 'qwen2.5-coder', 'deepseek-r1'],
};

export const defaultBaseUrls = {
  openai: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  anthropic: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  gemini: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  deepseek: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  mistral: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
  xai: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
  moonshot: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
  ollama: process.env.OLLAMA_BASE_URL || process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1',
  lmstudio: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
  local: process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1',
};

export function normalizeProvider(provider = process.env.OPENARVA_PROVIDER || 'openai') {
  const normalized = String(provider || 'openai').trim().toLowerCase();
  if (normalized === 'deepseek-r1' || normalized === 'deepseek') return 'deepseek';
  if (normalized === 'ollama' || normalized === 'local-ai') return 'ollama';
  if (normalized === 'lm studio' || normalized === 'lmstudio') return 'lmstudio';
  if (normalized === 'local') return 'local';
  return supportedProviders.includes(normalized) ? normalized : 'openai';
}

export function getProviderConfig(provider = process.env.OPENARVA_PROVIDER || 'openai', model = process.env.OPENARVA_MODEL) {
  const resolvedProvider = normalizeProvider(provider);
  const defaultModel = model || process.env[`${resolvedProvider.toUpperCase()}_MODEL`] || providerModelDefaults[resolvedProvider]?.[0] || 'gpt-4o';

  return {
    provider: resolvedProvider,
    model: defaultModel,
    apiKey: process.env[`${resolvedProvider.toUpperCase()}_API_KEY`] || '',
    baseUrl: process.env[`${resolvedProvider.toUpperCase()}_BASE_URL`] || defaultBaseUrls[resolvedProvider] || '',
    defaultModels: providerModelDefaults[resolvedProvider] || [],
  };
}

export const config = {
  openarvaProvider: normalizeProvider(process.env.OPENARVA_PROVIDER || 'openai'),
  defaultModel: process.env.OPENARVA_MODEL || '',
  supportedProviders,
  providerModelDefaults,
  defaultBaseUrls,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  mistralApiKey: process.env.MISTRAL_API_KEY || '',
  xaiApiKey: process.env.XAI_API_KEY || '',
  moonshotApiKey: process.env.MOONSHOT_API_KEY || '',
  ollamaApiKey: process.env.OLLAMA_API_KEY || 'ollama',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  port: Number(process.env.PORT || process.env.OPENARVA_PORT || 3000),
  gatewayPort: Number(process.env.OPENARVA_PORT || 18789),
  authSecret: process.env.OPENARVA_AUTH_KEY || '',
  localAiBaseUrl: process.env.LOCAL_AI_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  lmStudioBaseUrl: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
};

export default config;
