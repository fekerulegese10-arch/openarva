import * as os from 'node:os';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

export type RuntimePlatform = 'windows' | 'linux' | 'darwin' | 'android';

export function detectPlatform(): RuntimePlatform {
  const platform = os.platform();

  if (platform === 'win32') return 'windows';
  if (platform === 'android') return 'android';
  if (platform === 'darwin') return 'darwin';
  return 'linux';
}

export function normalizePathForPlatform(targetPath: string): string {
  const normalized = targetPath.replace(/\\/g, '/');
  const platform = detectPlatform();

  if (platform === 'windows') {
    return normalized.replace(/\//g, '\\');
  }

  return normalized;
}

export function detectProjectStack(rootDir = process.cwd()): string[] {
  const markers = [
    { name: 'Flutter/Dart', files: ['pubspec.yaml'] },
    { name: 'Node.js/TypeScript', files: ['package.json', 'tsconfig.json'] },
    { name: 'Python', files: ['requirements.txt', 'pyproject.toml', 'setup.py'] },
    { name: 'Go', files: ['go.mod'] },
    { name: 'Rust', files: ['Cargo.toml'] },
  ];

  return markers
    .filter((stack) => stack.files.some((file) => existsSync(path.join(rootDir, file))))
    .map((stack) => stack.name);
}

export function suggestAutomationStack(rootDir = process.cwd()) {
  const detected = detectProjectStack(rootDir);

  if (detected.length === 0) {
    return ['Node.js/TypeScript', 'Python', 'Flutter/Dart'];
  }

  return detected;
}
