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

// --- 2. Motyw jasny / ciemny ---
const THEME_KEY = "odkrywam_przyszlosc_theme";
const themeToggleBtn = document.getElementById("theme-toggle");
const sunIcon = document.getElementById("theme-icon-sun");
const moonIcon = document.getElementById("theme-icon-moon");

function applyTheme(theme) {
    const isLight = theme === "light";
    document.body.classList.toggle("light-theme", isLight);
    sunIcon.style.display = isLight ? "none" : "block";
    moonIcon.style.display = isLight ? "block" : "none";
}

applyTheme(localStorage.getItem(THEME_KEY) || "dark");

themeToggleBtn.addEventListener("click", () => {
    const next = document.body.classList.contains("light-theme") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
});

// --- 3. Powiadomienia Toast i udostępnianie (Deep Link) ---
let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function getDeepLink(item) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("article", item.id || item.link);
    return url.toString();
}

async function shareArticle(item, useDeepLink = false) {
    const targetUrl = useDeepLink ? getDeepLink(item) : item.link;
    if (navigator.share) {
        try {
            await navigator.share({ title: item.title, url: targetUrl });
            return;
        } catch {
            // Przechodzimy do kopiowania w schowku
        }
    }
    try {
        await navigator.clipboard.writeText(targetUrl);
        showToast(useDeepLink ? "Skopiowano link do podglądu na portalu." : "Skopiowano link do artykułu.");
    } catch {
        showToast("Nie udało się skopiować linku.");
    }
}

// --- 4. Stan aplikacji, historia przeczytanych i zakładki ---
let allNews = [];
let currentFilteredList = [];
let currentModalIndex = -1;
let activeCategory = "Wszystkie";
let activeLang = "Wszystkie";
let activeSource = "Wszystkie";
let activeSort = "newest";
let searchQuery = "";
let showOnlySaved = false;
let visibleLimit = 12;

const STORAGE_SAVED_KEY = "odkrywam_przyszlosc_saved_v1";
const STORAGE_READ_KEY = "odkrywam_przyszlosc_read_v1";
const STORAGE_VISIT_KEY = "odkrywam_przyszlosc_last_visit_v1";

let savedLinks = new Set(JSON.parse(localStorage.getItem(STORAGE_SAVED_KEY) || "[]"));
let readLinks = new Set(JSON.parse(localStorage.getItem(STORAGE_READ_KEY) || "[]"));

function saveBookmarksToStorage() {
    localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify([...savedLinks]));
    document.getElementById("bookmarks-count").textContent = savedLinks.size;
}

function markAsRead(link) {
    if (!link || readLinks.has(link)) return;
    readLinks.add(link);
    localStorage.setItem(STORAGE_READ_KEY, JSON.stringify([...readLinks]));
    document.getElementById("stat-read").textContent = readLinks.size;
}

function toggleBookmark(link) {
    if (savedLinks.has(link)) {
        savedLinks.delete(link);
        showToast("Usunięto ze schowka.");
    } else {
        savedLinks.add(link);
        showToast("Zapisano artykuł w schowku.");
    }
    saveBookmarksToStorage();
    renderAll();
}

