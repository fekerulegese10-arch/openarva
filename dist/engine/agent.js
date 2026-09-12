import { OpenArvaRouter } from '../ai/router.js';
import { routeAiCompletion } from '../ai/providers.js';
import chalk from 'chalk';
import { addTask, confirmExecutionApproval, updateTaskStatus } from '../commands/state.js';
import { OpenArvaMemory } from '../db/memory.js';
import { parseSafeCommand, runSandboxedCommandDetailed, validateSafeCommand } from './sandbox.js';
import { executeSystemCommand, getSystemStatus, inspectProcesses, takeScreenshot } from '../tools/system.js';
import { editWorkspaceFile, executeWorkspaceCommand, searchWorkspace } from '../tools/workspace.js';
import { indexMemoryDocument, searchMemory } from '../memory/vectorStore.js';
function renderDiffPreview(before, after) {
    const beforeLines = before.split(/\r?\n/);
    const afterLines = after.split(/\r?\n/);
    const max = Math.max(beforeLines.length, afterLines.length);
    console.log(chalk.cyan.bold('Diff Preview'));
    for (let i = 0; i < max; i += 1) {
        const oldLine = beforeLines[i] ?? '';
        const newLine = afterLines[i] ?? '';
        if (oldLine === newLine) {
            console.log(chalk.dim(`  ${i + 1}  ${oldLine}`));
            continue;
        }
        if (oldLine && newLine) {
            console.log(chalk.red(`- ${i + 1}  ${oldLine}`));
            console.log(chalk.green(`+ ${i + 1}  ${newLine}`));
        }
        else if (newLine) {
            console.log(chalk.green(`+ ${i + 1}  ${newLine}`));
        }
        else {
            console.log(chalk.red(`- ${i + 1}  ${oldLine}`));
        }
    }
}
export class OpenArvaAgent {
    memory = new OpenArvaMemory();
    systemPersona = `
    You are OpenArva — Your Personal Autonomous AI Assistant (v17.6.21)
    
    CORE CAPABILITIES:
    ✓ Autonomous Task Execution - Full-stack development, debugging, refactoring
    ✓ Multi-Domain Expertise - Coding, Finance, Medicine, Agriculture, Engineering, Legal
    ✓ Real-Time Learning - Learns from user interactions to improve responses
    ✓ Secure Execution - Sandboxed command execution with safety checks
    ✓ Cross-Platform Gateway - Telegram, WhatsApp, Discord, Web, CLI, SMS
    ✓ Advanced Reasoning - Multi-step problem solving with reasoning models
    ✓ Document Intelligence - PDF/Excel generation, form processing, analysis
    ✓ Multilingual - Full support for English, Amharic, and 100+ languages
    
    PERSONALITY:
    - Always professional, efficient, and user-focused
    - Explains complex concepts clearly
    - Provides actionable solutions with explanations
    - Proactively suggests improvements and optimizations
    - Learns your preferences and adapts communication style
    - Honest about limitations while maximizing capabilities
  `;
    async executeTask(task) {
        const taskRecord = addTask({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: task.instruction.slice(0, 80),
            description: task.instruction,
            status: 'in_progress',
            metadata: { domain: task.domain },
        });
        console.log(`[OpenArva Personal AI] Processing task for domain: ${task.domain}`);
        console.log(`Instruction: ${task.instruction.substring(0, 100)}...`);
        const selectedProvider = OpenArvaRouter.selectModel(task.domain);
        console.log(`[Router] Selected: ${selectedProvider}`);
        try {
            if (task.instruction.startsWith('TOOL:')) {
                const call = JSON.parse(task.instruction.slice('TOOL:'.length).trim());
                const result = await this.executeNativeTool(call.name, call.input || {});
                updateTaskStatus(taskRecord.id, 'completed');
                return JSON.stringify(result, null, 2);
            }
            if (task.instruction.startsWith('EXEC_CMD:')) {
                const cmd = task.instruction.replace('EXEC_CMD:', '').trim();
                if (this.isSuspiciousCommand(cmd)) {
                    updateTaskStatus(taskRecord.id, 'failed');
                    return `⚠️ Security Alert: This command appears unsafe. Please review: ${cmd}`;
                }
                renderDiffPreview('', `Command: ${cmd}`);
                const approved = await confirmExecutionApproval(`run command: ${cmd}`);
                if (!approved) {
                    updateTaskStatus(taskRecord.id, 'failed');
                    return 'Execution cancelled by user.';
                }
                console.log(`[Executor] Running sandboxed command: ${cmd}`);
                const parsed = parseSafeCommand(cmd);
                const outputResult = await runSandboxedCommandDetailed(parsed.command, parsed.args, process.cwd(), 120_000, async (failure) => {
                    try {
                        const repairPrompt = `A command failed while operating the user's project. Return ONLY JSON with keys command and args, or {} if no safe repair is possible. Do not use shell operators.\nCommand: ${parsed.command} ${parsed.args.join(' ')}\nExit code: ${failure.exitCode}\nStderr:\n${failure.stderr.slice(-6000)}`;
                        const suggestion = await routeAiCompletion(repairPrompt);
                        const json = suggestion.match(/\{[\s\S]*\}/)?.[0];
                        if (!json)
                            return;
                        const repaired = JSON.parse(json);
                        if (typeof repaired.command !== 'string' || !Array.isArray(repaired.args) || !repaired.args.every((item) => typeof item === 'string'))
                            return;
                        validateSafeCommand(repaired.command, repaired.args);
                        return { command: repaired.command, args: repaired.args };
                    }
                    catch {
                        return;
                    }
                });
                if (!outputResult.ok)
                    throw new Error(`Command failed after ${outputResult.attempts} attempt(s): ${outputResult.stderr || outputResult.stdout}`);
                const output = outputResult.stdout || outputResult.stderr;
                updateTaskStatus(taskRecord.id, 'completed');
                return `✅ Command executed successfully:\n${output}`;
            }
            const timestamp = new Date().toISOString();
            const recentContext = this.memory.getRecentContext(8);
            const personalizedPrompt = [
                this.systemPersona.trim(),
                recentContext ? `[RECENT CONVERSATION]\n${recentContext}\n[/RECENT CONVERSATION]` : '',
                `[CURRENT TASK]\nDomain: ${task.domain}\nRequest: ${task.instruction}\n[/CURRENT TASK]`,
                'Respond directly with a practical answer. Be transparent about what you can and cannot do.',
            ].filter(Boolean).join('\n\n');
            this.memory.saveConversation('user', task.instruction);
            const aiResult = await routeAiCompletion(personalizedPrompt);
            this.memory.saveConversation('assistant', aiResult);
            renderDiffPreview('', aiResult);
            const approved = await confirmExecutionApproval(`execute task in ${task.domain}`);
            if (!approved) {
                updateTaskStatus(taskRecord.id, 'failed');
                return 'Preview approved? No action was taken.';
            }
            updateTaskStatus(taskRecord.id, 'completed');
            return `
🎯 OpenArva Autonomous Execution Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain: ${task.domain}
Model Used: ${selectedProvider}
Timestamp: ${timestamp}
Status: ✅ Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${aiResult}
      `;
        }
        catch (error) {
            updateTaskStatus(taskRecord.id, 'failed');
            return `
❌ Error During Execution
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain: ${task.domain}
Error: ${error.message}
Suggestion: Please verify your input and try again.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
        }
    }
    async executeNativeTool(name, input) {
        switch (name) {
            case 'system.status': return getSystemStatus();
            case 'system.processes': return inspectProcesses();
            case 'system.screenshot': return takeScreenshot(String(input.outputPath || 'openarva-screenshot.png'));
            case 'system.exec': return executeSystemCommand(String(input.command || ''), String(input.cwd || process.cwd()), Boolean(input.autoApprove));
            case 'workspace.search': return searchWorkspace(String(input.query || ''), String(input.cwd || process.cwd()));
            case 'workspace.edit': return editWorkspaceFile(String(input.path || ''), String(input.content || ''), String(input.cwd || process.cwd()), Boolean(input.autoApprove));
            case 'workspace.exec': return executeWorkspaceCommand(String(input.command || ''), String(input.cwd || process.cwd()), Boolean(input.autoApprove));
            default: throw new Error(`Unknown native tool: ${String(name)}`);
        }
    }
    async respond(prompt, domain = 'coding') {
        const recentContext = this.memory.getRecentContext(8);
        const retrieved = searchMemory(prompt, 5).filter((item) => item.score > 0).map((item) => `[${item.source}] ${item.text}`).join('\n');
        const personalizedPrompt = [
            this.systemPersona.trim(),
            recentContext ? `[RECENT CONVERSATION]\n${recentContext}\n[/RECENT CONVERSATION]` : '',
            retrieved ? `[RETRIEVED LOCAL MEMORY]\n${retrieved}\n[/RETRIEVED LOCAL MEMORY]` : '',
            `[CURRENT TASK]\nDomain: ${domain}\nRequest: ${prompt}\n[/CURRENT TASK]`,
            'Respond directly with a practical answer. Do not claim that files or commands were changed unless a tool actually performed that action.',
        ].filter(Boolean).join('\n\n');
        this.memory.saveConversation('user', prompt);
        const response = await routeAiCompletion(personalizedPrompt);
        this.memory.saveConversation('assistant', response);
        indexMemoryDocument({ id: `chat:${Date.now()}`, source: 'chat', text: `${prompt}\n${response}`, metadata: { domain } });
        return response;
    }
    isSuspiciousCommand(cmd) {
        const dangerousPatterns = [
            /rm\s+-rf\s+\//, // rm -rf /
            /format\s+[A-Z]:/i, // format C:
            /del\s+\/s\s+\/q/, // Windows delete all
        ];
        return dangerousPatterns.some(pattern => pattern.test(cmd));
    }
}
