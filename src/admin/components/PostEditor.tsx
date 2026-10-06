import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { countText, detectLang, htmlLang, needsMdx, slugify, SLUG_PATTERN } from '../../lib/lang';
import { rawUrl } from '../config';
import { embedFromUrl } from '../embeds';
import { emptyMeta, today, type PostMeta } from '../frontmatter';
import { ConflictError, type GitHub } from '../github';
import { prepareImage, type Upload } from '../images';
import { deleteChanges, folderOf, saveChanges, type Post } from '../posts';
import { insertBlock, MarkdownEditor } from './MarkdownEditor';
import { Preview } from './Preview';

interface Props {
  gh: GitHub;
  /** null = new post */
  post: Post | null;
  posts: Post[];
  onSaved: (sha: string, slug: string, label: string) => void;
  onDeleted: (sha: string, label: string) => void;
}

type ViewMode = 'write' | 'split' | 'preview';

interface Autosave {
  slug: string;
  meta: PostMeta;
  body: string;
  baseSha: string | null;
  savedAt: number;
}

const autosaveKey = (post: Post | null) => `cms:autosave:${post?.slug ?? 'new'}`;

function readAutosave(post: Post | null): Autosave | null {
  try {
    const raw = localStorage.getItem(autosaveKey(post));
    return raw ? (JSON.parse(raw) as Autosave) : null;
  } catch {
    return null;
  }
}

