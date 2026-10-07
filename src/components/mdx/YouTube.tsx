import { VideoEmbed } from './VideoEmbed';

/** `<YouTube id="jNQXAC9IVRw" title="..." />` — id is the `v=` value of the video URL. */
export function YouTube({ id, title = 'YouTube video' }: { id: string; title?: string }) {
  const vid = encodeURIComponent(id);
  return (
    <VideoEmbed
      playUrl={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1`}
      thumbnail={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`}
      title={title}
    />
  );
}
