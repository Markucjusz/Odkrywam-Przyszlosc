
const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser();

const feeds = [

"https://www.sciencedaily.com/rss/top.xml",

"https://www.nasa.gov/news-release/feed/",

"https://www.esa.int/rssfeed/Our_Activities/Space_Science"

];

async function loadNews(){

    let output=[];

    for(const feed of feeds){

        try{

            const rss=
                await parser.parseURL(feed);

            rss.items.slice(0,5)
            .forEach(item=>{

                output.push({

                    title:item.title,

                    description:
                    item.contentSnippet ||
                    item.content ||
                    "",

                    link:item.link

                });

            });

        }catch(err){
