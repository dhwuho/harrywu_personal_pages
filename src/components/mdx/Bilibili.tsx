import { VideoEmbed } from './VideoEmbed';

/** `<Bilibili bvid="BV1xx411c7mD" title="..." />` — bvid is the BV id in the video URL. */
export function Bilibili({ bvid, page = 1, title = 'Bilibili video' }: { bvid: string; page?: number; title?: string }) {
  const params = new URLSearchParams({ bvid, p: String(page), autoplay: '1', high_quality: '1' });
  return <VideoEmbed playUrl={`https://player.bilibili.com/player.html?${params}`} title={title} />;
}
