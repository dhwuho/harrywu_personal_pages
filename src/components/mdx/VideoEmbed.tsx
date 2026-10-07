import type { CSSProperties } from 'react';

const frame: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  margin: '0 0 1.5rem',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
  background: '#111',
  border: '1px solid var(--color-border)',
};

const iframe: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Click-to-play placeholder inside the iframe (`srcdoc`): the page loads a thumbnail and a
 * play button, and the heavy video player loads only when clicked. No JavaScript on the page.
 */
function placeholder(playUrl: string, title: string, thumbnail?: string): string {
  const bg = thumbnail ? `url('${escapeHtml(thumbnail)}') center/cover no-repeat, #111` : 'linear-gradient(135deg,#1f2937,#111827)';
  return `<!doctype html><style>
*{margin:0;box-sizing:border-box}html,body{height:100%;overflow:hidden}
a{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:${bg};color:#fff;text-decoration:none;font:500 15px/1.4 system-ui,sans-serif}
b{width:68px;height:48px;border-radius:14px;background:rgba(0,0,0,.6);display:grid;place-items:center;transition:background .15s}
b::after{content:'';border-style:solid;border-width:10px 0 10px 17px;border-color:transparent transparent transparent #fff;margin-left:4px}
a:hover b,a:focus b{background:#e11d48}
span{position:absolute;left:16px;right:16px;bottom:12px;text-shadow:0 1px 3px rgba(0,0,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style><a href="${escapeHtml(playUrl)}" aria-label="Play: ${escapeHtml(title)}"><b></b><span>${escapeHtml(title)}</span></a>`;
}

export function VideoEmbed({ playUrl, title, thumbnail }: { playUrl: string; title: string; thumbnail?: string }) {
  return (
    <div className="embed" style={frame}>
      <iframe
        srcDoc={placeholder(playUrl, title, thumbnail)}
        title={title}
        style={iframe}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