const categoryIcons = {
    "Kosmos": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>`,
    "AI i Tech": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></svg>`,
    "Biologia": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 9.1"/><path d="m12 12 3.9 7.8"/></svg>`,
    "Fizyka i Ziemia": `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
};

function getThemeClass(category) {
    const map = {
        "Kosmos": "theme-kosmos",
        "AI i Tech": "theme-ai",
        "Biologia": "theme-biologia",
        "Fizyka i Ziemia": "theme-fizyka"
    };
    return map[category] || "theme-fizyka";
}

function getLangLabel(item) {
    if (item.lang === "pl") return "PL";
    return item.translated ? "EN → PL" : "EN";
}

function estimateReadTime(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 180));
    return `~${mins} min`;
}

// --- 5. Modal podglądu z obsługą strzałek ---
const modal = document.getElementById("article-modal");
const prevBtn = document.getElementById("modal-prev");
const nextBtn = document.getElementById("modal-next");

function closeModalAndCleanUrl() {
    modal.close();
    const url = new URL(window.location.href);
    if (url.searchParams.has("article")) {
        url.searchParams.delete("article");
        window.history.replaceState({}, "", url.pathname + url.search);
    }
}

document.getElementById("modal-close").addEventListener("click", closeModalAndCleanUrl);
modal.addEventListener("click", e => {
    if (e.target === modal) closeModalAndCleanUrl();
});

function openModal(item) {
    const idx = currentFilteredList.findIndex(x => x.link === item.link);
    currentModalIndex = idx;

    markAsRead(item.link);
    renderAll();

    const category = item.category || "Fizyka i Ziemia";
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

    document.getElementById("modal-badge").textContent = `${category} • ${getLangLabel(item)}`;
    document.getElementById("modal-source").textContent = item.source || "";
    document.getElementById("modal-date").textContent = item.date || "";
    document.getElementById("modal-readtime").textContent = `• ${estimateReadTime(item.fullDescription || item.description)} czytania`;
    document.getElementById("modal-title").textContent = item.title;

    const origEl = document.getElementById("modal-original-title");
    if (item.originalTitle && item.originalTitle !== item.title) {
        origEl.textContent = `Oryginał: ${item.originalTitle}`;
        origEl.style.display = "block";
    } else {
        origEl.style.display = "none";
    }

    document.getElementById("modal-desc").textContent = item.fullDescription || item.description;
    const extLink = document.getElementById("modal-link");
    extLink.href = item.link;
    extLink.onclick = () => markAsRead(item.link);

    const modalBookmarkBtn = document.getElementById("modal-bookmark");
    modalBookmarkBtn.textContent = savedLinks.has(item.link) ? "★ Zapisano w schowku" : "☆ Zapisz na później";
    modalBookmarkBtn.onclick = () => {
        toggleBookmark(item.link);
        modalBookmarkBtn.textContent = savedLinks.has(item.link) ? "★ Zapisano w schowku" : "☆ Zapisz na później";
    };

    document.getElementById("modal-share").onclick = () => shareArticle(item, true);

    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx === -1 || idx >= currentFilteredList.length - 1;

    if (!modal.open) {
        modal.showModal();
    }
}

prevBtn.addEventListener("click", () => {
    if (currentModalIndex > 0) {
        openModal(currentFilteredList[currentModalIndex - 1]);
    }
});

nextBtn.addEventListener("click", () => {
    if (currentModalIndex >= 0 && currentModalIndex < currentFilteredList.length - 1) {
        openModal(currentFilteredList[currentModalIndex + 1]);
    }
});

document.addEventListener("keydown", e => {
    if (!modal.open) return;
    if (e.key === "ArrowLeft" && !prevBtn.disabled) {
        openModal(currentFilteredList[currentModalIndex - 1]);
    } else if (e.key === "ArrowRight" && !nextBtn.disabled) {
        openModal(currentFilteredList[currentModalIndex + 1]);
    }
});

// --- 6. NASA APOD Banner ---
function renderApod(apod) {
    const banner = document.getElementById("apod-banner");
    if (!apod || !apod.title) return;

    banner.style.display = "grid";
    banner.innerHTML = "";

    const media = document.createElement("div");
    media.className = "apod-media theme-kosmos";
    if (apod.image) {
        const img = document.createElement("img");
        img.src = apod.image;
        img.alt = apod.title;
        img.loading = "lazy";
        img.onerror = () => img.remove();
        media.appendChild(img);
    }

    const content = document.createElement("div");
    content.className = "apod-content";

    const label = document.createElement("div");
    label.className = "apod-label";
    label.textContent = `NASA ASTRONOMICZNE ZDJĘCIE DNIA • ${apod.date || ""}`;

    const h3 = document.createElement("h3");
    h3.textContent = apod.title;

    const p = document.createElement("p");
    p.textContent = apod.description;

    const link = document.createElement("a");
    link.href = apod.link || "https://apod.nasa.gov/apod/astropix.html";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "apod-link";
    link.textContent = "Zobacz pełny opis i obraz w wysokiej rozdzielczości ↗";

    content.append(label, h3, p, link);
    banner.append(media, content);
}

// --- 7. Renderowanie wyróżnionego artykułu i siatki ---
function renderFeatured(list) {
    const slot = document.getElementById("featured-slot");
    slot.innerHTML = "";
    if (list.length === 0 || showOnlySaved || searchQuery.trim() !== "") return;

    const top = list[0];
    const category = top.category || "Fizyka i Ziemia";

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
    tag.textContent = `Wyróżnione • ${getLangLabel(top)}`;
    visual.appendChild(tag);

    const content = document.createElement("div");
    content.className = "featured-content";

    const meta = document.createElement("div");
    meta.className = "featured-meta";
    meta.textContent = `${category.toUpperCase()} • ${top.source || "Źródło naukowe"} ${top.date ? "• " + top.date : ""} • ${estimateReadTime(top.fullDescription || top.description)}`;

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
    extLink.onclick = () => {
        markAsRead(top.link);
        renderAll();
    };

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "btn-secondary";
    shareBtn.textContent = "Udostępnij";
    shareBtn.onclick = () => shareArticle(top, true);

    actions.append(previewBtn, extLink, shareBtn);
    content.append(meta, title, desc, actions);
    card.append(visual, content);
    slot.appendChild(card);
}

function renderAll() {
    const container = document.getElementById("news-container");
    const countLabel = document.getElementById("articles-count");
    const feedHeading = document.getElementById("feed-heading");
    const paginationBar = document.getElementById("pagination-bar");
    container.innerHTML = "";

    const filtered = allNews.filter(item => {
        if (showOnlySaved && !savedLinks.has(item.link)) return false;
        if (activeCategory !== "Wszystkie" && item.category !== activeCategory) return false;
        if (activeLang !== "Wszystkie" && (item.lang || "en") !== activeLang) return false;
        if (activeSource !== "Wszystkie" && item.source !== activeSource) return false;
        if (activeSort === "images" && !item.image) return false;
        if (activeSort === "unread" && readLinks.has(item.link)) return false;
        const q = searchQuery.toLowerCase().trim();
        if (q) {
            const inTitle = (item.title || "").toLowerCase().includes(q);
            const inOrig = (item.originalTitle || "").toLowerCase().includes(q);
            const inDesc = (item.description || "").toLowerCase().includes(q);
            if (!inTitle && !inOrig && !inDesc) return false;
        }
        return true;
    });

    currentFilteredList = filtered;

    feedHeading.textContent = showOnlySaved ? "Zapisane publikacje" : "Strumień odkryć";
    countLabel.textContent = `Wyników: ${filtered.length}`;

    renderFeatured(filtered);

    const showFeatured = filtered.length > 0 && !showOnlySaved && searchQuery.trim() === "";
    const remaining = showFeatured ? filtered.slice(1) : filtered;
    const gridItems = remaining.slice(0, visibleLimit);

    if (remaining.length > visibleLimit) {
        paginationBar.style.display = "block";
        document.getElementById("load-more-btn").textContent = `Załaduj więcej (pozostało ${remaining.length - visibleLimit})`;
    } else {
        paginationBar.style.display = "none";
    }

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
        const category = item.category || "Fizyka i Ziemia";
        const isSaved = savedLinks.has(item.link);
        const isRead = readLinks.has(item.link);

        const card = document.createElement("article");
        card.className = `news-card ${isRead ? "is-read" : ""}`;

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
        svgWrap.innerHTML = categoryIcons[category] || categoryIcons["Fizyka i Ziemia"];

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `${category} • ${getLangLabel(item)}`;

        const source = document.createElement("span");
        source.className = "source-tag";
        source.textContent = item.source || "";

        visual.append(svgWrap, badge, source);

        const body = document.createElement("div");
        body.className = "card-body";

        const metaRow = document.createElement("div");
        metaRow.className = "card-meta-row";
        metaRow.innerHTML = `
            <span>${item.date || ""} • ${estimateReadTime(item.fullDescription || item.description)}</span>
            ${isRead ? '<span class="read-pill">✓ Przeczytane</span>' : ""}
        `;
        body.appendChild(metaRow);

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

        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "icon-btn";
        shareBtn.title = "Kopiuj link podglądu";
        shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
        shareBtn.onclick = () => shareArticle(item, true);

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = `icon-btn ${isSaved ? "saved" : ""}`;
        saveBtn.title = isSaved ? "Usuń z zapisanych" : "Zapisz na później";
        saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
        saveBtn.onclick = () => toggleBookmark(item.link);

        const extBtn = document.createElement("a");
        extBtn.href = item.link;
        extBtn.target = "_blank";
        extBtn.rel = "noopener noreferrer";
        extBtn.className = "icon-btn";
        extBtn.title = "Otwórz stronę źródłową";
        extBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        extBtn.onclick = () => {
            markAsRead(item.link);
            renderAll();
        };

        rightActions.append(shareBtn, saveBtn, extBtn);
        footer.append(previewBtn, rightActions);
        body.append(title, desc, footer);

        card.append(visual, body);
        container.appendChild(card);
    });
}

// --- 8. Obsługa zdarzeń ---
function resetPaginationAndRender() {
    visibleLimit = 12;
    renderAll();
}

document.querySelectorAll(".filter-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-tabs button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = btn.dataset.category;
        resetPaginationAndRender();
    });
});

document.getElementById("lang-filter").addEventListener("change", e => {
    activeLang = e.target.value;
    resetPaginationAndRender();
});

document.getElementById("source-filter").addEventListener("change", e => {
    activeSource = e.target.value;
    resetPaginationAndRender();
});

document.getElementById("sort-filter").addEventListener("change", e => {
    activeSort = e.target.value;
    resetPaginationAndRender();
});

document.getElementById("search-input").addEventListener("input", e => {
    searchQuery = e.target.value;
    resetPaginationAndRender();
});

document.getElementById("load-more-btn").addEventListener("click", () => {
    visibleLimit += 12;
    renderAll();
});

const bookmarksToggle = document.getElementById("bookmarks-toggle");
bookmarksToggle.addEventListener("click", () => {
    showOnlySaved = !showOnlySaved;
    bookmarksToggle.classList.toggle("active", showOnlySaved);
    resetPaginationAndRender();
});

document.getElementById("brand-reset").addEventListener("click", e => {
    e.preventDefault();
    activeCategory = "Wszystkie";
    activeLang = "Wszystkie";
    activeSource = "Wszystkie";
    activeSort = "newest";
    searchQuery = "";
    showOnlySaved = false;
    document.getElementById("search-input").value = "";
    document.getElementById("lang-filter").value = "Wszystkie";
    document.getElementById("source-filter").value = "Wszystkie";
    document.getElementById("sort-filter").value = "newest";
    bookmarksToggle.classList.remove("active");
    document.querySelectorAll(".filter-tabs button").forEach(b => {
        b.classList.toggle("active", b.dataset.category === "Wszystkie");
    });
    resetPaginationAndRender();
});

// --- 9. Pobranie danych i licznik nowych od ostatniej wizyty ---
saveBookmarksToStorage();
document.getElementById("stat-read").textContent = readLinks.size;

fetch("data/news.json")
    .then(res => {
        if (!res.ok) throw new Error("Nie udało się załadować pliku data/news.json");
        return res.json();
    })
    .then(news => {
        allNews = news;
        document.getElementById("stat-total").textContent = news.length;
        const plCount = news.filter(n => n.lang === "pl" || n.translated).length;
        const pct = news.length > 0 ? Math.round((plCount / news.length) * 100) : 100;
        document.getElementById("stat-translated").textContent = `${pct}%`;

        if (news.length > 0 && news[0].date) {
            document.getElementById("last-sync").textContent = `Aktualizacja: ${news[0].date}`;
        }

        // Sprawdzenie liczby nowych artykułów od ostatniej wizyty
        const lastVisit = Number(localStorage.getItem(STORAGE_VISIT_KEY) || "0");
        if (lastVisit > 0) {
            const newCount = news.filter(n => (n.timestamp || 0) > lastVisit).length;
            if (newCount > 0) {
                const badge = document.getElementById("new-since-badge");
                badge.textContent = `+${newCount} nowych`;
                badge.style.display = "inline-block";
            }
        }
        localStorage.setItem(STORAGE_VISIT_KEY, String(Date.now()));

        renderAll();

        // Obsługa Deep Linking (?article=...)
        const params = new URLSearchParams(window.location.search);
        const articleParam = params.get("article");
        if (articleParam) {
            const target = news.find(n => n.id === articleParam || n.link === articleParam);
            if (target) openModal(target);
        }
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

fetch("data/apod.json")
    .then(res => (res.ok ? res.json() : null))
    .then(apod => {
        if (apod) renderApod(apod);
    })
    .catch(() => {});
