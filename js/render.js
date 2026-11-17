function createCard(article){

    return `

    <article class="card">

        ${
            article.image
            ?
            `<img src="${article.image}">`
            :
            ""
        }

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
                target="_blank">

                Czytaj więcej →

            </a>

        </div>

    </article>

    `;

}

function renderCategory(category){

    const target =

    document.getElementById(
        category + "-content"
    );

    if(!target) return;

    target.innerHTML = "";

    ARTICLES

    .filter(
        article =>
        article.category === category
    )

    .forEach(article=>{

        target.innerHTML +=
        createCard(article);

    });

}

function renderDiscovery(){

  const discovery =

    ARTICLES.find(
      article =>
      article.category === "space"
    )

    ||

    ARTICLES[0];

  if(!discovery) return;

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

function renderAll(){

    renderDiscovery();

    renderCategory("ai");
    renderCategory("space");
    renderCategory("biology");
    renderCategory("technology");
    renderCategory("earth");

}
