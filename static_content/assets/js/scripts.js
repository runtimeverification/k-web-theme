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

    // Page TOC
    const hidePageToc = () => {
      $(".page-toc").css("display", "");
      $("body").css("overflow-y", "auto");
      $(".page-toc-toggle-btn").text("≣");
      $(".page-toc a").off("click", hidePageToc);
    };
    $(".page-toc-toggle-btn").text("≣");
    $(".page-toc-toggle-btn").click((event) => {
      if ($(".page-toc").css("display") === "none") {
        $(".page-toc").css("display", "block");
        $("body").css("overflow-y", "hidden");
        $(".page-toc-toggle-btn").text("x");
        $(".page-toc a").on("click", hidePageToc);
      } else {
        hidePageToc();
      }
    });
  });
})(jQuery);
