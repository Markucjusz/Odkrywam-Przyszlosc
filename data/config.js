const RSS_PROXY =
"https://api.rss2json.com/v1/api.json?rss_url=";

const FEEDS = {

  ai: [
    {
      source: "OpenAI",
      url: "https://openai.com/news/rss.xml"
    },
    {
      source: "Hugging Face",
      url: "https://huggingface.co/blog/feed.xml"
    }
  ],

  space: [
    {
      source: "NASA",
      url: "https://www.nasa.gov/rss/dyn/breaking_news.rss"
    },
    {
      source: "ESA",
      url: "https://www.esa.int/rssfeed/Our_Activities/Space_Science"
    }
  ],

  biology: [
    {
      source: "Nature",
      url: "https://www.nature.com/subjects/biology.rss"
    }
  ],

  technology: [
    {
      source: "MIT Technology Review",
      url: "https://www.technologyreview.com/feed/"
    }
  ],

  earth: [
    {
      source: "NASA Earth Observatory",
      url: "https://earthobservatory.nasa.gov/feeds/image-of-the-day.rss"
    }
  ]

};
