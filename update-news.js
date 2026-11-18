const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const parser = new Parser();

const feeds = [
    { url: "https://www.sciencedaily.com/rss/top.xml", category: "Nauka" },
    { url: "https://www.nasa.gov/news-release/feed/", category: "Kosmos" },
    { url: "https://www.esa.int/rssfeed/Our_Activities/Space_Science", category: "Kosmos" },
    { url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml", category: "AI" },
    { url: "https://www.sciencedaily.com/rss/plants_animals/biology.xml", category: "Biologia" }
];

async function loadNews() {
    let output = [];

    for (const feed of feeds) {
        try {
            const rss = await parser.parseURL(feed.url);

            rss.items.slice(0, 4).forEach(item => {
                const rawDesc = item.contentSnippet || item.content || "";
                const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, "").slice(0, 220) + "...";

                output.push({
                    title: item.title,
                    description: cleanDesc,
                    link: item.link,
                    category: feed.category,
                    date: item.pubDate ? new Date(item.pubDate).toLocaleDateString("pl-PL") : ""
                });
            });
        } catch (err) {
            console.error(`Błąd pobierania kanału ${feed.url}:`, err.message);
        }
    }

    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(dataDir, "news.json"),
        JSON.stringify(output, null, 2),
        "utf-8"
    );
    console.log(`Zapisano ${output.length} artykułów.`);
}

loadNews();
