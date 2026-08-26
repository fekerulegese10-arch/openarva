import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

const p = {
  intro(message: string) {
    console.log(message);
  },
  async text(options: { message: string; placeholder?: string }) {
    const suffix = options.placeholder ? ` (${options.placeholder})` : '';
    return rl.question(`${options.message}${suffix} `);
  },
  outro(message: string) {
    console.log(message);
    rl.close();
  },
};

export async function runOnboarding() {
  p.intro('🌾 Welcome to OpenArva Interactive Onboarding');

  const geminiKey = await p.text({
    message: 'Enter your Gemini API Key:',
    placeholder: 'AIzaSy...',
  });

  const telegramToken = await p.text({
    message: 'Enter your Telegram Bot Token:',
    placeholder: '123456:ABC...',
  });

  p.outro('🎉 OpenArva System Setup Completed Successfully!');
}