export function getBestYouTubeThumbnail(
  thumbnails: Record<string, { url: string }> | undefined
): string {
  if (!thumbnails) return "";
  return (
    thumbnails?.standard?.url ||   // 640×480, closest to square
    thumbnails?.high?.url    ||    // 480×360, good square proxy
    thumbnails?.medium?.url  ||    // 320×180, 16:9 — last resort
    thumbnails?.default?.url ||
    ""
  );
}
