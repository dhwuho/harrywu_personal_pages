import { VideoEmbed } from './VideoEmbed';

/** `<YouTube id="jNQXAC9IVRw" title="..." />` — id is the `v=` value of the video URL. */
export function YouTube({ id, title = 'YouTube video' }: { id: string; title?: string }) {
  return <VideoEmbed src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`} title={title} />;
}
