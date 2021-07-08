const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const toc = require("markdown-toc");
const glob = require("glob");
const cheerio = require("cheerio");
const G = require("glob");
const url = require("url");
const Prism = require("prismjs");
const getPort = require("get-port");
const express = require("express");
const SitemapGenerator = require("sitemap-generator");
const loadLanguages = require("prismjs/components/");
const YAML = require("yaml");
loadLanguages();
const defineK = require("./prismjs/k");
defineK(Prism);
const defineIELE = require("./prismjs/iele");
defineIELE(Prism);

/**
 * @type MarkdownIt
 */
const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: function (str, lang) {
    lang = lang
      .trim()
      .replace(/^{\.(.+?)}?/, (_, $1) => $1)
      .trim();
    try {
      const html = Prism.highlight(str, Prism.languages[lang], lang);
      return `<pre class="language-${lang}"><code>` + html + "</code></pre>";
    } catch (error) {
      return (
        '<pre class="language-text"><code>' +
        md.utils.escapeHtml(str) +
        "</code></pre>"
      );
    }
  },
});
md.use(require("markdown-it-anchor"));

const websiteFooter = fs
  .readFileSync(path.resolve(__dirname, "./static_content/html/footer.html"))
  .toString("utf-8")
  .replace(/{{\$YEAR}}/gi, new Date().getFullYear());
const rvsiteFooter = fs
  .readFileSync(
    path.resolve(__dirname, "./static_content/html/rvsite_footer.html")
  )
  .toString("utf-8")
  .replace(/{{\$YEAR}}/gi, new Date().getFullYear());
const regexp = /{{(.*)}}/;

/**
 * @param {object} options
 * @param {string} options.sourceHTML the HTML content
 * @param {string} options.includeFileBasePath this is the base path of {{include/file.html}}
 * @param {string} options.websiteDirectory the website base directory
 * @param {string} options.websiteOrigin the website hostname. For example: "https://runtimeverification.com"
 * @param {string} options.targetFilePath the output HTML file path
 * @param {object} options.variables variables map
 */
function generateOutputWebpage({
  sourceHTML,
  includeFileBasePath,
  websiteDirectory,
  websiteOrigin = "",
  targetFilePath,
  variables = {},
}) {
  const filePath = targetFilePath;
  const dirname = path.dirname(filePath);

  if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

  const relative = path.relative(dirname, websiteDirectory);

  // Set default variables values
  let pageURL =
    websiteOrigin.replace(/\/+$/, "") +
    "/" +
    path.relative(
      websiteDirectory,
      filePath.endsWith("/index.html") ? dirname : filePath
    );
  if (!pageURL.endsWith(".html")) {
    pageURL = (pageURL + "/").replace(/\/+$/, "/");
  }

  variables = Object.assign(
    {
      YEAR: new Date().getFullYear(),
      WEBSITE_FOOTER: websiteFooter,
      WEBSITE_ORIGIN: websiteOrigin,
      RVSITE_FOOTER: rvsiteFooter,
      PAGE_URL: pageURL,
    },
    variables
  );

  const resultHTML = sourceHTML
    .split("\n")
    .map((line) => {
      const match = line.match(regexp);
      let content = line;

      if (match && match.length == 2 && !match[1].startsWith("$")) {
        content = fs
          .readFileSync(path.resolve(includeFileBasePath, match[1]))
          .toString();
      }

      // Fix assets folder path error for github page
      content = content.replace(/{{\$(.+?)}}/g, (_, variableName) => {
        if (variableName === "ROOT") {
          return relative || ".";
        } else if (variableName in variables) {
          return variables[variableName];
        } else {
          return _;
        }
      });

      return content;
    })
    .join("\n");
  fs.writeFileSync(filePath, resultHTML);
  console.log("Written file: " + filePath);
}

/**
 * @param {object} options
 * @param {string} options.globPattern which source files to build from
 * @param {G.IOptions} options.globOptions which files to ignore
 * @param {string} options.origin where to link to if the link is not a valid md file
 * @param {string} options.sourceDirectory the base directory of the source files
 * @param {string} options.outputDirectory the output directory of the genereated HTML files
 * @param {string} options.websiteDirectory the website base directory
 * @param {string} options.template the webpage template
 * @param {string} options.includeFileBasePath this is the base path of {{include/file.html}}
 * @param {string} options.websiteOrigin the website hostname. For example: "https://runtimeverification.com"
 * @param {boolean} options.generateToC variables map
 */
