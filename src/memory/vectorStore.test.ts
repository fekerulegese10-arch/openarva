import { describe, expect, it } from 'vitest';
import { indexMemoryDocuments, searchMemory, vectorStorePath } from './vectorStore.js';

describe('local vector memory', () => {
  it('indexes locally embedded documents and retrieves relevant context', () => {
    const suffix = Date.now().toString();
    indexMemoryDocuments([
      { id: `test:${suffix}:git`, source: 'github', text: `OpenArva repository release pipeline ${suffix}` },
      { id: `test:${suffix}:chat`, source: 'chat', text: `Unrelated cooking recipe ${suffix}` },
    ]);

    const matches = searchMemory(`repository release pipeline ${suffix}`, 2);
    expect(vectorStorePath()).toContain('vectors.sqlite');
    expect(matches[0]?.text).toContain('repository release pipeline');
  });
});
