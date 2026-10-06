import { useState } from 'react';
import { signIn, useDevToken, type SessionState } from '../auth';

/** Shown when not signed in. `no-backend` = local `astro dev`, where the auth Worker isn't running. */
export function SignIn({ session }: { session: Exclude<SessionState, { kind: 'signed-in' }> }) {
  const [token, setToken] = useState('');

  return (
    <div className="cms-signin">
      <h1>Harry Wu · CMS</h1>
      {session.kind === 'signed-out' ? (
        <>
          {session.error && <div className="cms-alert cms-alert-error">{session.error}</div>}
          <p className="cms-muted">Only the site owner can sign in.</p>
          <button className="cms-btn cms-btn-primary" onClick={signIn}>
            Sign in with GitHub
          </button>
        </>
      ) : (
        <>
          <p className="cms-muted">
            The sign-in service isn't running here (local dev). Paste a GitHub fine-grained token with <em>Contents: read and write</em>{' '}
            on this repo, or continue read-only.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              useDevToken(token);
            }}
          >
            <input type="password" placeholder="github_pat_…" value={token} onChange={(e) => setToken(e.target.value)} />
            <button className="cms-btn cms-btn-primary" type="submit" disabled={!token.trim()}>
              Use token
            </button>
          </form>
          <button className="cms-link" onClick={() => useDevToken('')}>
            Continue read-only
          </button>
        </>
      )}
    </div>
  );
}
