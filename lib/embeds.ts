export type Embed = { platform: string; src: string; url: string; vertical?: boolean };

export function parseEmbed(raw: string): Embed | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.|mobile\.)/, "");
  const url = u.toString();
  // YouTube
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return { platform: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}`, url };
  }
  if (host.endsWith("youtube.com")) {
    let id = u.searchParams.get("v");
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
    if (m) id = m[2];
    if (id) return { platform: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}`, url, vertical: m?.[1] === "shorts" };
  }
  // TikTok
  if (host.endsWith("tiktok.com")) {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (m) return { platform: "TikTok", src: `https://www.tiktok.com/embed/v2/${m[1]}`, url, vertical: true };
  }
  // Instagram
  if (host.endsWith("instagram.com")) {
    const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([\w-]+)/);
    if (m) return { platform: "Instagram", src: `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed`, url, vertical: true };
  }
  // X / Twitter
  if (host === "x.com" || host === "twitter.com") {
    const m = u.pathname.match(/\/status(?:es)?\/(\d+)/);
    if (m) return { platform: "X", src: `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&lang=id&dnt=true`, url, vertical: true };
  }
  // Facebook
  if (host.endsWith("facebook.com") || host === "fb.watch") {
    const isVideo = /\/(videos|reel|watch)/.test(u.pathname) || host === "fb.watch";
    const plugin = isVideo ? "video.php" : "post.php";
    return { platform: "Facebook", src: `https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(url)}&show_text=true&width=500`, url, vertical: !isVideo };
  }
  return null;
}
