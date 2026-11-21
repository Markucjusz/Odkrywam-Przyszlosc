const Parser = require("rss-parser");
const translate = require("google-translate-api-x");
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

const feeds = [
    // Polskojęzyczne źródła
    { url: "https://naukawpolsce.pl/rss.xml", category: "Nauka", source: "Nauka w Polsce", lang: "pl" },
    { url: "https://kopalniawiedzy.pl/rss/wszystkie", category: "Nauka", source: "Kopalnia Wiedzy", lang: "pl" },
    { url: "https://www.urania.edu.pl/rss.xml", category: "Kosmos", source: "Urania", lang: "pl" },
    { url: "https://spidersweb.pl/feed", category: "AI", source: "Spider's Web", lang: "pl" },

    // Angielskojęzyczne źródła (tłumaczone na PL)
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Tłumaczenie tytułu i opisu w jednym zapytaniu (oszczędza limity zapytań)
async function translateArticle(title, description) {
    const cleanTitle = (title || "").trim();
    const cleanDesc = (description || "").slice(0, 750).trim();
    const separator = "\n###\n";
    const payload = cleanDesc ? `${cleanTitle}${separator}${cleanDesc}` : cleanTitle;

    try {
        const res = await translate(payload, { from: "en", to: "pl", forceTo: true });
        const parts = res.text.split(/###/);
        return {
            title: (parts[0] || cleanTitle).trim(),
            description: (parts[1] || cleanDesc).trim(),
            translated: true
        };
    } catch (err) {
        console.warn(`Nie udało się przetłumaczyć (${cleanTitle.slice(0, 40)}...): ${err.message}`);
        return {
            title: cleanTitle,
            description: cleanDesc,
            translated: false
        };
    }
}

async function loadNews() {
    let output = [];
    const seenLinks = new Set();

    for (const feed of feeds) {
        try {
            const rss = await parser.parseURL(feed.url);
            console.log(`OK [${feed.lang.toUpperCase()} | ${feed.category} - ${feed.source}]: pobrano ${rss.items.length} wpisów`);

            for (const item of rss.items.slice(0, 4)) {
                if (!item.link || seenLinks.has(item.link)) continue;
                seenLinks.add(item.link);

                const rawDesc = (item.contentSnippet || item.content || "")
                    .replace(/<[^>]*>?/gm, "")
                    .replace(/\s+/g, " ")
                    .trim();

                let title = (item.title || "").trim();
                let fullDescription = rawDesc;
                let translated = false;

                if (feed.lang === "en") {
                    const tr = await translateArticle(title, rawDesc);
                    title = tr.title;
                    fullDescription = tr.description;
                    translated = tr.translated;
                    await sleep(600);
                }

                const shortDesc = fullDescription.length > 200
                    ? fullDescription.slice(0, 200) + "..."
                    : fullDescription;

                output.push({
                    title,
                    originalTitle: feed.lang === "en" ? (item.title || "").trim() : "",
                    description: shortDesc,
                    fullDescription,
                    link: item.link,
                    category: feed.category,
                    source: feed.source,
                    lang: feed.lang,
                    translated,
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
    console.log(`Zapisano łącznie ${output.length} artykułów.`);
}

loadNews();
