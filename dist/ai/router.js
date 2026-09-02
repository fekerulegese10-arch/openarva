// These providers are optional peer dependencies in deployments that only use
// the local engine. Keep the router type-checkable in those deployments.
import { createOpenAI } from '@ai-sdk/openai';
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
    local: (modelName) => localEngine(modelName),
    // Advanced Model Selection for Task Execution with Performance Optimization
    selectModel(taskType) {
        // Priority: Use most capable model for best results
        // Fallback: Use faster models for high-volume tasks
        switch (taskType) {
            case 'coding':
            case 'software_engineering':
                // Best: Groq Llama for fast, accurate code
                return this.groq('llama-3.3-70b-versatile');
            case 'deep_reasoning':
            case 'complex_analysis':
            case 'engineering':
                // Best: DeepSeek-R1 for advanced reasoning
                return this.local('deepseek-r1');
            case 'accounting':
            case 'financial_analysis':
                // Best: Claude 3.5 Sonnet for financial accuracy
                return this.anthropic('claude-3-5-sonnet-20241022');
            case 'medicine':
            case 'medical_research':
                // Best: GPT-4o for medical knowledge
                return this.openai('gpt-4o');
            case 'multilingual_translation':
            case 'language_processing':
                // Best: Gemini for multilingual support
                return this.gemini('gemini-2.0-flash');
            case 'agriculture':
            case 'agriculture_research':
                // Specialized: Gemini for domain knowledge
                return this.gemini('gemini-3.1-pro');
            case 'bureaucracy_documents':
            case 'documents':
            case 'legal':
                // Best: Claude for document precision
                return this.anthropic('claude-3-5-sonnet-20241022');
            case 'research':
                // Best: GPT-4o for research quality
                return this.openai('gpt-4o');
            default:
                // Fallback: Most capable general-purpose model
                return this.openai('gpt-4o');
        }
    }
};
