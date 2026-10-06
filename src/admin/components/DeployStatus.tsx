import { useEffect, useState } from 'react';
import type { DeployState, GitHub } from '../github';

const POLL_MS = 8_000;
const GIVE_UP_MS = 10 * 60_000;

/** Shows whether the Cloudflare build for a commit is running, live or failed. */
export function DeployStatus({ gh, sha, label, onClose }: { gh: GitHub; sha: string; label: string; onClose: () => void }) {
  const [deploy, setDeploy] = useState<DeployState>({ state: 'pending' });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    async function poll() {
      try {
        const next = await gh.deployState(sha);
        if (stopped) return;
        setDeploy(next.state === 'none' ? { state: 'pending' } : next);
        if (next.state === 'success' || next.state === 'failure') return;
      } catch {}
      if (Date.now() - started > GIVE_UP_MS) return setTimedOut(true);
      if (!stopped) setTimeout(poll, POLL_MS);
    }
    void poll();
    return () => {
      stopped = true;
    };
  }, [gh, sha]);

  const text =
    deploy.state === 'success'
      ? 'Live on the site.'
      : deploy.state === 'failure'
        ? 'Build failed.'
        : timedOut
          ? 'Still no build result after 10 minutes.'
          : 'Saved. Building the site (about a minute)…';

  return (
    <div className={`cms-deploy is-${deploy.state}`} role="status">
      <span>
        <strong>{label}</strong> · {text}
      </span>
      {deploy.url && (
        <a href={deploy.url} target="_blank" rel="noopener">
          Details ↗
        </a>
      )}
      <button className="cms-link" onClick={onClose} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
