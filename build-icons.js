const webfontsGenerator = require("webfonts-generator");

webfontsGenerator(
  {
    files: [
      "static_content/assets/img/icons/close-fullscreen.svg",
      "static_content/assets/img/icons/open-fullscreen.svg",
      "static_content/assets/img/icons/output.svg",
      "static_content/assets/img/icons/coverage.svg",
      "static_content/assets/img/icons/more.svg",
      "static_content/assets/img/icons/copy.svg",
    ],
    dest: "public_content/assets/sass/icons/",
  },
  function (error) {
    if (error) {
      console.log("Fail!", error);
    } else {
      console.log("Done!");
    }
  }
);
