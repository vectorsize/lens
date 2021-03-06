var http = require('http');
var express = require('express');
var path = require('path');

var CommonJSServer = require("substance-application/commonjs");
var Converter = require("substance-converter");
var Article = require("lens-article");

// var Converter = require("substance-converter");

var Handlebars = require("handlebars");
var fs = require("fs");

var app = express();
var commonJSServer = new CommonJSServer(__dirname);
commonJSServer.boot({alias: "lens", source: "./src/boot.js"});

var port = process.env.PORT || 4000;
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());

app.get("/",
  function(req, res, next) {

    var template = fs.readFileSync(__dirname + "/index.html", 'utf8');

    var scripts = commonJSServer.list();

    var scriptsTags = scripts.map(function(script) {
      return ['<script type="text/javascript" src="/scripts', script, '"></script>'].join('');
    }).join('\n');

    var result = template.replace('#####scripts#####', scriptsTags);

    res.send(result);
  }
);

app.use('/lib', express.static('lib'));
app.use('/lib/substance', express.static('node_modules'));
app.use('/node_modules', express.static('node_modules'));
app.use('/styles', express.static('styles'));
app.use('/src', express.static('src'));
app.use('/data', express.static('data'));
app.use('/config', express.static('config'));
app.use('/images', express.static('images'));

app.get("/scripts*",
  function(req, res, next) {
    var scriptPath = req.params[0];
    res.type('text/javascript');
    try {
      var script = commonJSServer.getScript(scriptPath);
      res.send(script);
    } catch (err) {
      res.send(err.stack);
    }
  }
);



// Serve the Substance Converter
// Provides on the fly conversion for different markup formats
// --------

var converter = new Converter.Server(app);
converter.serve();


// Serves auto-generated doc, that describes the Lens.Article specification
// --------
//

app.get('/data/lens_article.json', function(req, res) {
  res.json(Article.describe());
});


// Serve a doc from the docs folder (powered by on the fly markdown->substance conversion)
// --------

app.get('/data/:doc.json', function(req, res) {
  var docId = req.params.doc;

  var inputData;
  try {
    var filename = __dirname + "/node_modules/lens-manual/"+docId+".md";
    inputData = fs.readFileSync(filename, 'utf8');
    converter.convert(inputData, 'markdown', 'substance', function(err, output) {
      output = output.toJSON();
      output.id = docId;
      output.nodes.document.guid = docId;

      if (err) return res.send(500, err);
      res.send(output);
    });
  } catch (err) {
    inputData = fs.readFileSync(__dirname + "/data/"+docId+".json", 'utf8');
    res.send(inputData);
  }
});




// Serve the Substance Converter
// --------

// new Converter.Server(app).serve();

app.use(app.router);

http.createServer(app).listen(port, function(){
  console.log("Lens running on port " + port);
  console.log("http://127.0.0.1:"+port+"/");
});
