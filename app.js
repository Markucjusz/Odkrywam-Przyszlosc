
fetch("data/news.json")
.then(res => res.json())
.then(news => {

    const container =
        document.getElementById("news-container");

    container.innerHTML = "";

    news.forEach(item => {

        const card =
            document.createElement("div");

        card.className = "news-card";

        card.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <a href="${item.link}"
               target="_blank">
               Czytaj więcej
            </a>
        `;

        container.appendChild(card);

    });

});
