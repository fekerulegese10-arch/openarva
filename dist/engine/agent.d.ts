export interface AgentTask {
    domain: 'coding' | 'agriculture' | 'accounting' | 'documents' | 'research' | 'engineering' | 'medicine';
    instruction: string;
}
export declare class OpenArvaAgent {
    private systemPersona;
    executeTask(task: AgentTask): Promise<string>;
    private isSuspiciousCommand;
}
