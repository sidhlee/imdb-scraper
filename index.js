require("dotenv").config();
const fs = require("fs");
const request = require("request-promise");
const requestSync = require("request");
const cheerio = require("cheerio");
const Nightmare = require("nightmare");

const nightmare = Nightmare({ show: true }); // show browser for debugging

// define what data we want
const sampleResult = {
  title: "Parasite",
  rank: 1,
  imdbRating: 8.6,
  descriptionUrl:
    "https://www.imdb.com/title/tt6751668/?pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=ea4e08e1-c8a3-47b5-ac3a-75026647c16e&pf_rd_r=3EJ81GA2FCT7ZNMXG620&pf_rd_s=center-1&pf_rd_t=15506&pf_rd_i=moviemeter&ref_=chtmvm_tt_1",
  // shows carousel of images with javascript
  posterUrl:
    "https://www.imdb.com/title/tt6751668/mediaviewer/rm3194916865",
  // url for each image in the carousel
  posterImageUrl:
    "https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_SY1000_CR0,0,674,1000_AL_.jpg"
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
    return movies.slice(0, 10); // ScraperAPI too slow
  } catch (e) {
    console.log(e);
  }
}

async function scrapePosterUrl(movies) {
  for (let i = 0; i < movies.length; i++) {
    try {
      const html = await request.get(
        process.env.SCRAPER_API + movies[i].descriptionUrl
      );
      const $ = await cheerio.load(html);
      movies[i].posterUrl =
        "https://imdb.com" + $("div.poster > a").attr("href");
      await sleep(2000);
    } catch (err) {
      console.log(err);
    }
  }
  return movies;
}

async function sleep(ms) {
  const randomize = ms => {
    return ms + Math.random() * ms;
  };
  return new Promise(resolve => setTimeout(resolve, randomize(ms)));
}

async function scrapePosterImageUrl(movies) {
  for (let i = 0; i < movies.length; i++) {
    try {
      const posterImageUrl = await nightmare
        .goto(movies[i].posterUrl)
        .evaluate(() =>
          $(
            "#photo-container > div > div:nth-child(3) > div > div.pswp__scroll-wrap > div.pswp__container > div:nth-child(2) > div > img:nth-child(2)"
          ).attr("src")
        );
      movies[i].posterImageUrl = posterImageUrl;
      console.log(movies[i]);
    } catch (err) {
      console.error(err);
    }
  }

  return movies;
}

async function savePosterImagesToDisk(movie) {
  requestSync
    .get(movie.posterImageUrl)
    .pipe(fs.createWriteStream(`./posters/${movie.rank}.png`));
}

async function main() {
  let movies;
  if (!fs.existsSync("./movies.json")) {
    movies = await scrapeTitlesRanksAndRatings();
    movies = await scrapePosterUrl(movies);
    movies = await scrapePosterImageUrl(movies);
    fs.writeFileSync("./movies.json", JSON.stringify(movies));
  }
  movies = JSON.parse(fs.readFileSync("./movies.json"));
  movies.forEach(movie => {
    savePosterImagesToDisk(movie);
  });
}

main();
