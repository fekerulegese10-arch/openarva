export declare function validateSafeCommand(command: string, args?: string[]): {
    executableName: string;
    fullCommand: string;
};
export declare function runSandboxedCommandDetailed(command: string, args: string[], cwd?: string, timeout?: number, repair?: (failure: import('./executor.js').TerminalAttempt) => Promise<{
    command?: string;
    args?: string[];
} | void>): Promise<import("./executor.js").TerminalExecutionResult>;
export declare function runSandboxedCommand(command: string, args: string[], cwd?: string, timeout?: number): Promise<string>;
export declare function parseSafeCommand(input: string): {
    command: string;
    args: string[];
};
