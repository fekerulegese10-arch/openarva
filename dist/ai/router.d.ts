type ModelFactory = (modelName: string) => any;
interface OpenArvaRouterType {
    gemini: ModelFactory;
    openai: ModelFactory;
    anthropic: ModelFactory;
    groq: ModelFactory;
    grok: ModelFactory;
    kimi: ModelFactory;
    mistral: ModelFactory;
    local: ModelFactory;
    selectModel: (taskType: string) => any;
}
export declare const OpenArvaRouter: OpenArvaRouterType;
export {};
