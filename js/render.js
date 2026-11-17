/*
=========================================
RENDER.JS
Odkrywam Przyszłość
=========================================
*/

/*
=========================================
TWORZENIE KARTY
=========================================
*/

function createCard(article){

    const imageHtml = article.image
        ? `
        <img
            src="${article.image}"
            alt="${article.title}"
            loading="lazy">
        `
        : "";

    return `

    <article class="card">

        ${imageHtml}

        <div class="card-content">

            <div class="source">

                ${article.source}

            </div>

            <h3>

                ${article.title}

            </h3>

            <p>

                ${article.description}

            </p>

            <a
                href="${article.url}"
                target="_blank"
                rel="noopener noreferrer">

                Czytaj więcej →

            </a>

        </div>

    </article>

    `;
}

/*
=========================================
RENDER KATEGORII
=========================================
*/

function renderCategory(category){

    const container =
        document.getElementById(
            category + "-content"
        );

    if(!container){
        return;
    }

    const categoryArticles =

        ARTICLES.filter(

            article =>
            article.category === category

        );

    container.innerHTML = "";

    if(categoryArticles.length === 0){

        container.innerHTML = `

        <div class="card">

            <div class="card-content">

                <h3>
                    Brak danych
                </h3>

                <p>
                    Nie udało się pobrać
                    aktualnych artykułów.
                </p>

            </div>

        </div>

        `;

        return;
    }

    categoryArticles.forEach(article=>{

        container.innerHTML +=
            createCard(article);

    });

}

/*
=========================================
ODKRYCIE DNIA
=========================================
*/

function renderDiscovery(){

    const discovery =

        ARTICLES.find(
            article =>
            article.category === "space"
        )

        ||

        ARTICLES[0];

    if(!discovery){

        document
            .getElementById(
                "discovery-title"
            )
            .textContent =
            "Brak danych";

        document
            .getElementById(
                "discovery-text"
            )
            .textContent =
            "Nie udało się pobrać odkrycia dnia.";

        return;
    }

    document
        .getElementById(
            "discovery-title"
        )
        .textContent =
        discovery.title;

    document
        .getElementById(
            "discovery-text"
        )
        .textContent =
        discovery.description;
}

/*
=========================================
WYSZUKIWARKA
=========================================
*/

function initSearch(){

    const searchInput =
        document.getElementById(
            "search"
        );

    if(!searchInput){
        return;
    }

    searchInput.addEventListener(
    "input",
    function(){

        const query =
            this.value
            .toLowerCase()
            .trim();

        document
        .querySelectorAll(".card")
        .forEach(card=>{

            const text =
                card.textContent
                .toLowerCase();

            card.style.display =

                text.includes(query)

                ? ""

                : "none";

        });

    });

}

/*
=========================================
LICZNIKI
=========================================
*/

function countArticles(category){

    return ARTICLES.filter(
        a => a.category === category
    ).length;

}

/*
=========================================
RENDER CAŁEJ STRONY
=========================================
*/

function renderAll(){

    renderDiscovery();

    renderCategory("ai");

    renderCategory("space");

    renderCategory("biology");

    renderCategory("technology");

    renderCategory("earth");

    initSearch();

    console.log(

        "AI:",
        countArticles("ai")

    );

    console.log(

        "SPACE:",
        countArticles("space")

    );

    console.log(

        "BIOLOGY:",
        countArticles("biology")

    );

    console.log(

        "TECH:",
        countArticles("technology")

    );

    console.log(

        "EARTH:",
        countArticles("earth")

    );

}
