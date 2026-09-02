import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { recordAudit, resolveEffectiveProvider, sanitizePromptForTransmission } from '../security/privacy.js';
import { retrieveRelevantMemory } from '../commands/learn.js';
export const AI_PROVIDER_OPTIONS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'groq', label: 'Groq' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'ollama', label: 'Ollama / Local AI' },
    { value: 'local', label: 'Local AI (generic)' },
    { value: 'lmstudio', label: 'LM Studio' },
];
export const AI_MODEL_DEFAULTS = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
    anthropic: ['claude-3-5-sonnet', 'claude-3-7-sonnet', 'claude-3-haiku'],
    gemini: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b', 'gemma2-9b-it'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    ollama: ['llama3.1', 'qwen2.5-coder', 'deepseek-r1', 'mistral'],
    local: ['llama3.1', 'qwen2.5-coder', 'deepseek-r1'],
    lmstudio: ['local-model', 'qwen2.5-coder', 'deepseek-r1'],
};
export function normalizeProvider(provider) {
    const value = provider.trim().toLowerCase();
    switch (value) {
        case 'claude':
        case 'anthropic':
            return 'anthropic';
        case 'google':
        case 'gemini':
            return 'gemini';
        case 'openai':
            return 'openai';
        case 'groq':
            return 'groq';
        case 'deepseek':
        case 'deepseek-r1':
            return 'deepseek';
        case 'ollama':
        case 'local-ai':
            return 'ollama';
        case 'lmstudio':
        case 'lm studio':
            return 'lmstudio';
        case 'local':
            return 'local';
        default:
            return 'openai';
    }
}
function getEnvValue(key) {
    return process.env[key] || '';
}
export function getProviderConfig(provider, model) {
    const selectedProvider = normalizeProvider(provider || process.env.OPENARVA_PROVIDER || 'openai');
    const defaultModel = model || process.env.OPENARVA_MODEL || AI_MODEL_DEFAULTS[selectedProvider][0] || 'gpt-4o';
    switch (selectedProvider) {
        case 'anthropic':
            return {
                provider: 'anthropic',
                model: defaultModel,
                apiKey: getEnvValue('ANTHROPIC_API_KEY'),
            };
        case 'gemini':
            return {
                provider: 'gemini',
                model: defaultModel,
                apiKey: getEnvValue('GEMINI_API_KEY'),
            };
        case 'groq':
            return {
                provider: 'groq',
                model: defaultModel,
                apiKey: getEnvValue('GROQ_API_KEY'),
                baseUrl: getEnvValue('GROQ_BASE_URL') || 'https://api.groq.com/openai/v1',
            };
        case 'deepseek':
            return {
                provider: 'deepseek',
                model: defaultModel,
                apiKey: getEnvValue('DEEPSEEK_API_KEY'),
                baseUrl: getEnvValue('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1',
            };
        case 'ollama':
            return {
                provider: 'ollama',
                model: defaultModel,
                baseUrl: getEnvValue('LOCAL_AI_BASE_URL') || 'http://localhost:11434/v1',
                apiKey: getEnvValue('OLLAMA_API_KEY') || 'ollama',
            };
        case 'local':
            return {
                provider: 'local',
                model: defaultModel,
                baseUrl: getEnvValue('LOCAL_AI_BASE_URL') || 'http://localhost:11434/v1',
                apiKey: getEnvValue('OLLAMA_API_KEY') || 'ollama',
            };
        case 'lmstudio':
            return {
                provider: 'lmstudio',
                model: defaultModel,
                baseUrl: getEnvValue('LMSTUDIO_BASE_URL') || 'http://localhost:1234/v1',
                apiKey: 'lmstudio',
            };
        case 'openai':
        default:
            return {
                provider: 'openai',
                model: defaultModel,
                apiKey: getEnvValue('OPENAI_API_KEY'),
                baseUrl: getEnvValue('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
            };
    }
}
export function getOpenArvaConfigPath() {
    return join(process.cwd(), '.openarva', 'config.json');
}
export function loadOpenArvaConfig() {
    const configPath = getOpenArvaConfigPath();
    if (!existsSync(configPath)) {
        return {};
    }
    try {
        const raw = readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed;
    }
    catch {
        return {};
    }
}
export function saveOpenArvaConfig(config) {
    const configPath = getOpenArvaConfigPath();
    const dir = dirname(configPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}
export function createModelProvider(config) {
    const provider = normalizeProvider(config.provider || 'openai');
    const modelName = config.model || AI_MODEL_DEFAULTS[provider][0] || 'gpt-4o';
    switch (provider) {
        case 'anthropic':
            return createAnthropic({ apiKey: config.apiKey || getEnvValue('ANTHROPIC_API_KEY') })(modelName);
        case 'gemini':
            return createGoogleGenerativeAI({ apiKey: config.apiKey || getEnvValue('GEMINI_API_KEY') })(modelName);
        case 'groq':
            return createOpenAI({
                apiKey: config.apiKey || getEnvValue('GROQ_API_KEY'),
                baseURL: config.baseUrl || getEnvValue('GROQ_BASE_URL') || 'https://api.groq.com/openai/v1',
            })(modelName);
        case 'deepseek':
            return createOpenAI({
                apiKey: config.apiKey || getEnvValue('DEEPSEEK_API_KEY'),
                baseURL: config.baseUrl || getEnvValue('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1',
            })(modelName);
        case 'ollama':
        case 'local':
            return createOpenAI({
                apiKey: config.apiKey || getEnvValue('OLLAMA_API_KEY') || 'ollama',
                baseURL: config.baseUrl || getEnvValue('LOCAL_AI_BASE_URL') || 'http://localhost:11434/v1',
            })(modelName);
        case 'lmstudio':
            return createOpenAI({
                apiKey: config.apiKey || 'lmstudio',
                baseURL: config.baseUrl || getEnvValue('LMSTUDIO_BASE_URL') || 'http://localhost:1234/v1',
            })(modelName);
        case 'openai':
        default:
            return createOpenAI({
                apiKey: config.apiKey || getEnvValue('OPENAI_API_KEY'),
                baseURL: config.baseUrl || getEnvValue('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
            })(modelName);
    }
}
export async function routeAiCompletion(prompt, providerOverride, modelOverride) {
    const persisted = loadOpenArvaConfig();
    const effectiveProvider = resolveEffectiveProvider(providerOverride || persisted.provider || process.env.OPENARVA_PROVIDER);
    const relevantMemory = retrieveRelevantMemory(prompt, 3);
    const memoryContext = relevantMemory.length
        ? `\n\n[LOCAL MEMORY CONTEXT]\n${relevantMemory.map((item) => `- ${item.source}: ${item.text.substring(0, 600)}`).join('\n')}\n[/LOCAL MEMORY CONTEXT]`
        : '';
    const sanitizedPrompt = sanitizePromptForTransmission(`${prompt}${memoryContext}`, effectiveProvider);
    const defaultConfig = getProviderConfig(effectiveProvider, modelOverride || persisted.model || process.env.OPENARVA_MODEL);
    const candidateProviders = [
        normalizeProvider(effectiveProvider),
        'openai',
        'anthropic',
        'gemini',
        'groq',
        'deepseek',
        'ollama',
        'local',
        'lmstudio',
    ].filter((value, index, array) => array.indexOf(value) === index);
    let lastError;
    for (const candidate of candidateProviders) {
        try {
            recordAudit('ai_route_attempt', `Attempting provider ${candidate} for prompt`, process.env.OPENARVA_USER || persisted.privacy?.userIdentity || 'unknown-user');
            const model = createModelProvider({
                provider: candidate,
                model: modelOverride || persisted.model || defaultConfig.model,
                apiKey: persisted.apiKey || defaultConfig.apiKey,
                baseUrl: persisted.baseUrl || defaultConfig.baseUrl,
            });
            const result = await generateText({
                model,
                prompt: sanitizedPrompt,
            });
            recordAudit('ai_route_success', `Resolved prompt via ${candidate}`, process.env.OPENARVA_USER || persisted.privacy?.userIdentity || 'unknown-user');
            return result.text;
        }
        catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);
            recordAudit('ai_route_failure', `Provider ${candidate} failed: ${message}`, process.env.OPENARVA_USER || persisted.privacy?.userIdentity || 'unknown-user');
            if (/api key|unauthorized|401|403|429|rate limit|ECONNREFUSED|fetch failed|ENOTFOUND/i.test(message)) {
                continue;
            }
        }
    }
    const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown provider failure';
    if (/api key|unauthorized|401|403|429|rate limit|ECONNREFUSED|fetch failed|ENOTFOUND/i.test(errorMessage)) {
        return `OpenArva demo mode is active. The configured AI provider is unavailable right now, so this is a safe dry-run preview. Prompt received: "${sanitizedPrompt}"`;
    }
    throw new Error(lastError instanceof Error
        ? `All AI providers failed while routing the request. Last error: ${lastError.message}`
        : 'All AI providers failed while routing the request.');
}
export function getModelProvider(providerName, modelName) {
    return createModelProvider({
        provider: normalizeProvider(providerName),
        model: modelName,
        apiKey: process.env[`${normalizeProvider(providerName).toUpperCase()}_API_KEY`] || '',
    });
}
