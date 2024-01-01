const { DIRS, FILES } = require("../constants/constants");
const fs = require("fs");
const fse = require("fs-extra");

function readConfig() {
    fs.readFile(FILES.mimeConfig, "utf8", (err, data) => {
      if (err) {
        console.error(err);
      } else {
        const { outputDir } = JSON.parse(data);
        if (outputDir) {
          DIRS.output = outputDir;
        }
      }
    });
}

// Creates empty output folder
function buildOutput() {
    const path = `./${DIRS.output}`;
    const publicFolder = `./${DIRS.output}/public`;
    const pluginsFolder = `./${DIRS.output}/public/plugins`;
    try {
      fs.accessSync(path, fs.constants.R_OK);
    } catch (err) {
      fs.mkdirSync(path);
      fs.mkdirSync(publicFolder);
      fs.mkdirSync(pluginsFolder);
    }
  }

// Creates copy of public folder and saves to output folder
function copyPublic() {
    const src = `./public`;
    const dest = `./${DIRS.output}/public`;
    try {
      fse.copySync(src, dest, { overwrite: true });
    } catch (err) {
      console.error(err);
    }
  }

module.exports = {
  readConfig,
  buildOutput,
  copyPublic
}