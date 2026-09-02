import { intro, outro, select, text, note, cancel } from '@clack/prompts';
import { saveOpenArvaConfig, type OpenArvaProviderName } from '../config/env.js';

export function renderCliHelp() {
  console.log(`
OpenArva CLI

Usage: openarva [command] [options]

Commands:
  init, setup     Start the interactive setup wizard
  run             Run a task in a domain
  doctor          Run environment and provider diagnostics
  fix             Diagnose and repair repository issues safely
  status          Show provider, model, port, and bridge status
  batch           Bulk-process text/document files in a directory
  learn           Index local docs/context into the on-device memory bank
  usage           Show usage dashboard and export billing statements
  update          Discover provider models; use --models for local pulls and benchmarks
  mode            Select a specialized design, education, or developer workflow
  tasks           View persistent task and workflow memory
  service         Manage background service / Windows auto-start
  commit          Prepare a commit message or workflow summary
  serve           Start HTTP/WebSocket gateway and remote mobile bridge
  demo            Run a quick no-key demo mode
  gateway         Show gateway status
  help            Show this help message

Examples:
  openarva init
  openarva doctor
  openarva status
  openarva batch --dir ./documents
  openarva learn --index ./
  openarva learn --forget
  openarva usage
  openarva update --models
  openarva mode design "Create a dashboard wireframe"
  openarva mode edu "Build a lesson plan"
  openarva mode dev "Scan this API for vulnerabilities"
  openarva tasks
  openarva service install
  openarva commit "feat: improve AI workflow"
  openarva serve --port 3000
  openarva fix "Resolve TypeScript errors"
  openarva run --domain coding --instruction "Build a simple API"
  openarva gateway

Supported providers:
  openai, anthropic, gemini, groq, deepseek, ollama, local, lmstudio

Community & support:
  Telegram: https://t.me/openrva177
  WhatsApp: https://whatsapp.com/channel/0029Vb8TDKr72WTmtjfWju2s
  Issues: https://github.com/fekerulegese10-arch/openarva/issues

Environment auto-detection:
  Flutter/Dart, Node.js/TypeScript, Python, Go, Rust
`);
}

export async function runOnboarding() {
  intro('OpenArva Setup Wizard');

  const providerResult = await select({
    message: 'Choose your default AI provider',
    options: [
      { value: 'openai', label: 'OpenAI' },
      { value: 'anthropic', label: 'Anthropic Claude' },
      { value: 'gemini', label: 'Google Gemini' },
      { value: 'groq', label: 'Groq' },
      { value: 'deepseek', label: 'DeepSeek' },
      { value: 'ollama', label: 'Ollama / Local AI' },
      { value: 'local', label: 'Local AI (generic)' },
      { value: 'lmstudio', label: 'LM Studio' },
    ],
  });

  if (providerResult === undefined || providerResult === null || typeof providerResult !== 'string') {
    cancel('OpenArva setup cancelled.');
    return;
  }

  const selectedProvider = providerResult as OpenArvaProviderName;

  const modelResult = await text({
    message: 'Enter the model name to use by default',
    placeholder: selectedProvider === 'openai' ? 'gpt-4o' : selectedProvider === 'anthropic' ? 'claude-3-5-sonnet' : selectedProvider === 'gemini' ? 'gemini-2.0-flash' : selectedProvider === 'groq' ? 'llama-3.3-70b-versatile' : selectedProvider === 'deepseek' ? 'deepseek-chat' : 'llama3.1',
    defaultValue: selectedProvider === 'openai' ? 'gpt-4o' : selectedProvider === 'anthropic' ? 'claude-3-5-sonnet' : selectedProvider === 'gemini' ? 'gemini-2.0-flash' : selectedProvider === 'groq' ? 'llama-3.3-70b-versatile' : selectedProvider === 'deepseek' ? 'deepseek-chat' : 'llama3.1',
  });
  const model = typeof modelResult === 'string' ? modelResult : String(modelResult);

  const keyPromptMap: Record<OpenArvaProviderName, string> = {
    openai: 'OpenAI API key (optional)',
    anthropic: 'Anthropic API key (optional)',
    gemini: 'Gemini API key (optional)',
    groq: 'Groq API key (optional)',
    deepseek: 'DeepSeek API key (optional)',
    ollama: 'Ollama API key (optional; usually not required)',
    local: 'Local AI API key (optional; usually not required)',
    lmstudio: 'LM Studio API key (optional; usually not required)',
  };

  const keyValue = await text({
    message: keyPromptMap[selectedProvider],
    placeholder: selectedProvider === 'openai' ? 'sk-...' : 'key...',
    defaultValue: '',
  });
  const apiKey = typeof keyValue === 'string' ? keyValue : String(keyValue);

  const baseUrlValue = await text({
    message: 'Base URL (optional, for OpenAI-compatible endpoints or local servers)',
    placeholder: selectedProvider === 'ollama' || selectedProvider === 'local' ? 'http://localhost:11434/v1' : selectedProvider === 'lmstudio' ? 'http://localhost:1234/v1' : 'https://api.example.com/v1',
    defaultValue: selectedProvider === 'ollama' || selectedProvider === 'local' ? 'http://localhost:11434/v1' : selectedProvider === 'lmstudio' ? 'http://localhost:1234/v1' : '',
  });
  const baseUrl = typeof baseUrlValue === 'string' ? baseUrlValue : String(baseUrlValue);

  const organizationName = await text({
    message: 'Organization name / institution (optional)',
    placeholder: 'OpenArva Lab',
    defaultValue: '',
  });

  const developerId = await text({
    message: 'Developer ID / user identity (optional)',
    placeholder: 'dev-001',
    defaultValue: '',
  });

  const config = {
    provider: selectedProvider,
    model: model,
    apiKey: apiKey || undefined,
    baseUrl: baseUrl || undefined,
    organizationName: typeof organizationName === 'string' ? organizationName : String(organizationName || ''),
    developerId: typeof developerId === 'string' ? developerId : String(developerId || ''),
  };

  saveOpenArvaConfig(config);

  note(
    `Default provider saved to .openarva/config.json\nProvider: ${selectedProvider}\nModel: ${model}`,
    'Setup complete',
  );

  outro('OpenArva is ready. Run: openarva run --domain coding --instruction "Build a simple API"');
}
