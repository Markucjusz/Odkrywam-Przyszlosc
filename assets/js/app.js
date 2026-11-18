et allNews = [];

function renderNews(category = "Wszystkie") {
    const container = document.getElementById("news-container");
    container.innerHTML = "";

    const filtered = category === "Wszystkie"
        ? allNews
        : allNews.filter(item => item.category === category);

    if (filtered.length === 0) {
        container.innerHTML = "<p>Brak wiadomości w tej kategorii.</p>";
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement("article");
        card.className = "news-card";

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `${item.category || "Nauka"} ${item.date ? "• " + item.date : ""}`;

        const title = document.createElement("h3");
        title.textContent = item.title;

        const desc = document.createElement("p");
        desc.textContent = item.description;

        const link = document.createElement("a");
        link.href = item.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Czytaj więcej →";

        card.append(badge, title, desc, link);
        container.appendChild(card);
    });
}

document.querySelectorAll("nav button").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderNews(btn.dataset.category);
    });
});

fetch("data/news.json")
    .then(res => {
        if (!res.ok) throw new Error("Nie udało się załadować pliku news.json");
        return res.json();
    })
    .then(news => {
        allNews = news;
        renderNews("Wszystkie");
    })
    .catch(err => {
        document.getElementById("news-container").innerHTML =
            `<p>Wystąpił problem z pobraniem aktualności: ${err.message}</p>`;
    });

