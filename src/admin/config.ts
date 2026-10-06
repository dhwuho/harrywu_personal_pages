/** The repo the CMS reads and writes. Not secret: the repo is public. */
export const REPO = { owner: 'dhwuho', name: 'harrywu_personal_pages', branch: 'main' } as const;

export const POSTS_DIR = 'src/content/posts';

/** Images are resized to fit within this many pixels before upload. */
export const MAX_IMAGE_SIZE = 2000;

/** Public raw URL for files already in the repo (used by the preview). */
export const rawUrl = (path: string) =>
  `https://raw.githubusercontent.com/${REPO.owner}/${REPO.name}/${REPO.branch}/${path}`;
