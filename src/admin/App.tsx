import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { getToken, initSession, signOut, type SessionState } from './auth';
import { DeployStatus } from './components/DeployStatus';
import { PostList } from './components/PostList';
import { SignIn } from './components/SignIn';
import { TagManager } from './components/TagManager';
import { AuthError, GitHub } from './github';
import { loadPosts, type Post } from './posts';

// The editor pulls in CodeMirror and the MDX compiler; load it only when a post is opened.
const PostEditor = lazy(() => import('./components/PostEditor').then((m) => ({ default: m.PostEditor })));

type Route = { name: 'list' } | { name: 'new' } | { name: 'edit'; slug: string } | { name: 'tags' };

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path === 'new') return { name: 'new' };
  if (path === 'tags') return { name: 'tags' };
  if (path.startsWith('edit/')) return { name: 'edit', slug: decodeURIComponent(path.slice(5)) };
  return { name: 'list' };
}

function useRoute(): Route {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return parseRoute(hash);
}

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCommit, setLastCommit] = useState<{ sha: string; label: string } | null>(null);
  const route = useRoute();
  const gh = useMemo(() => new GitHub(getToken), []);

  useEffect(() => {
    initSession().then(setSession, (err) => setSession({ kind: 'signed-out', error: String(err) }));
  }, []);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setPosts(await loadPosts(gh));
    } catch (err) {
      if (err instanceof AuthError) setSession({ kind: 'signed-out', error: 'Your sign-in expired. Sign in again.' });
      else setError(err instanceof Error ? err.message : String(err));
    }
  }, [gh]);

  useEffect(() => {
    if (session?.kind !== 'signed-in') return;
    void reload();
    gh.viewer().then(
      (u) => setUser(u.login),
      () => setUser(null),
    );
  }, [session, gh, reload]);

  if (!session) return <div className="cms-loading">Loading…</div>;
  if (session.kind !== 'signed-in') return <SignIn session={session} />;

  const committed = (sha: string, label: string) => {
    setLastCommit({ sha, label });
    void reload();
  };

  let page;
  if (!posts) {
    page = error ? null : <div className="cms-loading">Loading posts…</div>;
  } else if (route.name === 'tags') {
    page = <TagManager gh={gh} posts={posts} onSaved={committed} />;
  } else if (route.name === 'new' || route.name === 'edit') {
    const post = route.name === 'edit' ? (posts.find((p) => p.slug === route.slug) ?? null) : null;
    page =
      route.name === 'edit' && !post ? (
        <div className="cms-page">
          <p>No post called “{route.slug}”.</p>
          <a href="#/">← Posts</a>
        </div>
      ) : (
        <PostEditor
          key={post?.slug ?? 'new'}
          gh={gh}
          post={post}
          posts={posts}
          onSaved={(sha, slug, label) => {
            committed(sha, label);
            if (!post) location.hash = `#/edit/${slug}`;
          }}
          onDeleted={(sha, label) => {
            committed(sha, label);
            location.hash = '#/';
          }}
        />
      );
  } else {
    page = <PostList posts={posts} />;
  }

  return (
    <div className="cms">
      <header className="cms-header">
        <a className="cms-brand" href="#/">
          CMS
        </a>
        <nav>
          <a href="#/" aria-current={route.name === 'list' ? 'page' : undefined}>
            Posts
          </a>
          <a href="#/tags" aria-current={route.name === 'tags' ? 'page' : undefined}>
            Tags
          </a>
          <a href="/" target="_blank" rel="noopener">
            View site ↗
          </a>
        </nav>
        <span className="cms-spacer" />
        {session.source !== 'github-app' && <span className="cms-chip">{session.source === 'read-only' ? 'read-only' : 'local token'}</span>}
        {user && <span className="cms-muted">@{user}</span>}
        <button className="cms-link" onClick={signOut}>
          Sign out
        </button>
      </header>
      {lastCommit && <DeployStatus gh={gh} {...lastCommit} key={lastCommit.sha} onClose={() => setLastCommit(null)} />}
      {error && (
        <div className="cms-alert cms-alert-error" role="alert">
          {error}{' '}
          <button className="cms-link" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      <Suspense fallback={<div className="cms-loading">Loading editor…</div>}>{page}</Suspense>
    </div>
  );
}
