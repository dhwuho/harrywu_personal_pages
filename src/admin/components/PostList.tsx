import { useMemo, useState } from 'react';
import { detectLang, htmlLang, tagSlug } from '../../lib/lang';
import type { Post } from '../posts';

type StatusFilter = 'all' | 'draft' | 'published';

export function PostList({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const tags = useMemo(() => [...new Set(posts.flatMap((p) => p.meta.tags))].sort(), [posts]);
  const shown = posts.filter((p) => {
    if (status === 'draft' && !p.meta.draft) return false;
    if (status === 'published' && p.meta.draft) return false;
    if (tag && !p.meta.tags.some((t) => tagSlug(t) === tagSlug(tag))) return false;
    const q = query.trim().toLowerCase();
    return !q || `${p.meta.title} ${p.meta.description} ${p.slug}`.toLowerCase().includes(q);
  });

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>Posts</h1>
        <a className="cms-btn cms-btn-primary" href="#/new">
          New post
        </a>
      </div>
      <div className="cms-filters">
        <input type="search" placeholder="Search titles…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag">
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Status">
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="cms-muted">{posts.length === 0 ? 'No posts yet. Write the first one!' : 'No posts match.'}</p>
      ) : (
        <ul className="cms-list">
          {shown.map((p) => {
            const lang = p.meta.lang ?? detectLang(`${p.meta.title}\n${p.body}`);
            return (
              <li key={p.slug}>
                <a href={`#/edit/${p.slug}`}>
                  <span className="cms-list-title" lang={htmlLang[lang]}>
                    {p.meta.title || p.slug}
                  </span>
                  <span className="cms-list-meta">
                    {p.meta.draft && <span className="cms-chip is-draft">Draft</span>}
                    {lang === 'zh' && <span className="cms-chip">中文</span>}
                    {p.meta.tags.map((t) => (
                      <span key={t} className="cms-chip cms-chip-quiet">
                        {t}
                      </span>
                    ))}
                    <time>{p.meta.date}</time>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
