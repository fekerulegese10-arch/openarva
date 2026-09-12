export type NativeToolName = 'system.status' | 'system.processes' | 'system.screenshot' | 'system.exec' | 'workspace.search' | 'workspace.edit' | 'workspace.exec';
export interface AgentTask {
    domain: 'coding' | 'agriculture' | 'accounting' | 'documents' | 'research' | 'engineering' | 'medicine';
    instruction: string;
}
export declare class OpenArvaAgent {
    private memory;
    private systemPersona;
    executeTask(task: AgentTask): Promise<string>;
    executeNativeTool(name: NativeToolName | undefined, input: Record<string, unknown>): Promise<string | boolean | string[] | import("./executor.js").TerminalExecutionResult | {
        ok: boolean;
        cancelled: boolean;
        stdout: string;
        stderr: string;
    } | import("../tools/system.js").ProcessInfo[] | {
        platform: NodeJS.Platform;
        release: string;
        node: string;
        user: string;
        memory: {
            total: number;
            free: number;
        };
        uptimeSeconds: number;
    }>;
    respond(prompt: string, domain?: AgentTask['domain']): Promise<string>;
    private isSuspiciousCommand;
}
