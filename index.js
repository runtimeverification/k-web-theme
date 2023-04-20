const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const markdownItAttrs = require("markdown-it-attrs");
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
const useKaTeX = require("./md/katex");
const mume = require("@shd101wyy/mume");
const childProcess = require("child_process");

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
  linkify: false,
});
md.use(markdownItAttrs, {
  // optional, these are default options
  leftDelimiter: "{",
  rightDelimiter: "}",
  allowedAttributes: [], // empty array = all attributes are allowed
});
md.use(require("markdown-it-anchor"));
md.use(require("markdown-it-footnote"));
useKaTeX(md);

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
          if (typeof variables[variableName] === "string") {
            return variables[variableName].replace(
              /{{\$ROOT}}/g,
              relative || "."
            );
          } else {
            return variables[variableName];
          }
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
 *
 * @param {cheerio.Root} $
 * @param {boolean} displayCodeBlockSelectors
 * @param {boolean} displayCodeBlockLineNumbers
 */
function renderCodeBlocks(
  $,
  displayCodeBlockSelectors,
  displayCodeBlockLineNumbers
) {
  $("pre code").each((i, block) => {
    const $block = $(block);
    const className = $block.attr("class");
    const appendPreStyle = () => {
      const $pre = $block.parent();
      const style = $pre.attr("style");
      $pre.attr(
        "style",
        (style ? `${style};` : "") + "position: relative; padding-top: 32px;"
      );
    };

    const addLineNumbersIfNecessary = () => {
      if (
        displayCodeBlockLineNumbers ||
        (className && className.indexOf("numberLines") >= 0)
      ) {
        // Add line numbers
        const $pre = $block.parent();
        $pre.addClass("line-numbers");
        $pre.addClass("language-line-numbers"); // language-* in order to apply PrismJS line numbers

        let startLineNumber = 1;
        if ($block.attr("startfrom")) {
          const startFrom = parseInt($block.attr("startfrom"));
          if (Number.isNaN(startFrom) || Math.floor(startFrom) !== startFrom) {
            throw new Error(
              `Invalid startFrom attribute value: ${$block.attr("startfrom")}`
            );
          } else {
            $pre.attr("data-start", $block.attr("startfrom"));
            startLineNumber = startFrom;
          }
        } else {
          $pre.attr("data-start", "1");
        }
        $pre.css("counter-reset", `linenumber ${startLineNumber - 1}`);

        const code = $block.text();
        const match = code.match(/\n(?!$)/g);
        const lineCount = match ? match.length + 1 : 1;
        let lines = "";
        for (let i = 0; i < lineCount; i++) {
          lines += "<span></span>";
        }
        $block.append(
          `<span aria-hidden="true" class="line-numbers-rows">${lines}</span>`
        );
      }
    };

    if (className) {
      if (className.startsWith("language-")) {
        const language = className.replace(/^language-/, "");
        if (Prism.languages[language]) {
          const html = Prism.highlight(
            $block.text(),
            Prism.languages[language],
            language
          );
          $block.html(html);
        }

        if (displayCodeBlockSelectors) {
          $block
            .parent()
            .prepend(`<div class="code-block-selectors">${language}</div>`);
          appendPreStyle();
        }
      } else if (className.length > 0) {
        const language = className.split(/\s+/g)[0];
        if (Prism.languages[language]) {
          const html = Prism.highlight(
            $block.text(),
            Prism.languages[language],
            language
          );
          $block.html(html);
        }

        if (displayCodeBlockSelectors) {
          $block.parent().prepend(
            `<div class="code-block-selectors">${className
              .split(/\s+/g)
              .filter((x) => x.length > 0)
              .map((x) => "." + x)
              .join(" ")}</div>`
          );
          appendPreStyle();
        }
      }
    }

    addLineNumbersIfNecessary();
  });
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
 * @param {boolean} options.displayCodeBlockSelectors whether to display code block selectors
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
  variables = {},
  displayCodeBlockSelectors = false,
  displayCodeBlockLineNumbers = false,
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

    const $ = cheerio.load(html);
    // render code blocks
    renderCodeBlocks($, displayCodeBlockSelectors, displayCodeBlockLineNumbers);

    // Format links
    $("a").each((index, anchorElement) => {
      try {
        let href = $(anchorElement).attr("href");
        if (!href) {
        } else if (href.match(/^(https?|mailto):/)) {
          $(anchorElement).attr("target", "_blank");
          $(anchorElement).attr("rel", "noreferrer noopener");
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
      } catch (error) {
        console.error(error);
      }
    });

    // Move relative local images to '${outputDirectory}/assets/img/gh-pages/' directory if necessary
    $("img").each((index, imageElement) => {
      try {
        let imageSrc = $(imageElement).attr("src");
        if (imageSrc.match(/^\.\.?\//)) {
          const imagePath = path.resolve(path.dirname(file), imageSrc);
          if (fs.existsSync(imagePath)) {
            const ghPagesImageDir = path.resolve(
              websiteDirectory,
              "./assets/img/gh-pages"
            );
            if (!fs.existsSync(ghPagesImageDir)) {
              fs.mkdirSync(ghPagesImageDir, { recursive: true });
            }
            let targetImagePath = path.resolve(
              ghPagesImageDir,
              path.relative(sourceDirectory, imagePath)
            );
            console.log(`Copy image from ${imagePath} to ${targetImagePath}`);
            fs.mkdirSync(path.dirname(targetImagePath), { recursive: true });
            fs.copyFileSync(imagePath, targetImagePath);
            $(imageElement).attr(
              "src",
              path.relative(path.dirname(targetFilePath), ghPagesImageDir) +
                "/" +
                path.relative(ghPagesImageDir, targetImagePath)
            );
          }
        }
      } catch (error) {
        console.error(error);
      }
    });

    // Process headers
    /**
     * @typedef HeaderData
     * @type {object}
     * @property {number} level
     * @property {string} id
     * @property {string} html
     * @property {number} offset
     */

    /**
     * @type {HeaderData[]}
     */
    const headersData = [];
    $("h1, h2, h3, h4, h5, h6").each((index, headerElement) => {
      const tagName = headerElement.tagName;
      const level = parseInt(tagName.slice(1));
      const id = $(headerElement).attr("id");
      const headerHtml = $(headerElement).html();
      if (id) {
        const offset = headersData.length;
        headersData.push({
          level,
          id,
          html: headerHtml,
          offset,
        });
      }
    });
    let pageToCHtml = "";
    if (headersData.length) {
      let smallestLevel = headersData[0].level;
      for (let i = 0; i < headersData.length; i++) {
        if (headersData[i].level < smallestLevel) {
          smallestLevel = headersData[i].level;
        }
      }

      /**
       * Get list of sub headers
       * @param {HeaderData[]} headersData
       * @param {number} expectedLevel
       * @param {number} startOffset
       * @returns {HeaderData[]}
       */
      const getSubHeaders = (headersData, expectedLevel, startOffset) => {
        const arr = [];
        for (let i = startOffset; i < headersData.length; i++) {
          const headerData = headersData[i];
          if (headerData.level === expectedLevel) {
            arr.push(headerData);
          } else if (headerData.level < expectedLevel) {
            break;
          } else {
            continue;
          }
        }
        return arr;
      };

      /**
       * Build the ToC Html
       * @param {HeaderData[]} allHeadersData
       * @param {HeaderData[]} headersData
       */
      const convertHeadersDataToHTML = (allHeadersData, headersData) => {
        let result = "";
        for (let i = 0; i < headersData.length; i++) {
          const headerData = headersData[i];
          const subHeaders = getSubHeaders(
            allHeadersData,
            headerData.level + 1,
            headerData.offset + 1
          );

          const leftIndentStyle = `padding-left: ${
            (headerData.level - smallestLevel) * 8
          }px;`;
          const paddingStyle = `padding:0.25rem 0;`;

          if (subHeaders.length) {
            result += `<details style="${paddingStyle};${leftIndentStyle}" ${
              "open" // headersData.length === smallestLevel ? "open" : ""
            }>
            <summary class="bd-toc-link-wrapper">
              <a href="#${headerData.id}" class="bd-toc-link">${
              headerData.html
            }</a>
              </summary>
            <div>
              ${convertHeadersDataToHTML(allHeadersData, subHeaders)}
            </div>
          </details>
        `;
          } else {
            result += `<div class="bd-toc-link-wrapper" style="${paddingStyle}">
              <a
                href="#${headerData.id}"
                class="bd-toc-link"
                style="${leftIndentStyle};"
              >
                ${headerData.html}
              </a></div>`;
          }
        }
        return result;
      };

      pageToCHtml = `
<div>
${convertHeadersDataToHTML(
  headersData,
  getSubHeaders(headersData, smallestLevel, 0)
)}
</div>
`;
    }

    $("table").addClass("table");

    generateOutputWebpage({
      sourceHTML: template,
      websiteDirectory,
      targetFilePath,
      variables: Object.assign(variables, {
        TITLE: targetFilePath,
        MARKDOWN_HTML: $.html(),
        PAGE_TOC_HTML: pageToCHtml,
      }),
      includeFileBasePath,
      websiteOrigin,
    });
  }
}

/**
 * Clean up the built *.html and image files in dirPath
 * @param {string} dirPath
 */
function cleanUpFiles(dirPath) {
  const files = glob.sync(dirPath + "/**/*.{html,jpg,jpeg,png,gif}");
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

/**
 *
 * @param {string} markdown the sidebar toc markdown content
 * @param {(url:string)=>string} urlConverter
 */
function convertSidebarToCToHTML(markdown, urlConverter) {
  const html = md.render(markdown);
  const $ = cheerio.load(html);

  function helper($ul, level) {
    const leftIndexStyle = `padding-left: ${(level + 1) * 8}px;`;
    const paddingStyle = `padding:0.25rem 0;`;

    $ul.children().each((index, li) => {
      const $li = $(li);
      if (li.children.length === 1) {
        li.tagName = "div";
        $li.attr("style", `${paddingStyle};${leftIndexStyle}`);
      } else {
        const $details = $("<details></details>");
        $details.attr("style", `${paddingStyle};${leftIndexStyle}`);
        const $summary = $("<summary></summary>");
        const $ul_ = $(li.children.find((c) => c.tagName === "ul"));
        const $content = helper($ul_, level + 1);
        $summary.append($(li.children[0]));
        $details.append($summary);
        $details.append($content);
        $li.replaceWith($details);
      }
    });
    return $ul;
  }
  const $ul = $("ul").first();
  helper($ul, 0);

  $("ul").each((i, el) => {
    el.tagName = "div";
  });

  $("a").each((li, el) => {
    el.attribs.href = urlConverter(el.attribs.href);
  });

  return $.html($ul);
}

async function buildBook(tocFilePath, projectDirectoryPath) {
  await mume.init();

  const engine = new mume.MarkdownEngine({
    filePath: tocFilePath,
    projectDirectoryPath,
    config: {
      previewTheme: "github-light.css",
      codeBlockTheme: "github.css",
    },
  });
  console.log("Start building HTML");
  const htmlFilePath = await engine.eBookExport({ fileType: "html" });
  console.log("Done generating HTML: ", htmlFilePath);

  console.log("Start building EPUB");
  const epubFilePath = await engine.eBookExport({ fileType: "epub" });
  console.log("Done generating EPUB: ", epubFilePath);

  console.log("Start building MOBI");
  const mobiFilePath = await engine.eBookExport({ fileType: "mobi" });
  console.log("Done generating EPUB: ", mobiFilePath);

  console.log("Start building PDF");
  const pdfFilePath = htmlFilePath.replace(/\.html$/, ".pdf");
  childProcess.execSync(
    `pandoc ${htmlFilePath} -o ${pdfFilePath} --pdf-engine=xelatex --highlight-style pygments`
  );
  console.log("Done generating PDF: ", pdfFilePath);

  return {
    pdf: pdfFilePath,
    html: htmlFilePath,
    epub: epubFilePath,
    mobi: mobiFilePath,
  };
}

module.exports = {
  generateOutputWebpage,
  generatePagesFromMarkdownFiles,
  cleanUpFiles,
  buildSitemap,
  convertSidebarToCToHTML,
  buildBook,
  md,
  renderCodeBlocks,
};
