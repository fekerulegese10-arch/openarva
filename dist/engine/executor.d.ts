export interface TerminalExecutionOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    maxOutputBytes?: number;
    shell?: boolean;
    repair?: (failure: TerminalAttempt) => Promise<{
        command?: string;
        args?: string[];
    } | void>;
}
export interface TerminalAttempt {
    attempt: number;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    durationMs: number;
}
export interface TerminalExecutionResult {
    command: string;
    args: string[];
    ok: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    attempts: number;
    history: TerminalAttempt[];
}
export declare function executeCommandDetailed(command: string, args?: string[], options?: TerminalExecutionOptions): Promise<TerminalExecutionResult>;
export declare function executeCommandText(command: string, args?: string[], options?: TerminalExecutionOptions): Promise<string>;
export declare function executeCommand(command: string, args?: string[], options?: TerminalExecutionOptions): Promise<string>;
