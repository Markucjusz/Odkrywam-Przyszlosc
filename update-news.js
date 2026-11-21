const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const parser = new Parser({
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
    },
    timeout: 15000,
    customFields: {
        item: [
            ["media:content", "mediaContent"],
            ["media:thumbnail", "mediaThumbnail"],
            ["enclosure", "enclosure"]
        ]
    }
});

// Źródła polskie (lang: "pl") oraz angielskie tłumaczone automatycznie (lang: "en")
const feeds = [
    { url: "https://naukawpolsce.pl/rss.xml", category: "Nauka", source: "Nauka w Polsce", lang: "pl" },
    { url: "https://kopalniawiedzy.pl/rss/wszystkie", category: "Nauka", source: "Kopalnia Wiedzy", lang: "pl" },
    { url: "https://www.urania.edu.pl/rss.xml", category: "Kosmos", source: "Urania", lang: "pl" },
    { url: "https://www.nasa.gov/news-release/feed/", category: "Kosmos", source: "NASA", lang: "en" },
    { url: "https://www.esa.int/rssfeed/Our_Activities/Space_Science", category: "Kosmos", source: "ESA", lang: "en" },
    { url: "https://news.mit.edu/rss/topic/artificial-intelligence2", category: "AI", source: "MIT News", lang: "en" },
    { url: "https://www.nature.com/nature.rss", category: "Biologia", source: "Nature", lang: "en" }
];

function extractImage(item) {
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;
    if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) return item.mediaContent.$.url;
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) return item.mediaThumbnail.$.url;
    const html = item.content || item["content:encoded"] || "";
    const match = html.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : "";
}

// Darmowe tłumaczenie EN -> PL bez klucza API
async function translateToPolish(text) {
    if (!text) return "";
    const trimmed = text.slice(0, 900);
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pl&dt=t&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url);
        if (!res.ok) return text;
        const data = await res.json();
        return data[0].map(part => part[0]).join("");
    } catch {
        return text;
    }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loadNews() {
    let output = [];
    const seenLinks = new Set();

    for (const feed of feeds) {
        try {
            const rss = await parser.parseURL(feed.url);
            console.log(`OK [${feed.category} - ${feed.source}]: pobrano ${rss.items.length} wpisów`);

            for (const item of rss.items.slice(0, 4)) {
                if (!item.link || seenLinks.has(item.link)) continue;
                seenLinks.add(item.link);

                const rawDesc = (item.contentSnippet || item.content || "")
                    .replace(/<[^>]*>?/gm, "")
                    .replace(/\s+/g, " ")
                    .trim();

                let title = item.title || "";
                let fullDescription = rawDesc;

                if (feed.lang === "en") {
                    title = await translateToPolish(title);
                    await sleep(250);
                    fullDescription = await translateToPolish(rawDesc);
                    await sleep(250);
                }

                const shortDesc = fullDescription.length > 200
                    ? fullDescription.slice(0, 200) + "..."
                    : fullDescription;

                output.push({
                    title,
                    description: shortDesc,
                    fullDescription,
                    link: item.link,
                    category: feed.category,
                    source: feed.source,
                    date: item.pubDate ? new Date(item.pubDate).toLocaleDateString("pl-PL") : "",
                    timestamp: item.pubDate ? new Date(item.pubDate).getTime() : 0,
                    image: extractImage(item)
                });
            }
        } catch (err) {
            console.error(`BŁĄD [${feed.category} - ${feed.source}] (${feed.url}):`, err.message);
        }
    }

    output.sort((a, b) => b.timestamp - a.timestamp);

    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(dataDir, "news.json"),
        JSON.stringify(output, null, 2),
        "utf-8"
    );
    console.log(`Zapisano łącznie ${output.length} artykułów w języku polskim.`);
}

loadNews();
