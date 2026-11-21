const Parser = require("rss-parser");
const translate = require("google-translate-api-x");
const crypto = require("crypto");
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
            ["media:content", "mediaContent", { keepArray: true }],
            ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
            ["media:group", "mediaGroup"],
            ["enclosure", "enclosure"]
        ]
    }
});

const feeds = [
    // Polskojęzyczne źródła
    { url: "https://naukawpolsce.pl/rss.xml", category: "Fizyka i Ziemia", source: "Nauka w Polsce", lang: "pl" },
    { url: "https://kopalniawiedzy.pl/rss/wszystkie", category: "Fizyka i Ziemia", source: "Kopalnia Wiedzy", lang: "pl" },
    { url: "https://www.urania.edu.pl/rss.xml", category: "Kosmos", source: "Urania", lang: "pl" },
    { url: "https://spidersweb.pl/feed", category: "AI i Tech", source: "Spider's Web", lang: "pl" },

    // Angielskojęzyczne źródła
    { url: "https://www.nasa.gov/news-release/feed/", category: "Kosmos", source: "NASA", lang: "en" },
    { url: "https://www.esa.int/rssfeed/Our_Activities/Space_Science", category: "Kosmos", source: "ESA", lang: "en" },
    { url: "https://news.mit.edu/rss/topic/artificial-intelligence2", category: "AI i Tech", source: "MIT News", lang: "en" },
    { url: "https://www.nature.com/nature.rss", category: "Biologia", source: "Nature", lang: "en" }
];

const RETENTION_DAYS = 14;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function makeShortId(str) {
    return crypto.createHash("sha1").update(str).digest("hex").slice(0, 10);
}

// 1. Wyciąganie grafiki z różnych wariantów XML (enclosure, tablice media:content, media:group, img w HTML)
function extractImageFromRss(item) {
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;

    if (Array.isArray(item.mediaContent)) {
        for (const m of item.mediaContent) {
            if (m && m.$ && m.$.url) return m.$.url;
        }
    }

    if (Array.isArray(item.mediaThumbnail)) {
        for (const t of item.mediaThumbnail) {
            if (t && t.$ && t.$.url) return t.$.url;
        }
    }

    if (item.mediaGroup && item.mediaGroup["media:content"]) {
        const grp = item.mediaGroup["media:content"];
        if (Array.isArray(grp) && grp[0] && grp[0].$ && grp[0].$.url) return grp[0].$.url;
        if (grp.$ && grp.$.url) return grp.$.url;
    }

    const html = item.content || item["content:encoded"] || item.summary || "";
    const match = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
    return match ? match[1] : "";
}

// 2. Fallback: pobranie obrazka okładkowego (og:image) bezpośrednio ze strony artykułu, jeśli RSS go nie zawiera
async function fetchOgImage(articleUrl) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(articleUrl, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            }
        });
        clearTimeout(timer);
        if (!res.ok) return "";
        const html = await res.text();
        const ogMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
        if (ogMatch && ogMatch[1]) {
            return ogMatch[1].startsWith("http") ? ogMatch[1] : new URL(ogMatch[1], articleUrl).href;
        }
    } catch {
        return "";
    }
    return "";
}

