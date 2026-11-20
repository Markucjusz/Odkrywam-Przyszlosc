// --- 1. Animowane tło gwiezdne (Canvas) ---
(function initStarfield() {
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let stars = [];
    const count = 85;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createStars() {
        stars = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.4 + 0.3,
            speed: Math.random() * 0.22 + 0.05,
            alpha: Math.random() * 0.65 + 0.2
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(186, 230, 253, ${s.alpha})`;
            ctx.fill();
            s.y -= s.speed;
            if (s.y < 0) {
                s.y = canvas.height;
                s.x = Math.random() * canvas.width;
            }
        }
        requestAnimationFrame(draw);
    }

    resize();
    createStars();
    draw();
    window.addEventListener("resize", () => {
        resize();
        createStars();
    });
})();

// --- 2. Stan aplikacji i zakładki (localStorage) ---
let allNews = [];
let activeCategory = "Wszystkie";
let activeSource = "Wszystkie";
let searchQuery = "";
let showOnlySaved = false;
let currentModalItem = null;

const STORAGE_KEY = "odkrywam_przyszlosc_saved_v1";
let savedLinks = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

function saveBookmarksToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...savedLinks]));
    document.getElementById("bookmarks-count").textContent = savedLinks.size;
}

function toggleBookmark(link) {
    if (savedLinks.has(link)) {
        savedLinks.delete(link);
    } else {
        savedLinks.add(link);
    }
    saveBookmarksToStorage();
    renderAll();
}

const categoryIcons = {
    "Kosmos": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>`,
    "AI": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></svg>`,
    "Biologia": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 9.1"/><path d="m12 12 3.9 7.8"/></svg>`,
    "Nauka": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 3h6m-5 0v5.5L5 17a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8.5V3"/></svg>`
};

function getThemeClass(category) {
    const map = {
        "Kosmos": "theme-kosmos",
        "AI": "theme-ai",
        "Biologia": "theme-biologia",
        "Nauka": "theme-nauka"
    };
    return map[category] || "theme-nauka";
}

// --- 3. Modal podglądu ---
const modal = document.getElementById("article-modal");
document.getElementById("modal-close").addEventListener("click", () => modal.close());
modal.addEventListener("click", e => {
    if (e.target === modal) modal.close();
});

function openModal(item) {
    currentModalItem = item;
    const category = item.category || "Nauka";
    const visual = document.getElementById("modal-visual");
    visual.className = `modal-visual ${getThemeClass(category)}`;
    visual.innerHTML = "";

    if (item.image) {
        const img = document.createElement("img");
        img.src = item.image;
        img.alt = "";
        img.onerror = () => img.remove();
        visual.appendChild(img);
    }

    document.getElementById("modal-badge").textContent = category;
    document.getElementById("modal-source").textContent = item.source || "";
    document.getElementById("modal-date").textContent = item.date || "";
    document.getElementById("modal-title").textContent = item.title;
    document.getElementById("modal-desc").textContent = item.fullDescription || item.description;
    document.getElementById("modal-link").href = item.link;

    const modalBookmarkBtn = document.getElementById("modal-bookmark");
    modalBookmarkBtn.textContent = savedLinks.has(item.link) ? "★ Zapisano w schowku" : "☆ Zapisz na później";
    modalBookmarkBtn.onclick = () => {
        toggleBookmark(item.link);
        modalBookmarkBtn.textContent = savedLinks.has(item.link) ? "★ Zapisano w schowku" : "☆ Zapisz na później";
    };

    modal.showModal();
}

// --- 4. Renderowanie wyróżnionego artykułu i siatki ---
function renderFeatured(list) {
    const slot = document.getElementById("featured-slot");
    slot.innerHTML = "";
    if (list.length === 0 || showOnlySaved || searchQuery.trim() !== "") return;

    const top = list[0];
    const category = top.category || "Nauka";

    const card = document.createElement("article");
    card.className = "featured-card";

    const visual = document.createElement("div");
    visual.className = `featured-visual ${getThemeClass(category)}`;

    if (top.image) {
        const img = document.createElement("img");
        img.src = top.image;
        img.alt = "";
        img.onerror = () => img.remove();
        visual.appendChild(img);
    }

    const tag = document.createElement("span");
    tag.className = "featured-tag";
    tag.textContent = "Wyróżnione odkrycie";
    visual.appendChild(tag);

    const content = document.createElement("div");
    content.className = "featured-content";

    const meta = document.createElement("div");
    meta.className = "featured-meta";
    meta.textContent = `${category.toUpperCase()} • ${top.source || "Źródło naukowe"} ${top.date ? "• " + top.date : ""}`;

    const title = document.createElement("h2");
    title.textContent = top.title;

    const desc = document.createElement("p");
    desc.textContent = top.description;

    const actions = document.createElement("div");
    actions.className = "featured-actions";

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.className = "btn-primary";
    previewBtn.textContent = "Szybki podgląd";
    previewBtn.onclick = () => openModal(top);

    const extLink = document.createElement("a");
    extLink.href = top.link;
    extLink.target = "_blank";
    extLink.rel = "noopener noreferrer";
    extLink.className = "btn-secondary";
    extLink.textContent = "Źródło ↗";

    actions.append(previewBtn, extLink);
    content.append(meta, title, desc, actions);
    card.append(visual, content);
    slot.appendChild(card);
}

function renderAll() {
    const container = document.getElementById("news-container");
    const countLabel = document.getElementById("articles-count");
    const feedHeading = document.getElementById("feed-heading");
    container.innerHTML = "";

    const filtered = allNews.filter(item => {
        if (showOnlySaved && !savedLinks.has(item.link)) return false;
        if (activeCategory !== "Wszystkie" && item.category !== activeCategory) return false;
        if (activeSource !== "Wszystkie" && item.source !== activeSource) return false;
        const q = searchQuery.toLowerCase().trim();
        if (q) {
            const inTitle = (item.title || "").toLowerCase().includes(q);
            const inDesc = (item.description || "").toLowerCase().includes(q);
            if (!inTitle && !inDesc) return false;
        }
        return true;
    });

    feedHeading.textContent = showOnlySaved ? "Zapisane publikacje" : "Strumień odkryć";
    countLabel.textContent = `Wyników: ${filtered.length}`;

    renderFeatured(filtered);

    const showFeatured = filtered.length > 0 && !showOnlySaved && searchQuery.trim() === "";
    const gridItems = showFeatured ? filtered.slice(1) : filtered;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Brak publikacji</h3>
                <p>${showOnlySaved ? "Nie masz jeszcze żadnych zapisanych artykułów. Kliknij ikonę zakładki na wybranej karcie." : "Zmień filtry lub frazę wyszukiwania, aby zobaczyć inne odkrycia."}</p>
            </div>
        `;
        return;
    }

    gridItems.forEach(item => {
        const category = item.category || "Nauka";
        const isSaved = savedLinks.has(item.link);

        const card = document.createElement("article");
        card.className = "news-card";

        const visual = document.createElement("div");
        visual.className = `card-visual ${getThemeClass(category)}`;

        if (item.image) {
            const img = document.createElement("img");
            img.src = item.image;
            img.alt = "";
            img.className = "card-visual-img";
            img.loading = "lazy";
            img.onerror = () => img.remove();
            visual.appendChild(img);
        }

        const svgWrap = document.createElement("div");
        svgWrap.className = "card-visual-svg";
        svgWrap.innerHTML = categoryIcons[category] || categoryIcons["Nauka"];

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = category;

        const source = document.createElement("span");
        source.className = "source-tag";
        source.textContent = item.source || "";

        visual.append(svgWrap, badge, source);

        const body = document.createElement("div");
        body.className = "card-body";

        if (item.date) {
            const dateEl = document.createElement("div");
            dateEl.className = "card-date";
            dateEl.textContent = item.date;
            body.appendChild(dateEl);
        }

        const title = document.createElement("h3");
        title.textContent = item.title;

        const desc = document.createElement("p");
        desc.textContent = item.description;

        const footer = document.createElement("div");
        footer.className = "card-footer";

        const previewBtn = document.createElement("button");
        previewBtn.type = "button";
        previewBtn.className = "card-btn-preview";
        previewBtn.textContent = "Podgląd artykułu →";
        previewBtn.onclick = () => openModal(item);

        const rightActions = document.createElement("div");
        rightActions.className = "card-actions-right";

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = `icon-btn ${isSaved ? "saved" : ""}`;
        saveBtn.title = isSaved ? "Usuń z zapisanych" : "Zapisz na później";
        saveBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
        saveBtn.onclick = () => toggleBookmark(item.link);

        const extBtn = document.createElement("a");
        extBtn.href = item.link;
        extBtn.target = "_blank";
        extBtn.rel = "noopener noreferrer";
        extBtn.className = "icon-btn";
        extBtn.title = "Otwórz stronę źródłową";
        extBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

        rightActions.append(saveBtn, extBtn);
        footer.append(previewBtn, rightActions);
        body.append(title, desc, footer);

        card.append(visual, body);
        container.appendChild(card);
    });
}

// --- 5. Obsługa zdarzeń ---
document.querySelectorAll(".filter-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-tabs button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = btn.dataset.category;
        renderAll();
    });
});

document.getElementById("source-filter").addEventListener("change", e => {
    activeSource = e.target.value;
    renderAll();
});

document.getElementById("search-input").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderAll();
});

const bookmarksToggle = document.getElementById("bookmarks-toggle");
bookmarksToggle.addEventListener("click", () => {
    showOnlySaved = !showOnlySaved;
    bookmarksToggle.classList.toggle("active", showOnlySaved);
    renderAll();
});

document.getElementById("brand-reset").addEventListener("click", e => {
    e.preventDefault();
    activeCategory = "Wszystkie";
    activeSource = "Wszystkie";
    searchQuery = "";
    showOnlySaved = false;
    document.getElementById("search-input").value = "";
    document.getElementById("source-filter").value = "Wszystkie";
    bookmarksToggle.classList.remove("active");
    document.querySelectorAll(".filter-tabs button").forEach(b => {
        b.classList.toggle("active", b.dataset.category === "Wszystkie");
    });
    renderAll();
});

// --- 6. Pobranie danych ---
saveBookmarksToStorage();

fetch("data/news.json")
    .then(res => {
        if (!res.ok) throw new Error("Nie udało się załadować pliku data/news.json");
        return res.json();
    })
    .then(news => {
        allNews = news;
        document.getElementById("stat-total").textContent = news.length;
        if (news.length > 0 && news[0].date) {
            document.getElementById("last-sync").textContent = `Aktualizacja: ${news[0].date}`;
        }
        renderAll();
    })
    .catch(err => {
        document.getElementById("articles-count").textContent = "Błąd danych";
        document.getElementById("news-container").innerHTML = `
            <div class="empty-state">
                <h3>Błąd wczytywania bazy newsów</h3>
                <p>${err.message}</p>
            </div>
        `;
    });
