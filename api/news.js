export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=600');

  const feeds = [
    { url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',     label: '主要' },
    { url: 'https://news.yahoo.co.jp/rss/topics/domestic.xml',      label: '国内' },
    { url: 'https://news.yahoo.co.jp/rss/topics/entertainment.xml', label: 'エンタメ' },
    { url: 'https://news.yahoo.co.jp/rss/topics/world.xml',         label: '国際' },
    { url: 'https://news.yahoo.co.jp/rss/topics/sports.xml',        label: 'スポーツ' },
  ];

  function parseRSS(xmlText, label) {
    const items = [];
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
    for (const block of itemMatches.slice(0, 2)) {
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`));
        return m ? (m[1] || m[2] || '').trim() : '';
      };
      const title = get('title');
      const link  = get('link') || get('guid');
      const desc  = get('description').replace(/<[^>]+>/g, '').substring(0, 120);
      const pub   = get('pubDate');
      if (title) items.push({ title, link, description: desc, pubDate: pub, label });
    }
    return items;
  }

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const r = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!r.ok) throw new Error('fetch failed');
      const text = await r.text();
      return parseRSS(text, feed.label);
    })
  );

  const allItems = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      allItems.push(r.value[0]);
    }
  }
  for (const r of results) {
    if (allItems.length >= 6) break;
    if (r.status === 'fulfilled' && r.value.length > 1) {
      allItems.push(r.value[1]);
    }
  }

  if (allItems.length === 0) {
    return res.status(502).json({ error: 'no items' });
  }

  res.status(200).json({ items: allItems });
}
