var db = require("./db");
var express = require("express");
var expressWinston = require("express-winston");
var forceSSL = require("express-force-ssl");
var fs = require("fs");
var http = require("http");
var https = require("https");
var ice = require("./ice");
var path = require("path");
var socketIO = require("socket.io");
var winston = require("winston");

var app = express();

if (process.env.SECURE) {
  var server = https.Server(
    {
      key: fs.readFileSync(process.env.SSL_KEY || "key.pem"),
      cert: fs.readFileSync(process.env.SSL_CERT || "cert.pem")
    },
    app
  );
  var port = process.env.PORT || 443;
  var insecurePort = process.env.INSECURE_PORT || 80;
  http.Server(app).listen(80);
} else {
  var server = http.Server(app);
  var port =
    process.env.PORT || (process.env.NODE_ENV === "production" ? 80 : 3000);
}

var io = socketIO(server);
io.set("transports", ["polling"]);

var logDir = path.resolve(__dirname, "../log");

winston.add(winston.transports.DailyRotateFile, {
  filename: logDir + "/access.log",
  level: "info"
});

winston.add(winston.transports.File, {
  filename: logDir + "/error.log",
  level: "error",
  handleExceptions: true,
  json: false
});

server.on("error", function(err) {
  winston.error(err.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, p) => {
  p.catch(err => {
    log.error("Exiting due to unhandled rejection!");
    log.error(err);
    process.exit(1);
  });
});

process.on("uncaughtException", err => {
  log.error("Exiting due to uncaught exception!");
  log.error(err);
  process.exit(1);
});

server.listen(port, function(err) {
  var host = server.address().address;
  var port = server.address().port;
  winston.info("FilePizza listening on %s:%s", host, port);
});

if (!process.env.QUIET) {
  app.use(
    expressWinston.logger({
      winstonInstance: winston,
      expressFormat: true
    })
  );
}

if (process.env.FORCE_SSL) {
  app.set("forceSSLOptions", {
    trustXFPHeader: true
  });

  app.use(forceSSL);
}

app.get("/app.js", require("./middleware/javascript"));
app.use(require("./middleware/static"));

app.use([
  require("./middleware/bootstrap"),
  require("./middleware/error"),
  require("./middleware/react")
]);

io.on("connection", function(socket) {
  var upload = null;

  socket.on("upload", function(metadata, res) {
    if (upload) return;
    db.create(socket).then(u => {
      upload = u;
      upload.fileName = metadata.fileName;
      upload.fileSize = metadata.fileSize;
      upload.fileType = metadata.fileType;
      upload.infoHash = metadata.infoHash;
      res(upload.token);
    });
  });

  socket.on("rtcConfig", function(_, res) {
    ice.getICEServers().then(function(iceServers) {
      res({ iceServers: iceServers });
    });
  });

  socket.on("disconnect", function() {
    db.remove(upload);
  });
});
