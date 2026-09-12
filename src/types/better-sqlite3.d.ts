declare module 'better-sqlite3' {
  class Statement {
    run(...parameters: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    all<T = Record<string, unknown>>(...parameters: unknown[]): T[];
    get<T = Record<string, unknown>>(...parameters: unknown[]): T | undefined;
  }

  class Database {
    constructor(filename: string);
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }
  export = Database;
}
