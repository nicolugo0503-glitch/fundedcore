// Real financial news with images. Pulls several RSS feeds (no key), extracts
// headline + thumbnail + source, merges and sorts. Cached ~10 min.
import { NextResponse } from "next/server";

export const revalidate = 600;

type Item = { title: string; link: string; source: string; date: string; image: string | null; summary: string };

const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC" },
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", source: "CNBC Markets" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch" },
  { url: "https://finance.yahoo.com/news/rssindex", source: "Yahoo Finance" },
];

function decode(s: string) {
  return (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ")
    .trim();
}
function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : null;
}
function findImage(block: string): string | null {
  const media = block.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i);
  if (media) return media[1];
  const enc = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
  if (enc) return enc[1];
  const img = block.match(/<img[^>]*src="([^"]+)"/i);
  if (img) return img[1];
  const og = block.match(/(https?:\/\/[^"'\s)]+\.(?:jpg|jpeg|png|webp))/i);
  return og ? og[1] : null;
}

async function pull(url: string, source: string): Promise<Item[]> {
  try {
    const r = await fetch(url, { next: { revalidate: 600 }, headers: { "User-Agent": "Mozilla/5.0 (FundedCore)" } });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = xml.split(/<item[\s>]/i).slice(1);
    return items.slice(0, 12).map((raw) => {
      const block = "<item " + raw;
      const link = decode(tag(block, "link") || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || ""));
      return {
        title: decode(tag(block, "title") || ""),
        link,
        source,
        date: (tag(block, "pubDate") || tag(block, "updated") || tag(block, "published") || "").trim(),
        image: findImage(block),
        summary: decode(tag(block, "description") || tag(block, "summary") || "").slice(0, 180),
      };
    }).filter((i) => i.title && i.link);
  } catch { return []; }
}

export async function GET() {
  const all = (await Promise.all(FEEDS.map((f) => pull(f.url, f.source)))).flat();
  // de-dupe by title, prefer items with images, sort by date desc
  const seen = new Set<string>();
  const uniq = all.filter((i) => { const k = i.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; });
  uniq.sort((a, b) => {
    const ai = a.image ? 1 : 0, bi = b.image ? 1 : 0;
    const ad = +new Date(a.date) || 0, bd = +new Date(b.date) || 0;
    return bd - ad || bi - ai;
  });
  return NextResponse.json({ source: uniq.length ? "live" : "empty", items: uniq.slice(0, 18), ts: Date.now() });
}
