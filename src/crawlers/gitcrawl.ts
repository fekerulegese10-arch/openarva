import { createHash } from 'node:crypto';
import { indexCrawlRecords, type CrawlRecord } from '../crawlers/store.js';

export interface GitCrawlOptions { repository: string; token?: string; includeIssues?: boolean; includePulls?: boolean; includeCommits?: boolean; }

function repositoryPath(value: string) {
  const normalized = value.replace(/^https?:\/\/github\.com\//, '').replace(/^git@github\.com:/, '').replace(/\.git$/, '').replace(/\/$/, '');
  const parts = normalized.split('/');
  if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) throw new Error('Use a GitHub repository such as owner/name or https://github.com/owner/name.');
  return parts.join('/');
}

async function githubGet(path: string, token?: string) {
  const response = await fetch(`https://api.github.com/${path}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'openarva', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}: ${await response.text()}`);
  return response.json() as Promise<unknown>;
}

function record(repo: string, kind: string, item: Record<string, unknown>): CrawlRecord {
  const url = typeof item.html_url === 'string' ? item.html_url : undefined;
  const title = typeof item.title === 'string' ? item.title : typeof item.name === 'string' ? item.name : kind;
  const text = [title, item.body, item.message, item.description].filter((value): value is string => typeof value === 'string').join('\n\n');
  return { id: createHash('sha256').update(`${repo}:${kind}:${String(item.id || url || title)}`).digest('hex'), source: 'github', kind, title, text, url, metadata: { repository: repo, state: item.state, author: (item.user as { login?: string } | undefined)?.login }, indexedAt: new Date().toISOString() };
}

export async function crawlGitHub(options: GitCrawlOptions) {
  const repository = repositoryPath(options.repository);
  const records: CrawlRecord[] = [];
  const repo = await githubGet(`repos/${repository}`, options.token) as Record<string, unknown>;
  records.push(record(repository, 'repository', repo));
  if (options.includeIssues !== false) {
    const issues = await githubGet(`repos/${repository}/issues?state=all&per_page=100`, options.token) as Record<string, unknown>[];
    records.push(...issues.filter((item) => !item.pull_request).map((item) => record(repository, 'issue', item)));
  }
  if (options.includePulls !== false) {
    const pulls = await githubGet(`repos/${repository}/pulls?state=all&per_page=100`, options.token) as Record<string, unknown>[];
    records.push(...pulls.map((item) => record(repository, 'pull_request', item)));
  }
  if (options.includeCommits !== false) {
    const commits = await githubGet(`repos/${repository}/commits?per_page=100`, options.token) as Record<string, unknown>[];
    records.push(...commits.map((item) => {
      const commit = item.commit as { message?: string; author?: { name?: string; date?: string } } | undefined;
      return record(repository, 'commit', { ...item, title: commit?.message?.split('\n')[0] || 'commit', message: commit?.message, author: commit?.author });
    }));
  }
  return { repository, fetched: records.length, indexed: indexCrawlRecords(records) };
}
