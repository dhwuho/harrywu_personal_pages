import { REPO } from './config';

/** Thrown when GitHub rejects the token; the app sends the user back to sign in. */
export class AuthError extends Error {}

/** Thrown when a file changed on GitHub since it was loaded. */
export class ConflictError extends Error {
  constructor(public paths: string[]) {
    super(`Changed on GitHub since you opened it: ${paths.join(', ')}`);
  }
}

export interface TreeFile {
  path: string;
  sha: string;
}

/** A file change for one commit. `content: null` deletes the file. */
export interface FileChange {
  path: string;
  content: string | Uint8Array | null;
  /** Blob SHA this change was based on; checked against GitHub to catch conflicts. Omit for new files. */
  baseSha?: string;
}

export interface DeployState {
  state: 'pending' | 'success' | 'failure' | 'none';
  url?: string;
}

const API = 'https://api.github.com';
const repoPath = `/repos/${REPO.owner}/${REPO.name}`;

export class GitHub {
  constructor(private getToken: () => Promise<string>) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
      // GitHub sends max-age=60; a cached branch head would make the next commit
      // build on a stale parent ("Update is not a fast forward"). Always ask GitHub.
      cache: 'no-store',
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        // No token = read-only access to the public repo (local testing only).
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (res.status === 401) {
      throw new AuthError(token ? 'GitHub sign-in expired. Sign out and sign in again.' : 'Read-only mode: sign in (or add a token) to save.');
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`GitHub ${init.method ?? 'GET'} ${path} failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    return res.status === 204 ? (undefined as T) : res.json();
  }

  async viewer(): Promise<{ login: string; id: number }> {
    return this.request('/user');
  }

  private async headCommit(): Promise<{ commitSha: string; treeSha: string }> {
    const ref = await this.request<{ object: { sha: string } }>(`${repoPath}/git/ref/heads/${REPO.branch}`);
    const commit = await this.request<{ tree: { sha: string } }>(`${repoPath}/git/commits/${ref.object.sha}`);
    return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
  }

  /** Every file under `dir` on the branch head, with blob SHAs. */
  async listFiles(dir: string): Promise<{ files: TreeFile[]; commitSha: string }> {
    const { commitSha, treeSha } = await this.headCommit();
    const tree = await this.request<{ tree: { path: string; type: string; sha: string }[]; truncated: boolean }>(
      `${repoPath}/git/trees/${treeSha}?recursive=1`,
    );
    if (tree.truncated) throw new Error('Repository tree is too large to list');
    const prefix = `${dir}/`;
    const files = tree.tree.filter((e) => e.type === 'blob' && e.path.startsWith(prefix)).map(({ path, sha }) => ({ path, sha }));
    return { files, commitSha };
  }

  /** Text of a blob, decoded as UTF-8. */
  async readText(sha: string): Promise<string> {
    const blob = await this.request<{ content: string; encoding: string }>(`${repoPath}/git/blobs/${sha}`);
    return new TextDecoder().decode(base64ToBytes(blob.content));
  }

  /**
   * Apply all changes as ONE commit on the branch.
   * Fails with ConflictError if any file's current SHA differs from its `baseSha`.
   */
  async commit(message: string, changes: FileChange[]): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      const head = await this.headCommit();
      await this.checkConflicts(head.treeSha, changes);
      const tree = await Promise.all(
        changes.map(async (c) =>
          c.content === null
            ? { path: c.path, mode: '100644', type: 'blob', sha: null }
            : { path: c.path, mode: '100644', type: 'blob', sha: await this.createBlob(c.content) },
        ),
      );
      const newTree = await this.request<{ sha: string }>(`${repoPath}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({ base_tree: head.treeSha, tree }),
      });
      const commit = await this.request<{ sha: string }>(`${repoPath}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({ message, tree: newTree.sha, parents: [head.commitSha] }),
      });
      try {
        await this.request(`${repoPath}/git/refs/heads/${REPO.branch}`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: commit.sha, force: false }),
        });
        return commit.sha;
      } catch (err) {
        // Someone pushed in between: rebuild on the new head once (conflicts are re-checked).
        if (attempt >= 1) throw err;
      }
    }
  }

  private async checkConflicts(treeSha: string, changes: FileChange[]) {
    const checked = changes.filter((c) => c.baseSha !== undefined);
    if (checked.length === 0) return;
    const tree = await this.request<{ tree: { path: string; sha: string }[] }>(`${repoPath}/git/trees/${treeSha}?recursive=1`);
    const current = new Map(tree.tree.map((e) => [e.path, e.sha]));
    const changed = checked.filter((c) => current.get(c.path) !== c.baseSha).map((c) => c.path);
    if (changed.length) throw new ConflictError(changed);
  }

  private async createBlob(content: string | Uint8Array): Promise<string> {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const blob = await this.request<{ sha: string }>(`${repoPath}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: bytesToBase64(bytes), encoding: 'base64' }),
    });
    return blob.sha;
  }

  /** Build result for a commit, from Cloudflare's GitHub check runs and statuses. */
  async deployState(sha: string): Promise<DeployState> {
    const [runs, status] = await Promise.all([
      this.request<{ check_runs: { status: string; conclusion: string | null; details_url?: string }[] }>(
        `${repoPath}/commits/${sha}/check-runs`,
      ).catch(() => ({ check_runs: [] })),
      this.request<{ state: string; statuses: { target_url?: string }[] }>(`${repoPath}/commits/${sha}/status`).catch(() => ({
        state: 'none',
        statuses: [],
      })),
    ]);
    const run = runs.check_runs[0];
    if (run) {
      if (run.status !== 'completed') return { state: 'pending', url: run.details_url };
      return { state: run.conclusion === 'success' ? 'success' : 'failure', url: run.details_url };
    }
    if (status.statuses.length === 0) return { state: 'none' };
    const url = status.statuses[0]?.target_url;
    if (status.state === 'success') return { state: 'success', url };
    if (status.state === 'pending') return { state: 'pending', url };
    return { state: 'failure', url };
  }
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