function cleanRssText(raw) {
    if (!raw) return "";
    return raw
        .replace(/<[^>]*>?/gm, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/Nature,\s*Published online:[^.]+\.?/gi, "")
        .replace(/doi:\s*10\.\d+\/[^\s]+/gi, "")
        .replace(/(Czytaj dalej|Więcej na ten temat|Artykuł pochodzi z serwisu|The post .* appeared first on).*$/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function classifyCategory(title, description, defaultCategory) {
    const text = `${title} ${description}`.toLowerCase();
    if (/(sztuczn\w+ inteligencj|artificial intelligence|\bai\b|llm|gpt|sieci neuronow|uczeni\w+ maszynow|robotyk|algorytm|komputer\w* kwantow|półprzewodnik|procesor)/.test(text)) {
        return "AI i Tech";
    }
    if (/(kosmos|galaktyk|egzoplanet|teleskop|nasa|esa|mars|księżyc|gwiazd|czarn\w+ dziur|asteroida|orbita|rakieta|wszechświat|astronaut)/.test(text)) {
        return "Kosmos";
    }
    if (/(biologi|komórk|genetyk|\bdna\b|\brna\b|białk|ewolucj|gatunk|mikrobiom|mózg|neuron|medycyn|szczepionk|terapi|wirus|bakteri)/.test(text)) {
        return "Biologia";
    }
    return defaultCategory;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        console.warn(`Tłumaczenie odroczone (${cleanTitle.slice(0, 35)}...): ${err.message}`);
        return {
            title: cleanTitle,
            description: cleanDesc,
            translated: false
        };
    }
}

async function updateNasaApod(dataDir) {
    try {
        const res = await fetch("https://apod.nasa.gov/apod/astropix.html", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // Wyciągnięcie obrazka ze strony APOD
        const imgMatch = html.match(/<IMG\s+SRC="([^"]+)"/i);
        const imageUrl = imgMatch ? new URL(imgMatch[1], "https://apod.nasa.gov/apod/").href : "";

        // Wyciągnięcie tytułu (pogrubiony nagłówek pod zdjęciem)
        const titleMatch = html.match(/<b>\s*([^<]+?)\s*<\/b>/i);
        const rawTitle = titleMatch ? titleMatch[1].trim() : "NASA Astronomy Picture of the Day";

        // Wyciągnięcie treści wyjaśnienia (Explanation:)
        const expMatch = html.match(/Explanation:\s*<\/b>([\s\S]*?)<p>\s*<center>/i);
        const rawDesc = expMatch ? cleanRssText(expMatch[1]) : "";

        const tr = await translateArticle(rawTitle, rawDesc);
        const apodData = {
            title: tr.title,
            originalTitle: rawTitle,
            description: tr.description.length > 260 ? tr.description.slice(0, 260) + "..." : tr.description,
            image: imageUrl,
            link: "https://apod.nasa.gov/apod/astropix.html",
            date: new Date().toLocaleDateString("pl-PL")
        };

        fs.writeFileSync(path.join(dataDir, "apod.json"), JSON.stringify(apodData), "utf-8");
        console.log("Zaktualizowano NASA APOD ze strony głównej:", apodData.title, imageUrl);
    } catch (err) {
        console.warn("Nie udało się pobrać NASA APOD:", err.message);
    }
}

function generateSitemap() {
    const rootDir = __dirname;
    const today = new Date().toISOString().slice(0, 10);
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://markucjusz.github.io/Odkrywam-Przyszlosc/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
    fs.writeFileSync(path.join(rootDir, "sitemap.xml"), sitemap, "utf-8");
}

async function loadNews() {
    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const newsFile = path.join(dataDir, "news.json");
    const now = Date.now();

    const cachedMap = new Map();
    if (fs.existsSync(newsFile)) {
        try {
            const existing = JSON.parse(fs.readFileSync(newsFile, "utf-8"));
            for (const item of existing) {
                if (item.link && (!item.timestamp || (now - item.timestamp) <= RETENTION_MS)) {
                    if (item.category === "AI") item.category = "AI i Tech";
                    if (item.category === "Nauka") item.category = "Fizyka i Ziemia";
                    if (!item.id) item.id = makeShortId(item.link);
                    cachedMap.set(item.link, item);
                }
            }
            console.log(`Wczytano z archiwum ${cachedMap.size} aktualnych artykułów.`);
        } catch (err) {
            console.warn("Nie udało się odczytać poprzedniego news.json:", err.message);
        }
    }

    for (const feed of feeds) {
        try {
            const rss = await parser.parseURL(feed.url);
            console.log(`OK [${feed.lang.toUpperCase()} | ${feed.source}]: sprawdzam ${rss.items.length} wpisów`);

            for (const item of rss.items.slice(0, 6)) {
                if (!item.link) continue;

                const cached = cachedMap.get(item.link);
                // Jeśli wpis jest już w archiwum, ma tłumaczenie i ma obrazek -> pomijamy
                if (cached && (cached.lang === "pl" || cached.translated) && cached.image) {
                    continue;
                }

                let imageUrl = (cached && cached.image) || extractImageFromRss(item);
                if (!imageUrl) {
                    imageUrl = await fetchOgImage(item.link);
                }

                // Jeśli brakowało tylko obrazka, a tłumaczenie było gotowe -> aktualizujemy sam obrazek
                if (cached && (cached.lang === "pl" || cached.translated)) {
                    cached.image = imageUrl;
                    cachedMap.set(item.link, cached);
                    continue;
                }

                const rawTitle = cleanRssText(item.title || "");
                const rawDesc = cleanRssText(item.contentSnippet || item.content || "");

                let title = rawTitle;
                let fullDescription = rawDesc;
                let translated = false;

                if (feed.lang === "en") {
                    const tr = await translateArticle(rawTitle, rawDesc);
                    title = tr.title;
                    fullDescription = tr.description;
                    translated = tr.translated;
                    await sleep(650);
                }

                const shortDesc = fullDescription.length > 200
                    ? fullDescription.slice(0, 200) + "..."
                    : fullDescription;

                const finalCategory = classifyCategory(title, fullDescription, feed.category);

                cachedMap.set(item.link, {
                    id: makeShortId(item.link),
                    title,
                    originalTitle: feed.lang === "en" ? rawTitle : "",
                    description: shortDesc,
                    fullDescription,
                    link: item.link,
                    category: finalCategory,
                    source: feed.source,
                    lang: feed.lang,
                    translated,
                    date: item.pubDate ? new Date(item.pubDate).toLocaleDateString("pl-PL") : "",
                    timestamp: item.pubDate ? new Date(item.pubDate).getTime() : now,
                    image: imageUrl
                });
            }
        } catch (err) {
            console.error(`BŁĄD [${feed.source}] (${feed.url}):`, err.message);
        }
    }

    let retryCount = 0;
    for (const [link, entry] of cachedMap.entries()) {
        if (entry.lang === "en" && !entry.translated && retryCount < 6) {
            const tr = await translateArticle(entry.originalTitle || entry.title, entry.fullDescription || entry.description);
            if (tr.translated) {
                entry.title = tr.title;
                entry.fullDescription = tr.description;
                entry.description = tr.description.length > 200 ? tr.description.slice(0, 200) + "..." : tr.description;
                entry.translated = true;
                cachedMap.set(link, entry);
            }
            retryCount++;
            await sleep(650);
        }
    }

    const merged = Array.from(cachedMap.values())
        .filter(item => !item.timestamp || (now - item.timestamp) <= RETENTION_MS)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 120);

    fs.writeFileSync(newsFile, JSON.stringify(merged), "utf-8");
    console.log(`Zapisano w archiwum łącznie ${merged.length} artykułów.`);

    await updateNasaApod(dataDir);
    generateSitemap();
}

loadNews();
