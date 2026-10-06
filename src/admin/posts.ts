import { needsMdx, tagSlug } from '../lib/lang';
import { POSTS_DIR } from './config';
import { parsePost, serializePost, type PostMeta } from './frontmatter';
import type { FileChange, GitHub, TreeFile } from './github';
import { isImagePath, type Upload } from './images';

export interface Post {
  slug: string;
  /** e.g. src/content/posts/hello-world/index.md */
  path: string;
  ext: 'md' | 'mdx';
  sha: string;
  meta: PostMeta;
  body: string;
  /** Images in the post's folder. */
  images: TreeFile[];
}

/** What the editor holds while you work on a post. */
export interface PostDraft {
  slug: string;
  meta: PostMeta;
  body: string;
  uploads: Upload[];
}

const INDEX = /^([^/]+)\/index\.(md|mdx)$/;

// Blob contents never change for a given SHA, so they can be cached for the session.
const blobCache = new Map<string, string>();
async function readCached(gh: GitHub, sha: string): Promise<string> {
  const key = `cms:blob:${sha}`;
  const hit = blobCache.get(sha) ?? sessionStorage.getItem(key);
  if (hit !== null && hit !== undefined) return hit;
  const text = await gh.readText(sha);
  blobCache.set(sha, text);
  try {
    sessionStorage.setItem(key, text);
  } catch {}
  return text;
}

/** All posts on the branch head, newest first. */
export async function loadPosts(gh: GitHub): Promise<Post[]> {
  const { files } = await gh.listFiles(POSTS_DIR);
  const byFolder = new Map<string, TreeFile[]>();
  for (const file of files) {
    const rel = file.path.slice(POSTS_DIR.length + 1);
    const folder = rel.split('/')[0];
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), file]);
  }
  const posts: Post[] = [];
  await Promise.all(
    [...byFolder.entries()].map(async ([slug, folderFiles]) => {
      const index = folderFiles.find((f) => INDEX.test(f.path.slice(POSTS_DIR.length + 1)));
      if (!index) return;
      const ext = index.path.endsWith('.mdx') ? 'mdx' : 'md';
      const { meta, body } = parsePost(await readCached(gh, index.sha));
      posts.push({ slug, path: index.path, ext, sha: index.sha, meta, body, images: folderFiles.filter((f) => isImagePath(f.path)) });
    }),
  );
  return posts.sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.slug.localeCompare(b.slug));
}

export const folderOf = (slug: string) => `${POSTS_DIR}/${slug}`;

/** The file changes that save `draft` (new post when `original` is null). */
export function saveChanges(original: Post | null, draft: PostDraft): FileChange[] {
  const ext = needsMdx(draft.body) ? 'mdx' : 'md';
  const path = `${folderOf(draft.slug)}/index.${ext}`;
  const content = serializePost(draft.meta, draft.body);
  const changes: FileChange[] = [];
  if (original && original.path !== path) {
    // .md ↔ .mdx switch: remove the old file in the same commit.
    changes.push({ path: original.path, content: null, baseSha: original.sha });
    changes.push({ path, content });
  } else {
    changes.push({ path, content, baseSha: original?.sha });
  }
  for (const upload of draft.uploads) {
    // Only commit images the post still references (removed ones are dropped).
    if (draft.body.includes(upload.name) || draft.meta.cover?.endsWith(upload.name)) {
      changes.push({ path: `${folderOf(draft.slug)}/${upload.name}`, content: upload.bytes });
    }
  }
  return changes;
}

/** Changes that delete a post's folder (article and images). */
export async function deleteChanges(gh: GitHub, post: Post): Promise<FileChange[]> {
  const { files } = await gh.listFiles(folderOf(post.slug));
  return files.map((f) => ({ path: f.path, content: null, baseSha: f.sha }));
}

/** Changes that rename (or merge) a tag across every post that uses it. */
export function renameTagChanges(posts: Post[], from: string, to: string): FileChange[] {
  const fromSlug = tagSlug(from);
  const target = to.trim();
  return posts
    .filter((p) => p.meta.tags.some((t) => tagSlug(t) === fromSlug))
    .map((p) => {
      const tags: string[] = [];
      for (const t of p.meta.tags) {
        const next = tagSlug(t) === fromSlug ? target : t;
        if (next && !tags.some((x) => tagSlug(x) === tagSlug(next))) tags.push(next);
      }
      return { path: p.path, content: serializePost({ ...p.meta, tags }, p.body), baseSha: p.sha };
    });
}

/** Tags across posts with counts, most used first. */
export function tagCounts(posts: Post[]): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const p of posts) {
    for (const tag of p.meta.tags) {
      const key = tagSlug(tag);
      const item = counts.get(key) ?? { tag, count: 0 };
      item.count += 1;
      counts.set(key, item);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
