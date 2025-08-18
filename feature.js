// clone.js
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const url = require("url");



// --- Utility: download and save file ---
async function downloadAsset(assetUrl, destPath) {
  try {
    const res = await axios.get(assetUrl, { responseType: "arraybuffer" });
    await fs.outputFile(destPath, res.data);
    // console.log(`Saved: ${destPath}`);
  } catch (err) {
    console.warn(`Failed to download ${assetUrl}: ${err.message}`);
  }
}

// --- Utility: rewrite Next.js optimized images ---
function fixNextImage(assetUrl, baseUrl) {
  try {
    const parsed = new URL(assetUrl, baseUrl);
    if (parsed.pathname.startsWith("/_next/image") && parsed.searchParams.has("url")) {
      const realPath = parsed.searchParams.get("url"); // e.g. /images/avatar.png
      return new URL(realPath, baseUrl).href;
    }
  } catch {
    return assetUrl;
  }
  return assetUrl;
}

// --- Scrape page ---
async function scrapeWithCheerio(targetUrl) {
  const res = await axios.get(targetUrl);
  return res.data;
}

async function scrapeWithPuppeteer(targetUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: "networkidle2" });
  const html = await page.content();
  await browser.close();
  return html;
}

// --- Main clone function ---
async function clonedSiteCommand(targetUrl, folderName) {
  const OUTPUT_DIR = path.join(__dirname, folderName);
  await fs.emptyDir(OUTPUT_DIR);

  let html;
  try {
    html = await scrapeWithCheerio(targetUrl);
  } catch (err) {
    // console.log("Falling back to Puppeteer...");
    html = await scrapeWithPuppeteer(targetUrl);
  }

  const $ = cheerio.load(html);

  // Collect asset links
  let assets = [];

  $("link[rel='stylesheet']").each((i, el) => {
    const href = $(el).attr("href");
    if (href) assets.push({ url: href, subfolder: "css" });
  });

  $("script[src]").each((i, el) => {
    const src = $(el).attr("src");
    if (src) assets.push({ url: src, subfolder: "js" });
  });

  $("img").each((i, el) => {
    const src = $(el).attr("src");
    if (src) assets.push({ url: src, subfolder: "images" });
  });

  $("video source").each((i, el) => {
    const src = $(el).attr("src");
    if (src) assets.push({ url: src, subfolder: "videos" });
  });

  $("img[srcset]").each((i, el) => {
    const srcset = $(el).attr("srcset").split(",");
    srcset.forEach(s => {
      const src = s.trim().split(" ")[0];
      if (src) assets.push({ url: src, subfolder: "images" });
    });
  });

  // Download assets
  for (let asset of assets) {
    let absUrl = fixNextImage(asset.url, targetUrl);
    absUrl = new URL(absUrl, targetUrl).href;

    const parsed = url.parse(absUrl);
    const ext = path.extname(parsed.pathname) || ".bin";

    const destPath = path.join(OUTPUT_DIR, asset.subfolder, path.basename(parsed.pathname));
    await downloadAsset(absUrl, destPath);

    // Rewrite HTML
    const relativePath = `./${asset.subfolder}/${path.basename(parsed.pathname)}`;
    $(`[src='${asset.url}']`).attr("src", relativePath);

// Fix href (for CSS/JS links)
$(`[href='${asset.url}']`).attr("href", relativePath);

// Fix srcset (replace every url in srcset with local copy)
$(`[srcset*='${asset.url}']`).each((i, el) => {
  let srcset = $(el).attr("srcset");
  if (srcset) {
    const newSrcset = srcset
      .split(",")
      .map(s => {
        let [u, scale] = s.trim().split(" ");
        if (u === asset.url || u.includes("_next/image")) {
          return `${relativePath} ${scale || ""}`.trim();
        }
        return s;
      })
      .join(", ");
    $(el).attr("srcset", newSrcset);
  }
});
  }

  // Save final HTML
  await fs.outputFile(path.join(OUTPUT_DIR, "index.html"), $.html());
  return "🎉 Clone completed! Open cloned_site/index.html in browser."
}


// cloneSite(target);

module.exports = clonedSiteCommand;