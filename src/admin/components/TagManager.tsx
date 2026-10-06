import { useState } from 'react';
import { tagSlug } from '../../lib/lang';
import type { GitHub } from '../github';
import { renameTagChanges, tagCounts, type Post } from '../posts';

interface Props {
  gh: GitHub;
  posts: Post[];
  onSaved: (sha: string, label: string) => void;
}

/** Rename a tag everywhere, or merge it into another by renaming to that tag's name. */
export function TagManager({ gh, posts, onSaved }: Props) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tags = tagCounts(posts);

  async function rename(from: string) {
    const to = (names[from] ?? '').trim();
    if (!to || to === from) return;
    const merging = tags.some((t) => t.tag !== from && tagSlug(t.tag) === tagSlug(to));
    const verb = merging ? 'Merge' : 'Rename';
    if (!confirm(`${verb} tag "${from}" → "${to}" in every post that uses it? This makes one commit.`)) return;
    setBusy(true);
    setError(null);
    try {
      const label = `${verb} tag: ${from} → ${to}`;
      const sha = await gh.commit(label, renameTagChanges(posts, from, to));
      setNames({});
      onSaved(sha, label);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cms-page">
      <div className="cms-page-head">
        <h1>Tags</h1>
      </div>
      <p className="cms-muted">Rename a tag in every post at once. Renaming to an existing tag merges the two.</p>
      {error && <div className="cms-alert cms-alert-error">{error}</div>}
      {tags.length === 0 ? (
        <p className="cms-muted">No tags yet.</p>
      ) : (
        <table className="cms-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Posts</th>
              <th>Rename to</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tags.map(({ tag, count }) => (
              <tr key={tag}>
                <td>{tag}</td>
                <td>{count}</td>
                <td>
                  <input
                    value={names[tag] ?? ''}
                    placeholder={tag}
                    list="cms-tag-names"
                    onChange={(e) => setNames((n) => ({ ...n, [tag]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && rename(tag)}
                  />
                </td>
                <td>
                  <button className="cms-btn cms-btn-small" disabled={busy || !(names[tag] ?? '').trim()} onClick={() => rename(tag)}>
                    Apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <datalist id="cms-tag-names">
        {tags.map(({ tag }) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </div>
  );
}
