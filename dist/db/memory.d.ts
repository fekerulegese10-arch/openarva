export declare class OpenArvaMemory {
    private dbPath;
    private conversationHistory;
    private userPreferences;
    private learningMetrics;
    private states;
    constructor();
    private loadMemory;
    saveConversation(role: 'user' | 'assistant', content: string): void;
    recordUserPreference(key: string, value: any, importance?: number): void;
    getUserPreference(key: string): any;
    recordMetric(metricName: string, value: number): void;
    getRecentContext(limit?: number): string;
    saveState(key: string, data: any, importance?: number): void;
    getState(key: string): any;
    private persist;
    pruneOldMemories(daysOld?: number): void;
    getMemoryStats(): {
        conversations: number;
        preferences: number;
        metrics: number;
        dbSize: number;
    };
}
