// The package is available at runtime, but its type declarations may not be
// discoverable in projects that use a non-standard module resolution setup.
import { createOpenAI as createOpenAIProvider } from '@ai-sdk/openai';
const createOpenAI = (options) => createOpenAIProvider({
    baseURL: options.baseURL || 'https://api.openai.com/v1',
    apiKey: options.apiKey,
});
const createGemini = () => createOpenAI({
    name: 'gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY,
});
export function getModelProvider(providerName, modelName) {
    const env = process.env;
    switch (providerName.toLowerCase()) {
        // Cloud AI Providers
        case 'gemini':
            return createGemini()(modelName || 'gemini-3.6-flash');
        case 'openai':
            return createOpenAI({ apiKey: env.OPENAI_API_KEY })(modelName || 'gpt-4o');
        case 'groq':
            return createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.GROQ_API_KEY })(modelName || 'llama-3.3-70b-versatile');
        case 'grok':
            return createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: env.XAI_API_KEY })(modelName || 'grok-beta');
        case 'mistral':
            return createOpenAI({ baseURL: 'https://api.mistral.ai/v1', apiKey: env.MISTRAL_API_KEY })(modelName || 'mistral-large-latest');
        case 'kimi':
            return createOpenAI({ baseURL: 'https://api.moonshot.cn/v1', apiKey: env.MOONSHOT_API_KEY })(modelName || 'moonshot-v1-8k');
        // Local AI Engine Providers (LM Studio, Ollama, vLLM, LocalAI)
        case 'local':
        case 'ollama':
            return createOpenAI({
                baseURL: env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1',
                apiKey: 'ollama'
            })(modelName || 'qwen2.5-coder');
        case 'lmstudio':
            return createOpenAI({
                baseURL: env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
                apiKey: 'lmstudio'
            })(modelName || 'deepseek-r1-distill-qwen-14b');
        default:
            return createGemini()('gemini-3.6-flash');
    }
}
