import { OpenArvaRouter } from '../ai/router.js';
import { routeAiCompletion } from '../ai/providers.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import { addTask, confirmExecutionApproval, updateTaskStatus } from '../commands/state.js';
const execAsync = promisify(exec);
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
    systemPersona = `
    You are OpenArva — Your Personal Autonomous AI Assistant (v17.6.14)
    
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
                console.log(`[Executor] Running command: ${cmd}`);
                const result = await execAsync(cmd);
                updateTaskStatus(taskRecord.id, 'completed');
                return `✅ Command executed successfully:\n${result.stdout || result}`;
            }
            const timestamp = new Date().toISOString();
            const aiResult = await routeAiCompletion(task.instruction);
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
    isSuspiciousCommand(cmd) {
        const dangerousPatterns = [
            /rm\s+-rf\s+\//, // rm -rf /
            /format\s+[A-Z]:/i, // format C:
            /del\s+\/s\s+\/q/, // Windows delete all
        ];
        return dangerousPatterns.some(pattern => pattern.test(cmd));
    }
}
