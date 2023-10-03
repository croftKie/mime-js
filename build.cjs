// import fs from "fs";
const HTML = require("html-parse-stringify");
const fs = require("fs");

function loadHTML(url, mode) {
  const data = fs.readFileSync(url, {
    encoding: "utf8",
    flag: "r",
  });

  const ast = HTML.parse(data);

  return mode === 0 ? ast[0].children[3].children : ast[0];
}
// fetch layout
function createNodeMap() {
  const layout = loadHTML("./layout.html", 0);

  const ids = layout
    .filter((key) => {
      if (Object.keys(key).includes("attrs")) {
        return key.attrs.id;
      }
    })
    .map((item) => {
      return item.attrs.id;
    });

  const nodeMaps = ids.map((id) => {
    try {
      const tags = loadHTML(`./echoes/${id}.html`, 0).filter((obj) => {
        if (obj.type === "tag") {
          return obj;
        }
      });
      return tags;
    } catch (err) {
      return null;
    }
  });
  return nodeMaps.filter((node) => node !== null);
}
// function buildElement(type, props, ...children) {
//   return {
//     type: type,
//     props: {
//       ...props,
//       children: children.map((child) => {
//         if (typeof child === "object") {
//           return child;
//         } else {
//           return buildTextElement(child);
//         }
//       }),
//     },
//   };
// }

// // if primitive value is given as a child, create a textNode
// function buildTextElement(prim) {
//   return {
//     type: "TEXT_EL",
//     props: {
//       nodeValue: prim,
//       children: [],
//     },
//   };
// }

// renders element tree to DOM

function render(nodeMap) {
  const data = loadHTML("./dist/index.html", 1);
  const root = data.children[3].children[1];

  nodeMap.forEach((nodeMap) => {
    nodeMap.forEach((el) => {
      root.children.push(el);
    });
  });

  data.children[3].children = [root];

  const string = HTML.stringify([data]);
  console.log(string);

  try {
    fs.writeFileSync("./dist/index.html", string);
  } catch (err) {
    console.error(err);
  }
}

function buildOutput() {
  const path = "./dist";
  const content = `<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  fs.access(path, (err) => {
    if (err) {
      fs.mkdir(path, (err) => {
        if (err) {
          console.log(err);
        } else {
          try {
            fs.writeFileSync("./dist/index.html", content);
          } catch (err) {
            console.error(err);
          }
        }
      });
    } else {
      console.log("directory already exists");
    }
  });
  return render(createNodeMap());
}

const echo = {
  createNodeMap,
  render,
  buildOutput,
};

echo.buildOutput();

// export default echo;
