#!/usr/bin/env node
const HTML = require("html-parse-stringify");
const { DIRS, FILES } = require("./constants/constants");
const { Readable } = require("stream");
const fs = require("fs");
const fse = require("fs-extra");
const {readConfig, buildOutput, copyPublic} = require("./src/configManager");

const mime = {
  render,
};

initialiseBuildProcess();

async function initialiseBuildProcess() {
  await readConfig();
  await buildOutput();
  await copyPublic();
  runBuildProcess();
}

function runBuildProcess(){
  const layoutFilesASTArray = createLayoutFileAST();
  const ASTArrayWithComponentsPrepped = handleComponentTraversal(layoutFilesASTArray)
  render(ASTArrayWithComponentsPrepped);
}

function createLayoutFileAST() {
  const files = fs.readdirSync(`./${DIRS.source}/${DIRS.templates}/`);
  const layoutFiles = files.map((file) => {
    return {
      fileName: file.replace(".html", ""),
    };
  });

  layoutFiles.forEach((file) => {
    const layoutTags = load_HTML_AST(
      `./${DIRS.source}/${DIRS.templates}/${file.fileName}.html`
    ).body.children;
    file["ids"] = layoutTags
      .filter((key) => {
        if (Object.keys(key).includes("attrs")) {
          return key.attrs.id;
        }
      })
      .map((item) => {
        return item.attrs.id;
      });
  });

  return layoutFiles;
}

function handleComponentTraversal(layoutFilesASTArray){
  layoutFilesASTArray.forEach((e) => {
    // fetches AST for the body of each component in that layout page
    e["templateTags"] = e.ids.map((id) => {
      try {
        // AST for template returned as array value
        const tags = formatTags(
          `./${DIRS.source}/${DIRS.components}/${id}.html`
        );

        return tags;
      } catch (err) {
        // console.log(err);
        return null;
      }
    });
    // fetches AST for the head of each component in that layout page
    e["headTags"] = e.ids.map((id) => {
      try {
        // AST for template returned as array value
        const head_tags = load_HTML_AST(
          `./${DIRS.source}/${DIRS.components}/${id}.html`
        ).head.children.filter((child) => {
          if (child.name === "link") {
            child.attrs.href = formatPath(child.attrs.href);
            return child;
          } else if (child.name === "script") {
            child.attrs.src = formatPath(child.attrs.src);
            return child;
          }
        });
        return head_tags;
      } catch (err) {
        null;
      }
    });
  });
  return layoutFilesASTArray;
}

// compiles and populates output folder
function render(nodeMap) {
  // iterative over each pages nodeMap
  nodeMap.forEach((map) => {
    // create boilerplate HTML from index.html file
    const content = coreHTML(map.fileName);
    const head = content[0].children[0];
    const body = content[0].children[1];
    // for each page push the template tags on to the boilerplate body
    map.templateTags.forEach((template) => {
      if (template !== null) {
        template.forEach((tag) => {
          body.children.push(tag);
        });
      }
    });
    // for each page push the head tags on to the boilerplate head
    map.headTags.forEach((headTag) => {
      if (headTag !== null) {
        headTag.forEach((tag) => {
          head.children.push(tag);
        });
      }
    });
    content[0].children[0] = head;
    content[0].children[1] = body;

    // stringify HTML AST
    const string = HTML.stringify(content);

    // delete original file if present and write new file to dist
    try {
      fs.unlinkSync(`./${DIRS.output}/${map.fileName}.html`);
      fs.writeFileSync(`./${DIRS.output}/${map.fileName}.html`, string);
    } catch (err) {
      fs.writeFileSync(`./${DIRS.output}/${map.fileName}.html`, string);
    }
  });
  console.log("success");
}

// reformats paths for linking to other pages/templates as well as public assets
function formatPath(path) {
  if (path.includes("../../public")) {
    return path.replace("../.", "");
  }

  if (path.includes("../templates")) {
    return path.replace("../templates", ".");
  }

  if (path.includes("cdn")) {
    const fileName = path.substring(path.lastIndexOf("/"));
    fetchCDNFile(path, fileName);
    return path.replace(path, `./public/plugins${fileName}`);
  }

  return path;
}

// parent function for AST traversal
function formatTags(path) {
  const tags = load_HTML_AST(path).body.children;
  traverse(tags);
  return tags;
}

async function fetchCDNFile(path, fileName) {
  const data = await fetch(path);
  const read = data.body.getReader();
  const rs = new Readable();
  rs._read = async () => {
    const res = await read.read();
    if (!res.done) {
      rs.push(Buffer.from(res.value));
    } else {
      rs.push(null);
      return;
    }
  };
  rs.pipe(fs.createWriteStream(`./${DIRS.output}/public/plugins${fileName}`));
}

// Loads HTML as an AST and returns the full HTML output or simply the HTML body for manipulation
function load_HTML_AST(path_to_html) {
  const raw_html = fs.readFileSync(path_to_html, {
    encoding: "utf8",
    flag: "r",
  });
  const ast = HTML.parse(raw_html);

  const html = ast.find((el) => (el.name = "html"));

  const body_only_ast = html.children.find((el) => el.name === "body");
  const head_only_ast = html.children.find((el) => el.name === "head");

  return {
    head: head_only_ast,
    body: body_only_ast,
  };
}

// Traverse AST function
function traverse(nodes) {
  // console.log(formatPath);
  // filters AST to remove all white space nodes
  const prepped = nodes.filter((obj) => {
    if ((obj.content && obj.content.includes("\r\n")) || obj.content === " ") {
      return;
    } else {
      return obj;
    }
  });

  //searches through AST to find all nodes that include a src or href attr and formats for build path
  prepped.forEach((node) => {
    if (node.attrs && node.attrs.src) {
      node.attrs.src = formatPath(node.attrs.src);
      if (node.attrs.integrity) {
        delete node.attrs.integrity;
      }
    }
    if (node.attrs && node.attrs.href) {
      node.attrs.href = formatPath(node.attrs.href);
      if (node.attrs.integrity) {
        delete node.attrs.integrity;
      }
    }
    if (node.children && node.children.length !== 0) {
      traverse(node.children);
    } else {
      return;
    }
  });
}

//traverses layouts folder and formats obj for each layout, inc name and comp ids
function readLayoutMap() {

}

// returns boilerplate HTML from index.html layout file
function coreHTML(fileName) {
  const data = fs.readFileSync(
    `./${DIRS.source}/${DIRS.templates}/${fileName}.html`,
    {
      encoding: "utf8",
      flag: "r",
    }
  );
  const head = HTML.parse(data)[0].children[1];
  traverse([head]);
  const string = HTML.stringify([head]);

  return HTML.parse(`<html lang="en">${string}<body></body></html>`);
}