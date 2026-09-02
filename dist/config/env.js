import dotenv from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
dotenv.config();
export const supportedProviders = [
    'openai',
    'anthropic',
    'gemini',
    'groq',
    'deepseek',
    'ollama',
    'local',
    'lmstudio',
];
export const providerModelDefaults = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
    anthropic: ['claude-3-5-sonnet', 'claude-3-7-sonnet', 'claude-3-haiku'],
    gemini: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b', 'gemma2-9b-it'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    ollama: ['llama3.1', 'qwen2.5-coder', 'deepseek-r1', 'mistral'],
    local: ['llama3.1', 'qwen2.5-coder', 'deepseek-r1'],
    lmstudio: ['local-model', 'qwen2.5-coder', 'deepseek-r1'],
};
export const defaultBaseUrls = {
    openai: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    anthropic: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    gemini: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
    groq: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    deepseek: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    ollama: process.env.OLLAMA_BASE_URL || process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1',
    local: process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1',
    lmstudio: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
};
export function normalizeProvider(provider = process.env.OPENARVA_PROVIDER || 'openai') {
    const normalized = String(provider || 'openai').trim().toLowerCase();
    if (normalized === 'deepseek-r1' || normalized === 'deepseek')
        return 'deepseek';
    if (normalized === 'ollama' || normalized === 'local-ai')
        return 'ollama';
    if (normalized === 'lm studio' || normalized === 'lmstudio')
        return 'lmstudio';
    if (normalized === 'local')
        return 'local';
    if (normalized === 'claude')
        return 'anthropic';
    return supportedProviders.includes(normalized) ? normalized : 'openai';
}
export function getProviderConfig(provider = process.env.OPENARVA_PROVIDER || 'openai', model) {
    const resolvedProvider = normalizeProvider(provider);
    const resolvedModel = model || process.env.OPENARVA_MODEL || providerModelDefaults[resolvedProvider]?.[0] || 'gpt-4o';
    return {
        provider: resolvedProvider,
        model: resolvedModel,
        apiKey: process.env[`${resolvedProvider.toUpperCase()}_API_KEY`] || '',
        baseUrl: process.env[`${resolvedProvider.toUpperCase()}_BASE_URL`] || defaultBaseUrls[resolvedProvider] || '',
        defaultModels: providerModelDefaults[resolvedProvider] || [],
    };
}
export function getOpenArvaConfigPath() {
    const homeConfig = join(homedir(), '.openarva', 'config.json');
    const workspaceConfig = join(process.cwd(), '.openarva', 'config.json');
    if (existsSync(homeConfig)) {
        return homeConfig;
    }
    if (existsSync(workspaceConfig)) {
        return workspaceConfig;
    }
    return homeConfig;
}
export function loadOpenArvaConfig() {
    const configPath = getOpenArvaConfigPath();
    if (!existsSync(configPath)) {
        return {};
    }
    try {
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    catch {
        return {};
    }
}
export function saveOpenArvaConfig(config) {
    const configPath = getOpenArvaConfigPath();
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
        ...config,
        privacy: config.privacy || { localOnly: false, redactPii: true, auditLog: true },
    }, null, 2), 'utf8');
}
export const OpenArvaConfig = {
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
    ollamaApiKey: process.env.OLLAMA_API_KEY || 'ollama',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
    gatewayPort: parseInt(process.env.OPENARVA_PORT || '18789', 10),
    localAiBaseUrl: process.env.LOCAL_AI_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    lmStudioBaseUrl: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
    authSecret: process.env.OPENARVA_AUTH_KEY || '',
    organizationName: process.env.OPENARVA_ORGANIZATION || 'unknown-org',
    developerId: process.env.OPENARVA_DEVELOPER_ID || 'unknown-developer',
    privacy: {
        localOnly: Boolean(process.env.OPENARVA_LOCAL_ONLY === 'true' || process.env.OPENARVA_PRIVACY_LOCAL_ONLY === 'true'),
        redactPii: process.env.OPENARVA_REDACT_PII !== 'false',
        auditLog: process.env.OPENARVA_AUDIT_LOG !== 'false',
        userIdentity: process.env.OPENARVA_USER || 'unknown-user',
    },
};
export const OpenArvaLegacyConfig = OpenArvaConfig;
