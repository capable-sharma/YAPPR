import { createServerFn } from "@tanstack/react-start";

/**
 * Fetch trending Indian news headlines from Google News RSS and reshape
 * them into spoken-debate prompts. Falls back to an empty list on error
 * so the UI can show a graceful "couldn't load" state.
 */
export const fetchTrendingTopics = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ topics: string[]; fetchedAt: number; error?: string }> => {
    try {
      const res = await fetch(
        "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
        { headers: { "User-Agent": "Mozilla/5.0 YapprTrendingBot/1.0" } },
      );
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const xml = await res.text();

      const titles: string[] = [];
      const re =
        /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) && titles.length < 14) {
        // Google News RSS appends " - Source" to headlines.
        const t = m[1].replace(/\s+-\s+[^-]+$/, "").trim();
        if (t.length > 12 && !/^Top stories$/i.test(t)) titles.push(t);
      }

      const verbs = ["Discuss", "Take a stance on", "Hot take —", "React to"];
      const topics = titles.map(
        (t, i) => `${verbs[i % verbs.length]}: ${t}`,
      );

      return { topics, fetchedAt: Date.now() };
    } catch (e) {
      return { topics: [], fetchedAt: 0, error: (e as Error).message };
    }
  },
);
