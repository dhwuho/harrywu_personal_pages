import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from '../../components/mdx';

interface Props {
  body: string;
  format: 'md' | 'mdx';
  lang: string;
  /** Turns a relative image path (./photo.webp) into a URL the browser can load. */
  resolveImage: (src: string) => string;
}

type Compiled = { Content: ComponentType<{ components?: Record<string, unknown> }>; version: number };

/** Live preview using the same Markdown/MDX pipeline, components and styles as the site. */
export function Preview({ body, format, lang, resolveImage }: Props) {
  const [compiled, setCompiled] = useState<Compiled | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const mod = await evaluate(body, { ...runtime, format, remarkPlugins: [remarkGfm], baseUrl: location.href });
        if (cancelled) return;
        setCompiled((prev) => ({ Content: mod.default as Compiled['Content'], version: (prev?.version ?? 0) + 1 }));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [body, format]);

  const components = {
    ...mdxComponents,
    img: (props: { src?: string; alt?: string }) => <img {...props} src={props.src ? resolveImage(props.src) : undefined} />,
  };

  return (
    <div className="cms-preview" lang={lang}>
      {error && (
        <div className="cms-alert cms-alert-error">
          <strong>Preview error</strong> (the build would fail too):
          <pre>{error}</pre>
        </div>
      )}
      {compiled && (
        <RenderBoundary key={compiled.version}>
          <div className="prose">
            <compiled.Content components={components} />
          </div>
        </RenderBoundary>
      )}
    </div>
  );
}

class RenderBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  render() {
    if (this.state.error) return <div className="cms-alert cms-alert-error">Render error: {this.state.error}</div>;
    return this.props.children;
  }
}
