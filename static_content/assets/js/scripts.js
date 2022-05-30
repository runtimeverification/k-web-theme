/* ---------------------------------------------
 common scripts
 --------------------------------------------- */

(function () {
  "use strict"; // use strict to start

  /* ---------------------------------------------
     WOW init
     --------------------------------------------- */

  new WOW().init();

  $(document).ready(function () {
    // Sidebar menu
    $(".bd-search-docs-toggle").click(() => {
      if ($(".bd-search-docs-toggle").hasClass("collapsed")) {
        $(".bd-sidebar > nav").addClass("show");
        $(".bd-search-docs-toggle").removeClass("collapsed");
      } else {
        $(".bd-sidebar > nav").removeClass("show");
        $(".bd-search-docs-toggle").addClass("collapsed");
      }
    });

    // Search box
    $("#search-box").keydown((event) => {
      if (event.which === 13) {
        event.stopPropagation();
        event.preventDefault();
        window.open(
          `https://www.google.com/search?q=site:${
            location.hostname
          }%20${encodeURIComponent($("#search-box").val())}`,
          "_blank"
        );
      }
    });

    // Page ToC
    if ($(".page-toc").length) {
      const tocIcon = `<i class="fas fa-bars"></i>`;
      const closeIcon = `<i class="fas fa-times"></i>`;
      const hidePageToc = () => {
        $(".page-toc").css("display", "");
        $("body").css("overflow-y", "auto");
        $(".page-toc-toggle-btn").html(tocIcon);
        $(".page-toc a").off("click", hidePageToc);
      };
      $(".page-toc-toggle-btn").html(tocIcon);
      $(".page-toc-toggle-btn").click((event) => {
        if ($(".page-toc").css("display") === "none") {
          $(".page-toc").css("display", "block");
          $("body").css("overflow-y", "hidden");
          $(".page-toc-toggle-btn").html(closeIcon);
          $(".page-toc a").on("click", hidePageToc);
        } else {
          hidePageToc();
        }
      });

      const headerElements = [];
      const elems = document.querySelectorAll(
        ".markdown-preview h1, .markdown-preview h2, .markdown-preview h3, .markdown-preview h4, .markdown-preview h5, .markdown-preview h6"
      );
      for (let i = 0; i < elems.length; i++) {
        if (elems[i].hasAttribute("id")) {
          headerElements.push(elems[i]);
        }
      }
      const anchorElements = Array.from(
        document.querySelectorAll(".page-toc .bd-toc-link-wrapper .bd-toc-link")
      );

      /**
       * @type {HTMLAnchorElement}
       */
      let currentHighlightedHeaderAnchorElement = null;
      const scrollEvent = () => {
        const scrollTop = $(window).scrollTop();
        for (let i = headerElements.length - 1; i >= 0; i--) {
          const headerElement = headerElements[i];
          if (
            (scrollTop < 10 && i === 0) ||
            scrollTop + 64 >= headerElement.offsetTop
          ) {
            if (currentHighlightedHeaderAnchorElement) {
              currentHighlightedHeaderAnchorElement.parentElement.classList.remove(
                "highlighted"
              );
            }
            currentHighlightedHeaderAnchorElement = anchorElements[i];
            if (currentHighlightedHeaderAnchorElement) {
              currentHighlightedHeaderAnchorElement.parentElement.classList.add(
                "highlighted"
              );
            }
            break;
          }
        }
      };
      scrollEvent();
      window.addEventListener("scroll", $.debounce(100, scrollEvent));
    }

    // Highlight sidebar ToC
    $(".bd-toc-item a.bd-toc-link").each((index, tocLink) => {
      if (
        new URL(tocLink.href).pathname.replace(/\/+(index.html\/?)?$/, "") ===
        window.location.pathname.replace(/\/+(index.html\/?)?$/, "")
      ) {
        $(tocLink).addClass("selected");
      }
    });

    // Analyze sidebar toc
    const sidebarToC = document.querySelector(".sidebar-toc");
    if (sidebarToC) {
      const anchorElements = sidebarToC.querySelectorAll("a");
      for (let i = 0; i < anchorElements.length; i++) {
        const anchorElement = anchorElements[i];
        if (new URL(anchorElement.href).pathname === window.location.pathname) {
          anchorElement.classList.add("selected");
          anchorElement.style.fontWeight = "800";

          // set all parent `details` elements as open
          let parentElement = anchorElement.parentElement;
          while (parentElement) {
            if (parentElement.tagName === "DETAILS") {
              parentElement.open = true;
            }
            parentElement = parentElement.parentElement;
          }

          if (anchorElement.scrollIntoView) {
            anchorElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "start",
            });
          }
        }
      }
    }
  });
})(jQuery);
