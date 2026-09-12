export declare const supportedProviders: readonly ["openai", "anthropic", "gemini", "groq", "deepseek", "ollama", "local", "lmstudio"];
export declare const providerModelDefaults: Record<string, string[]>;
export declare const defaultBaseUrls: Record<string, string>;
export type OpenArvaProviderName = (typeof supportedProviders)[number];
export interface OpenArvaPrivacyConfig {
    localOnly?: boolean;
    redactPii?: boolean;
    auditLog?: boolean;
    userIdentity?: string;
}
export interface OpenArvaJsonConfig {
    provider: OpenArvaProviderName;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    organizationName?: string;
    developerId?: string;
    localAi?: {
        enabled?: boolean;
        baseUrl?: string;
        model?: string;
    };
    telegramBotToken?: string;
    repositoryPaths?: string[];
    privacy?: OpenArvaPrivacyConfig;
}
export declare function normalizeProvider(provider?: string): "openai" | "anthropic" | "gemini" | "groq" | "deepseek" | "ollama" | "local" | "lmstudio";
export declare function getProviderConfig(provider?: string, model?: string): {
    provider: "openai" | "anthropic" | "gemini" | "groq" | "deepseek" | "ollama" | "local" | "lmstudio";
    model: string;
    apiKey: string;
    baseUrl: string;
    defaultModels: string[];
};
export declare function getOpenArvaConfigPath(): string;
export declare function loadOpenArvaConfig(): Partial<OpenArvaJsonConfig>;
export declare function saveOpenArvaConfig(config: OpenArvaJsonConfig): void;
export declare const OpenArvaConfig: {
    openarvaProvider: "openai" | "anthropic" | "gemini" | "groq" | "deepseek" | "ollama" | "local" | "lmstudio";
    defaultModel: string;
    supportedProviders: readonly ["openai", "anthropic", "gemini", "groq", "deepseek", "ollama", "local", "lmstudio"];
    providerModelDefaults: Record<string, string[]>;
    defaultBaseUrls: Record<string, string>;
    geminiApiKey: string;
    openaiApiKey: string;
    anthropicApiKey: string;
    groqApiKey: string;
    deepseekApiKey: string;
    ollamaApiKey: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioWhatsAppNumber: string;
    gatewayPort: number;
    localAiBaseUrl: string;
    lmStudioBaseUrl: string;
    authSecret: string;
    organizationName: string;
    developerId: string;
    privacy: {
        localOnly: boolean;
        redactPii: boolean;
        auditLog: boolean;
        userIdentity: string;
    };
};
export declare const OpenArvaLegacyConfig: {
    openarvaProvider: "openai" | "anthropic" | "gemini" | "groq" | "deepseek" | "ollama" | "local" | "lmstudio";
    defaultModel: string;
    supportedProviders: readonly ["openai", "anthropic", "gemini", "groq", "deepseek", "ollama", "local", "lmstudio"];
    providerModelDefaults: Record<string, string[]>;
    defaultBaseUrls: Record<string, string>;
    geminiApiKey: string;
    openaiApiKey: string;
    anthropicApiKey: string;
    groqApiKey: string;
    deepseekApiKey: string;
    ollamaApiKey: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioWhatsAppNumber: string;
    gatewayPort: number;
    localAiBaseUrl: string;
    lmStudioBaseUrl: string;
    authSecret: string;
    organizationName: string;
    developerId: string;
    privacy: {
        localOnly: boolean;
        redactPii: boolean;
        auditLog: boolean;
        userIdentity: string;
    };
};
