var HTML = require("html-parse-stringify");

// this html:
var html = `<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

// becomes this AST:
var ast = HTML.parse(html);

const string = HTML.stringify(ast);
console.log(ast);
console.log(string);
