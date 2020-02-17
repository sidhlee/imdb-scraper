require("dotenv").config();
const fs = require("fs");
const request = require("request-promise");
const cheerio = require("cheerio");

// define what data we want
const sampleResult = {
  title: "Parasite",
  rank: 1,
  imdbRating: 8.6,
  descriptionUrl:
    "https://www.imdb.com/title/tt6751668/?pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=ea4e08e1-c8a3-47b5-ac3a-75026647c16e&pf_rd_r=3EJ81GA2FCT7ZNMXG620&pf_rd_s=center-1&pf_rd_t=15506&pf_rd_i=moviemeter&ref_=chtmvm_tt_1",
  posterUrl:
    "https://www.imdb.com/title/tt6751668/mediaviewer/rm3194916865"
};

async function scrapeTitlesRanksAndRatings() {
  try {
    // const result = await request.get(
    //   // imdb.com will return the original movie title depending on your location
    //   process.env.SCRAPER_API +
    //     "https://www.imdb.com/chart/moviemeter/?ref_=nv_mv_mpm"
    // );
    // fs.writeFileSync("./imdb_main.html", result);
    const result = fs.readFileSync("./imdb_main.html");
    const $ = await cheerio.load(result);

    const movies = $("table > tbody >tr")
      .map((i, elm) => {
        const movieLink = $(elm).find("td.titleColumn > a");
        const title = movieLink.text();
        const descriptionUrl =
          "https://www.imdb.com" + movieLink.attr("href");
        const imdbRating = $(elm)
          .find("td.ratingColumn.imdbRating > strong")
          .text();

        return { title, imdbRating, rank: i + 1, descriptionUrl };
      })
      .get();
    return movies.slice(0, 3);
  } catch (e) {
    console.log(e);
  }
}

async function scrapePosterUrl(movies) {
  const moviesWithPosterUrls = await Promise.all(
    movies.map(async movie => {
      try {
        const html = await request.get(
          process.env.SCRAPER_API + movie.descriptionUrl
        );
        const $ = await cheerio.load(html);
        movie.posterUrl =
          "https://imdb.com" + $("div.poster > a").attr("href");
        await sleep(3000);
        return movie;
      } catch (e) {
        console.error(e);
      }
    })
  );

  return moviesWithPosterUrls;
}

async function sleep(ms) {
  const randomize = ms => {
    return ms + Math.random() * ms;
  };
  return new Promise(resolve => setTimeout(resolve, randomize(ms)));
}

async function main() {
  let movies = await scrapeTitlesRanksAndRatings();
  movies = await scrapePosterUrl(movies);
  console.log(movies);
}

main();
