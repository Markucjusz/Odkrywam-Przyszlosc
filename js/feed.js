const ARTICLES = [];

function addArticle(article){

  ARTICLES.push(article);

}

async function loadFeed(feed, category){

  try {

    const response = await fetch(

      RSS_PROXY +
      encodeURIComponent(feed.url)

    );

    const data =
      await response.json();

    data.items
      .slice(0,8)
      .forEach(item => {

        addArticle({

          category,

          title:
            item.title ||

            "Brak tytułu",

          description:

            (item.description || "")

            .replace(/<[^>]+>/g,'')

            .substring(0,250),

          image:
            item.thumbnail || "",

          url:
            item.link,

          source:
            feed.source,

          date:
            item.pubDate

        });

      });

  }

  catch(error){

    console.error(error);

  }

}

async function loadAllFeeds(){

  const jobs = [];

  Object.entries(FEEDS)
    .forEach(([category, feeds]) => {

      feeds.forEach(feed => {

        jobs.push(
          loadFeed(
            feed,
            category
          )
        );

      });

    });

  await Promise.all(jobs);

  renderAll();

}
