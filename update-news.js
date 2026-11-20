const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const parser = new Parser({
    customFields: {
        item: [
            ["media:content", "mediaContent"],
            ["media:thumbnail", "mediaThumbnail"],
            ["enclosure", "enclosure"]
        ]
    }
});

const feeds = [
    { url: "https://www.sciencedaily.com/rss/top/science.xml", category: "Nauka", source: "ScienceDaily" },
    { url: "https://phys.org/rss-feed/", category: "Nauka", source: "Phys.org" },
    { url: "https://www.nasa.gov/news-release/feed/", category: "Kosmos", source: "NASA" },
    { url: "https://www.esa.int/rssfeed/Our_Activities/Space_Science", category: "Kosmos", source: "ESA" },
    { url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml", category: "AI", source: "ScienceDaily" },
    { url: "https://www.sciencedaily.com/rss/plants_animals/biology.xml", category: "Biologia", source: "ScienceDaily" }
];

function extractImage(item) {
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;
    if (item.mediaContent && item.mediaContent.$&& item.mediaContent.$.url) return item.mediaContent.$.url;
    if (item.mediaThumbnail && item.mediaThumbnail.$&& item.mediaThumbnail.$.url) return item.mediaThumbnail.$.url;
    const html = item.content || item["content:encoded"] || "";
    const match = html.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : "";
}

async function loadNews() {
    let output = [];
    const seenLinks = new Set();

    for (const feed of feeds) {
        try {
            const rss = await parser.parseURL(feed.url);

            rss.items.slice(0, 5).forEach(item => {
                if (!item.link || seenLinks.has(item.link)) return;
                seenLinks.add(item.link);

                const rawDesc = (item.contentSnippet || item.content || "")
                    .replace(/<[^>]*>?/gm, "")
                    .replace(/\s+/g, " ")
                    .trim();

                const shortDesc = rawDesc.length > 200 ? rawDesc.slice(0, 200) + "..." : rawDesc;

                output.push({
                    title: item.title,
                    description: shortDesc,
                    fullDescription: rawDesc,
                    link: item.link,
                    category: feed.category,
                    source: feed.source,
                    date: item.pubDate ? new Date(item.pubDate).toLocaleDateString("pl-PL") : "",
                    timestamp: item.pubDate ? new Date(item.pubDate).getTime() : 0,
                    image: extractImage(item)
                });
            });
        } catch (err) {
            console.error(`Błąd pobierania kanału ${feed.url}:`, err.message);
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
    console.log(`Zapisano ${output.length} unikalnych artykułów.`);
}

loadNews();
