# k-web-theme

## Prepare

```
npm install
npm run build
```

## Build a static website using k-web-theme library

Please check the [index.js](./index.js) file which exports few useful functions:

```javascript
module.exports = {
  generateOutputWebpage,
  generatePagesFromMarkdownFiles,
  cleanUpFiles,
  buildSitemap,
  md,
};
```

* **generateOutputWebpage** is used for generating HTML file from a template HTML string.  
* **generatePagesFromMarkdownFiles** is used for generating HTML files from multiple markdown files.  
* **cleanUpFiles** is used for removing all *.html from a directory.  
* **buildSitemap** is used for building the sitemap.xml for the website.  

Also, you could take [kframework/k](https://github.com/kframework/k/tree/master/web) as a reference for building a website using `k-web-theme`.  