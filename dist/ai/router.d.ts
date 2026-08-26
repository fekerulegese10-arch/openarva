export declare const OpenArvaRouter: {
    gemini: any;
    openai: any;
    anthropic: any;
    groq: any;
    grok: any;
    kimi: any;
    mistral: any;
    local: (modelName: string) => any;
    selectModel(taskType: string): any;
};
