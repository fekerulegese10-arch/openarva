import fs from 'fs';
import path from 'path';
export class OpenArvaMemory {
    dbPath = path.resolve(process.cwd(), '.openarva_memory.json');
    saveState(key, data) {
        let memory = {};
        if (fs.existsSync(this.dbPath)) {
            memory = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
        }
        memory[key] = data;
        fs.writeFileSync(this.dbPath, JSON.stringify(memory, null, 2));
    }
    getState(key) {
        if (!fs.existsSync(this.dbPath))
            return null;
        const memory = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
        return memory[key] || null;
    }
}
