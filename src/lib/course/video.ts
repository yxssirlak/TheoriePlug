export type VideoSource =
  | { kind: "file"; src: string }
  | { kind: "embed"; src: string };

// YouTube/Vimeo-links worden ingebed; alles anders is een direct videobestand (bijv. uit Supabase Storage)
export function resolveVideo(url: string): VideoSource {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return { kind: "embed", src: `https://www.youtube.com/embed/${youtube[1]}?rel=0` };

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "embed", src: `https://player.vimeo.com/video/${vimeo[1]}` };

  return { kind: "file", src: url };
}