function generatePagesFromMarkdownFiles({
  globPattern,
  globOptions = {},
  origin = "",
  sourceDirectory,
  outputDirectory,
  websiteDirectory,
  template = "",
  includeFileBasePath,
  websiteOrigin = "",
  generateToC = false,
}) {
  const files = glob.sync(globPattern, globOptions);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let targetFilePath = path.resolve(
      path.resolve(
        outputDirectory,
        path.relative(sourceDirectory, path.dirname(file))
      ),
      path.basename(file).match(/^(index|README)\.md$/i)
        ? "index.html"
        : `${path.basename(file).replace(/\.md$/, "")}/index.html`
    );
    let markdown = fs.readFileSync(file).toString("utf-8");
    if (
      markdown.startsWith("---") &&
      /* tslint:disable-next-line:no-conditional-assignment */
      (endFrontMatterOffset = markdown.indexOf("\n---")) > 0
    ) {
      const yaml = markdown.slice(3, endFrontMatterOffset).trim();
      markdown = markdown
        .slice(endFrontMatterOffset + 4)
        .replace(/^[ \t]*\n/, "");
      if (generateToC) {
        markdown = toc.insert(markdown)
      }
      try {
        const frontMatter = YAML.parse(yaml);
        if ("permalink" in frontMatter) {
          targetFilePath = path.resolve(
            path.resolve(
              outputDirectory,
              path.relative(sourceDirectory, path.dirname(file))
            ),
            frontMatter["permalink"] + "/index.html"
          );
        }
      } catch (error) {}
    }
    const html = md.render(markdown);

    // Format links
    const $ = cheerio.load(html);
    $("a").each((index, anchorElement) => {
      try {
        let href = $(anchorElement).attr("href");
        if (href.match(/^(https?|mailto):/)) {
          $(anchorElement).attr("target", "_blank");
          $(anchorElement).attr("rel", "noopener");
        } else if (href.match(/\.md(#.+?$|$)/)) {
          // might be ./README.md or ./README.md#tag
          let hrefTargetFilePath = path.resolve(
            href.startsWith("/")
              ? path.resolve(outputDirectory, "." + path.dirname(href))
              : path.resolve(
                  path.dirname(targetFilePath),
                  path.basename(file).match(/^(index|README)\.md$/i)
                    ? "./"
                    : "../",
                  path.dirname(href)
                ),
            path.basename(href).match(/^(README|index)\.md/)
              ? path.basename(href).replace(/^(README|index)\.md/, `index.html`)
              : path.basename(href).replace(/\.md/, "/index.html")
          );
          $(anchorElement).attr(
            "href",
            path
              .relative(path.dirname(targetFilePath), hrefTargetFilePath)
              .replace(/(\/|^)index\.html(#|$)/, (_, pre, post) => pre + post)
          );
        } else if (!href.endsWith("/") && !href.startsWith("#")) {
          $(anchorElement).attr("href", url.resolve(origin, href));
        }
      } catch (error) {}
    });

    $("table").addClass("table");

    generateOutputWebpage({
      sourceHTML: template,
      websiteDirectory,
      targetFilePath,
      variables: {
        TITLE: targetFilePath,
        MARKDOWN_HTML: $.html(),
      },
      includeFileBasePath,
      websiteOrigin,
    });
  }
}

/**
 * Clean up the built *.html files in dirPath
 * @param {string} dirPath
 */
function cleanUpFiles(dirPath) {
  const files = glob.sync(dirPath + "/**/*.html");
  files.forEach((file) => {
    fs.unlinkSync(file);
    const dirPath = path.dirname(file);
    const filesInside = fs.readdirSync(dirPath);
    if (!filesInside.length) {
      fs.rmdirSync(dirPath, { recursive: true });
    }
  });
}

/**
 * Build the sitemap.xml file for the website
 * @param {object} options
 * @param {string} options.websiteOrigin the website origin
 * @param {string} options.websiteDirectory where the website folder is located
 * @param {string} options.sitemapPath where to save the sitemap.xml
 * @param {(url: string)=> boolean} options.ignore
 */
async function buildSitemap({
  websiteOrigin = "http://127.0.0.1:8080/",
  websiteDirectory = "./public_content/",
  sitemapPath = "",
  ignore = null,
}) {
  if (!sitemapPath) {
    sitemapPath = path.join(websiteDirectory, "./sitemap.xml");
  }

  const app = express();
  const port = await getPort();
  app.use(express.static(websiteDirectory));
  const server = app.listen(port);
  const websiteUrl = `http://127.0.0.1:${port}/`;
  console.log(":: running server at: ", websiteUrl);

  const filePath = path.resolve(sitemapPath);

  const generator = SitemapGenerator(websiteUrl, {
    stripQuerystring: true,
    filepath: filePath,
    lastMod: true,
    changeFreq: "monthly",
    ignore,
  });

  generator.on("add", (url) => {
    console.log("* add url: ", url.replace(websiteUrl, websiteOrigin));
  });

  generator.on("done", () => {
    fs.readFile(filePath, (error, data) => {
      const arr = data.toString("utf-8").split("\n");
      let newContent = "";
      arr.forEach((line) => {
        if (line.match(/<loc>/)) {
          const url = line.match(/<loc>(.+?)<\/loc>/)[1];
          line = line.replace(websiteUrl, websiteOrigin);
          if (url.match(/\.(pdf|pptx?)$/)) {
            // pdf like files
            newContent += line + "\n";
            newContent += "    <priority>0.5</priority>\n";
          } else {
            // web pages
            newContent += line + "\n";
            newContent += "    <priority>1.0</priority>\n";
          }
        } else {
          newContent += line + "\n";
        }
      });
      newContent = newContent.trim();
      fs.writeFileSync(filePath, newContent);
    });

    console.log("* sitemaps created at", sitemapPath);
    server.close();
  });

  // start the crawler
  console.log("* spawn crawler");
  generator.start();
}

module.exports = {
  generateOutputWebpage,
  generatePagesFromMarkdownFiles,
  cleanUpFiles,
  buildSitemap,
  md,
};
