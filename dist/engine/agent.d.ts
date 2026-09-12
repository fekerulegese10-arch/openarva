export interface AgentTask {
    domain: 'coding' | 'agriculture' | 'accounting' | 'documents' | 'research' | 'engineering' | 'medicine';
    instruction: string;
}
export declare class OpenArvaAgent {
    private memory;
    private systemPersona;
    executeTask(task: AgentTask): Promise<string>;
    respond(prompt: string, domain?: AgentTask['domain']): Promise<string>;
    private isSuspiciousCommand;
}
