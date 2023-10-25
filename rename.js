// you can use every method of `rcs-core` on top
const rcsCore = require("rcs-core");
const rcs = require("rename-css-selectors");

rcs.config.load();

(async () => {
  try {
    await rcs.process.auto(["**/*.js", "**/*.html", "**/*.css"], {
      overwrite: true,
    });
    await rcs.mapping.generate("./", { overwrite: true });
  } catch (err) {
    console.error(err);
  }
})();
