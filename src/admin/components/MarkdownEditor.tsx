import { useEffect, useRef } from 'react';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';

interface Props {
  /** Starting text; the editor owns the text after mount (remount with a new `key` to reset). */
  initial: string;
  lang: string;
  onChange: (text: string) => void;
  onFiles: (files: File[]) => void;
  onReady: (view: EditorView) => void;
}

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '15px', backgroundColor: 'var(--color-bg)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.7', padding: '16px 0' },
  '.cm-content': { padding: '0 20px', caretColor: 'var(--color-accent)' },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: 'var(--color-muted)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--color-accent-soft) !important' },
});

const imageFiles = (list: FileList | null | undefined) => [...(list ?? [])].filter((f) => f.type.startsWith('image/'));

/** Markdown source editor. Handles Chinese IME input natively (CodeMirror 6). */
export function MarkdownEditor({ initial, lang, onChange, onFiles, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onChange, onFiles });
  callbacks.current = { onChange, onFiles };

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          markdown(),
          EditorView.lineWrapping,
          placeholder('Write in Markdown… Paste or drop images here.'),
          theme,
          EditorView.contentAttributes.of({ spellcheck: 'true', autocorrect: 'off', autocapitalize: 'sentences' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callbacks.current.onChange(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            paste(event) {
              const files = imageFiles(event.clipboardData?.files);
              if (!files.length) return false;
              event.preventDefault();
              callbacks.current.onFiles(files);
              return true;
            },
            drop(event, view) {
              const files = imageFiles(event.dataTransfer?.files);
              if (!files.length) return false;
              event.preventDefault();
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
              if (pos !== null) view.dispatch({ selection: { anchor: pos } });
              callbacks.current.onFiles(files);
              return true;
            },
          }),
        ],
      }),
    });
    onReady(view);
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="cms-editor" ref={host} lang={lang} />;
}

/** Insert a block (image, embed) on its own lines, with a blank line before and after. */
export function insertBlock(view: EditorView, block: string) {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;
  const before = doc.sliceString(Math.max(0, from - 2), from);
  const after = doc.sliceString(to, Math.min(doc.length, to + 2));
  const lead = from === 0 || before === '\n\n' ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = to === doc.length ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  insertAtCursor(view, `${lead}${block.trim()}${trail}`);
}

/** Insert text at the cursor (replacing the selection) and focus the editor. */
export function insertAtCursor(view: EditorView, text: string) {
  const { from, to } = view.state.selection.main;
  view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
  view.focus();
}
