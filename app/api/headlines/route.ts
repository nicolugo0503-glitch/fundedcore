// Real financial news with images. Pulls several RSS feeds (no key), extracts
// headline + thumbnail + source, merges and sorts. Cached ~10 min.
import { NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type Item = { title: string; link: string; source: string; date: string; image: string | null; summary: string };

const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", source: "CNBC Markets" },
  { url: "https://www.cnbc.com/id/15839135/device/rss/rss.html", source: "CNBC Economy" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse", source: "MarketWatch" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_bulletins", source: "MarketWatch" },
  { url: "https://www.investing.com/rss/news_25.rss", source: "Investing.com" },
  { url: "https://www.investing.com/rss/news_1.rss", source: "Forex" },
  { url: "https://www.investing.com/rss/news_11.rss", source: "Commodities" },
  { url: "https://www.forexlive.com/feed/news/", source: "ForexLive" },
];

// keep only markets/trading-relevant stories
const REL = /\b(stock|stocks|share|shares|equit|market|markets|index|indices|s&p|s\&p|nasdaq|dow|russell|futures|treasur|yield|bond|rate|rates|fed|fomc|powell|inflation|cpi|ppi|jobs|payroll|gdp|earnings|guidance|rally|sell-?off|selloff|bull|bear|volatil|vix|dollar|forex|fx|currenc|euro|yen|oil|crude|wti|brent|gold|silver|copper|commodit|bitcoin|crypto|ether|recession|economy|trade|trading|hike|cut|tariff|opec)\b/i;
function relevant(t: string, sum: string) { return REL.test(t) || REL.test(sum); }

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
    const r = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 (FundedCore)" } });
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
  let uniq = all.filter((i) => { const k = i.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; });
  const rel = uniq.filter((i) => relevant(i.title, i.summary));
  if (rel.length >= 6) uniq = rel;
  uniq.sort((a, b) => {
    const ai = a.image ? 1 : 0, bi = b.image ? 1 : 0;
    const ad = +new Date(a.date) || 0, bd = +new Date(b.date) || 0;
    return bd - ad || bi - ai;
  });
  return NextResponse.json({ source: uniq.length ? "live" : "empty", items: uniq.slice(0, 18), ts: Date.now() });
}