export function PostEditor({ gh, post, posts, onSaved, onDeleted }: Props) {
  const initial = useMemo(
    () => ({ slug: post?.slug ?? '', meta: post?.meta ?? emptyMeta(), body: post?.body ?? '' }),
    [post],
  );
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [meta, setMeta] = useState<PostMeta>(initial.meta);
  const [body, setBody] = useState(initial.body);
  const [editorKey, setEditorKey] = useState(0);
  const [uploads, setUploads] = useState<Upload[]>([]);
  /** Preview URLs for images added this session, kept after saving until GitHub serves them. */
  const [localImages, setLocalImages] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<ViewMode>('split');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restore, setRestore] = useState<Autosave | null>(null);
  const [tagText, setTagText] = useState(initial.meta.tags.join(', '));
  const viewRef = useRef<EditorView | null>(null);

  const dirty =
    uploads.length > 0 ||
    slug !== initial.slug ||
    body !== initial.body ||
    JSON.stringify(meta) !== JSON.stringify(initial.meta);

  // When the post is opened, offer to restore unsaved work from a previous session.
  useEffect(() => {
    const saved = readAutosave(post);
    if (saved && (saved.body !== initial.body || JSON.stringify(saved.meta) !== JSON.stringify(initial.meta))) {
      setRestore(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave to this browser while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      const data: Autosave = { slug, meta, body, baseSha: post?.sha ?? null, savedAt: Date.now() };
      try {
        localStorage.setItem(autosaveKey(post), JSON.stringify(data));
      } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [dirty, slug, meta, body, post]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  // New posts: suggest the slug from the title until it is edited by hand.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(meta.title));
  }, [meta.title, slugTouched]);

  const set = <K extends keyof PostMeta>(key: K, value: PostMeta[K]) => setMeta((m) => ({ ...m, [key]: value }));

  const detected = detectLang(`${meta.title}\n${body}`);
  const lang = meta.lang ?? detected;
  const format = needsMdx(body) ? 'mdx' : 'md';
  const counts = countText(body);

  const takenNames = useMemo(
    () => new Set([...(post?.images ?? []).map((f) => f.path.split('/').pop()!), ...uploads.map((u) => u.name)]),
    [post, uploads],
  );

  const resolveImage = useCallback(
    (src: string) => {
      if (/^(https?:|data:|blob:)/.test(src)) return src;
      const name = src.replace(/^\.\//, '');
      if (localImages[name]) return localImages[name];
      return slug ? rawUrl(`${folderOf(slug)}/${name}`) : src;
    },
    [localImages, slug],
  );

  async function addImages(files: File[], asCover = false) {
    setError(null);
    const taken = new Set(takenNames);
    const added: Upload[] = [];
    try {
      for (const file of files) {
        const upload = await prepareImage(file, taken);
        taken.add(upload.name);
        added.push(upload);
      }
    } catch (err) {
      setError(`Image failed: ${err instanceof Error ? err.message : err}`);
      return;
    }
    setUploads((u) => [...u, ...added]);
    setLocalImages((m) => ({ ...m, ...Object.fromEntries(added.map((u) => [u.name, u.url])) }));
    if (asCover) {
      set('cover', `./${added[0].name}`);
    } else if (viewRef.current) {
      const text = added.map((u) => `![${u.name.replace(/\.\w+$/, '').replace(/-/g, ' ')}](./${u.name})`).join('\n\n');
      insertBlock(viewRef.current, text);
    }
  }

  function insertEmbed(kind: 'youtube' | 'bilibili') {
    const label = kind === 'youtube' ? 'YouTube' : 'Bilibili';
    const input = prompt(`Paste a ${label} video link:`);
    if (!input || !viewRef.current) return;
    const code = embedFromUrl(kind, input);
    if (!code) return setError(`That doesn't look like a ${label} link.`);
    insertBlock(viewRef.current, code);
  }

  function validate(): string | null {
    if (!meta.title.trim()) return 'Title is required.';
    if (!SLUG_PATTERN.test(slug)) return 'Slug must be lowercase letters, numbers and hyphens (e.g. my-first-post).';
    if (!post && posts.some((p) => p.slug === slug)) return `A post with the slug "${slug}" already exists.`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) return 'Date must look like 2026-10-06.';
    return null;
  }

  async function save(draft = meta.draft) {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    const next = { ...meta, title: meta.title.trim(), description: meta.description.trim(), draft };
    const verb = !post ? (draft ? 'Draft' : 'Publish') : draft === meta.draft ? 'Update' : draft ? 'Unpublish' : 'Publish';
    const label = `${verb}: ${next.title}`;
    setBusy(draft === meta.draft ? 'Saving…' : draft ? 'Unpublishing…' : 'Publishing…');
    try {
      const sha = await gh.commit(label, saveChanges(post, { slug, meta: next, body, uploads }));
      try {
        localStorage.removeItem(autosaveKey(post));
      } catch {}
      setMeta(next);
      setUploads([]);
      onSaved(sha, slug, label);
    } catch (err) {
      setError(
        err instanceof ConflictError
          ? `${err.message}. Your text is kept in this browser: reload the post, then restore it from the banner.`
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!post || !confirm(`Delete "${post.meta.title}" and its images? This commits a deletion to GitHub.`)) return;
    setBusy('Deleting…');
    try {
      const label = `Delete: ${post.meta.title}`;
      const sha = await gh.commit(label, await deleteChanges(gh, post));
      localStorage.removeItem(autosaveKey(post));
      onDeleted(sha, label);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  // Cmd/Ctrl+S saves.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void saveRef.current();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const imageNames = [...takenNames].sort();

  return (
    <div className="cms-post">
      <div className="cms-toolbar">
        <a href="#/" className="cms-back">
          ← Posts
        </a>
        <span className={`cms-chip ${meta.draft ? 'is-draft' : 'is-live'}`}>{meta.draft ? 'Draft' : 'Published'}</span>
        <span className="cms-chip" title={format === 'mdx' ? 'Uses components, saved as .mdx' : 'Plain Markdown, saved as .md'}>
          .{format}
        </span>
        {dirty && <span className="cms-muted">Unsaved changes</span>}
        <span className="cms-spacer" />
        <div className="cms-segmented" role="group" aria-label="View">
          {(['write', 'split', 'preview'] as const).map((m) => (
            <button key={m} className={mode === m ? 'is-active' : ''} onClick={() => setMode(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {meta.draft ? (
          <>
            <button className="cms-btn" disabled={!!busy} onClick={() => save()} title="Ctrl/Cmd+S">
              Save draft
            </button>
            <button className="cms-btn cms-btn-primary" disabled={!!busy} onClick={() => save(false)}>
              Publish
            </button>
          </>
        ) : (
          <>
            <button className="cms-btn" disabled={!!busy} onClick={() => save(true)}>
              Unpublish
            </button>
            <button className="cms-btn cms-btn-primary" disabled={!!busy} onClick={() => save()} title="Ctrl/Cmd+S">
              Save
            </button>
          </>
        )}
      </div>

      {busy && <div className="cms-alert">{busy}</div>}
      {error && (
        <div className="cms-alert cms-alert-error" role="alert">
          {error}
        </div>
      )}
      {restore && (
        <div className="cms-alert">
          Unsaved changes from {new Date(restore.savedAt).toLocaleString()} are stored in this browser
          {post && restore.baseSha !== post.sha && ' (the post has changed on GitHub since)'}.{' '}
          <button
            className="cms-link"
            onClick={() => {
              setSlug(restore.slug);
              setMeta(restore.meta);
              setBody(restore.body);
              setTagText(restore.meta.tags.join(', '));
              setEditorKey((k) => k + 1);
              setRestore(null);
            }}
          >
            Restore
          </button>{' '}
          ·{' '}
          <button
            className="cms-link"
            onClick={() => {
              localStorage.removeItem(autosaveKey(post));
              setRestore(null);
            }}
          >
            Discard
          </button>
        </div>
      )}

      <div className={`cms-workspace mode-${mode}`}>
        <section className="cms-pane cms-pane-editor">
          <div className="cms-editbar">
            <label className="cms-btn cms-btn-small">
              Image
              <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addImages([...e.target.files])} />
            </label>
            <button className="cms-btn cms-btn-small" onClick={() => insertEmbed('youtube')}>
              YouTube
            </button>
            <button className="cms-btn cms-btn-small" onClick={() => insertEmbed('bilibili')}>
              Bilibili
            </button>
            <span className="cms-spacer" />
            <span className="cms-muted">
              {lang === 'zh' ? `${counts.chars.toLocaleString()} characters` : `${counts.words.toLocaleString()} words`}
            </span>
          </div>
          <MarkdownEditor
            key={editorKey}
            initial={body}
            lang={htmlLang[lang]}
            onChange={setBody}
            onFiles={(files) => addImages(files)}
            onReady={(view) => (viewRef.current = view)}
          />
        </section>

        <section className="cms-pane cms-pane-preview">
          <article lang={htmlLang[lang]}>
            <h1 className="cms-preview-title">{meta.title || 'Untitled'}</h1>
          </article>
          <Preview body={body} format={format} lang={htmlLang[lang]} resolveImage={resolveImage} />
        </section>

        <aside className="cms-pane cms-meta">
          <label>
            Title
            <input value={meta.title} onChange={(e) => set('title', e.target.value)} lang={htmlLang[lang]} />
          </label>
          <label>
            Slug (URL)
            <input
              value={slug}
              disabled={Boolean(post)}
              placeholder={meta.title && !slugify(meta.title) ? 'type an English slug' : 'my-post'}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
            />
            <small>{post ? 'Fixed after the first save, so links keep working.' : `/posts/${slug || '…'}/`}</small>
          </label>
          <label>
            Description
            <textarea rows={3} value={meta.description} onChange={(e) => set('description', e.target.value)} lang={htmlLang[lang]} />
            <small>Shown in post lists and link previews.</small>
          </label>
          <div className="cms-row">
            <label>
              Date
              <input type="date" value={meta.date} onChange={(e) => set('date', e.target.value)} />
            </label>
            <label>
              Updated
              <input type="date" value={meta.updated ?? ''} onChange={(e) => set('updated', e.target.value || undefined)} />
            </label>
          </div>
          {post && !meta.draft && (
            <button className="cms-link" onClick={() => set('updated', today())}>
              Mark updated today
            </button>
          )}
          <label>
            Tags
            <input
              value={tagText}
              list="cms-tags"
              placeholder="travel, life"
              onChange={(e) => {
                setTagText(e.target.value);
                set(
                  'tags',
                  e.target.value
                    .split(/[,，]/)
                    .map((t) => t.trim())
                    .filter(Boolean),
                );
              }}
            />
            <datalist id="cms-tags">
              {[...new Set(posts.flatMap((p) => p.meta.tags))].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <small>Separate with commas.</small>
          </label>
          <label>
            Language
            <select value={meta.lang ?? ''} onChange={(e) => set('lang', (e.target.value || undefined) as PostMeta['lang'])}>
              <option value="">Auto ({detected === 'zh' ? 'Chinese' : 'English'})</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </select>
          </label>
          <label>
            Cover image
            <select value={meta.cover ?? ''} onChange={(e) => set('cover', e.target.value || undefined)}>
              <option value="">None (site default)</option>
              {imageNames.map((n) => (
                <option key={n} value={`./${n}`}>
                  {n}
                </option>
              ))}
            </select>
            <small>
              Used for link previews.{' '}
              <label className="cms-link">
                Upload a cover
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && addImages([e.target.files[0]], true)} />
              </label>
            </small>
          </label>
          {meta.cover && <img className="cms-cover" src={resolveImage(meta.cover)} alt="" />}
          {uploads.length > 0 && (
            <p className="cms-muted">
              {uploads.length} new image{uploads.length > 1 ? 's' : ''} will be uploaded on save.
            </p>
          )}
          {post && (
            <p className="cms-meta-footer">
              {!meta.draft && (
                <a href={`/posts/${post.slug}/`} target="_blank" rel="noopener">
                  View on site ↗
                </a>
              )}
              <button className="cms-link cms-danger" onClick={remove} disabled={!!busy}>
                Delete post
              </button>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
