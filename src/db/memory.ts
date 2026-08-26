import fs from 'fs';
import path from 'path';

export class OpenArvaMemory {
  private dbPath = path.resolve(process.cwd(), '.openarva_memory.json');

  saveState(key: string, data: any) {
    let memory: Record<string, any> = {};
    if (fs.existsSync(this.dbPath)) {
      memory = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
    }
    memory[key] = data;
    fs.writeFileSync(this.dbPath, JSON.stringify(memory, null, 2));
  }

  getState(key: string) {
    if (!fs.existsSync(this.dbPath)) return null;
    const memory = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
    return memory[key] || null;
  }
}