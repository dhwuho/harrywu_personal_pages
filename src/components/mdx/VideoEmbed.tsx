import type { CSSProperties } from 'react';

const frame: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  margin: '0 0 1.5rem',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
};

const iframe: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 };

export function VideoEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div style={frame}>
      <iframe
        src={src}
        title={title}
        style={iframe}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
