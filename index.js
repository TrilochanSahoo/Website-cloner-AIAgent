#!/usr/bin/env node
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const { URL } = require("url");

// Utility: Scroll page to trigger lazy-loading
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

// Step 1: Try fast axios + cheerio
async function fetchWithAxios(url) {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    // Heuristic: if body is too small, fallback
    const bodyText = $("body").text().trim();
    if (bodyText.length < 50 || $("body").find("script").length > 5) {
      console.log("⚠️ Looks JS-heavy → fallback to Puppeteer");
      return null;
    }
    return html;
  } catch {
    return null;
  }
}

// Step 2: Puppeteer fallback
async function fetchWithPuppeteer(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  await autoScroll(page); // for lazy content
  const html = await page.content();
  await browser.close();
  return html;
}

// Step 3: Download assets and rewrite HTML
async function savePage(html, baseUrl, outDir) {
  const $ = cheerio.load(html);
  await fs.ensureDir(outDir);

  // Subfolders
  const folders = {
    css: path.join(outDir, "css"),
    js: path.join(outDir, "js"),
    images: path.join(outDir, "images")
  };
  for (let folder of Object.values(folders)) {
    await fs.ensureDir(folder);
  }

  const assets = [];
  $("link[href], script[src], img[src]").each((_, el) => {
    const attr = el.name === "link" ? "href" : "src";
    const src = $(el).attr(attr);
    if (!src) return;

    const absoluteUrl = new URL(src, baseUrl).href;
    let subfolder = "";

    if (el.name === "link" && src.endsWith(".css")) subfolder = "css";
    else if (el.name === "script") subfolder = "js";
    else if (el.name === "img") subfolder = "images";
    else subfolder = ""; // fallback

    const filename = path.basename(absoluteUrl.split("?")[0]);
    assets.push({ el, attr, url: absoluteUrl, filename, subfolder });
  });

  for (let asset of assets) {
    try {
      const res = await axios.get(asset.url, { responseType: "arraybuffer" });
      const filePath = path.join(folders[asset.subfolder] || outDir, asset.filename);
      await fs.writeFile(filePath, res.data);

      // Rewrite path in HTML
      const newPath = asset.subfolder ? `${asset.subfolder}/${asset.filename}` : asset.filename;
      $(asset.el).attr(asset.attr, newPath);

      console.log(`✔ Saved ${newPath}`);
    } catch {
      console.warn(`❌ Failed to download ${asset.url}`);
    }
  }

  await fs.writeFile(path.join(outDir, "index.html"), $.html());
  console.log(`✅ Page saved to ${outDir}/index.html`);
}

// Step 4: Main function
async function cloneSite(url, outDir = "cloned_site") {
  let html = await fetchWithAxios(url);
  if (!html) html = await fetchWithPuppeteer(url);

  await savePage(html, url, outDir);
}

// CLI usage
// const [,, siteUrl, outDir] = process.argv;
// if (!siteUrl) {
//   console.log("Usage: clone-site <url> [output-folder]");
//   process.exit(1);
// }

cloneSite('https://hiteshchoudhary.com/', "cloned_site");
