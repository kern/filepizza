var db = require("./db");
var express = require("express");
var expressWinston = require("express-winston");
var fs = require("fs");
var ice = require("./ice");
var socketIO = require("socket.io");
var winston = require("winston");

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

var app = express();
var port =
  process.env.PORT || (process.env.NODE_ENV === "production" ? 80 : 3000);

if (!process.env.QUIET) {
  app.use(
    expressWinston.logger({
      winstonInstance: winston,
      expressFormat: true
    })
  );
}

app.get("/app.js", require("./middleware/javascript"));
app.use(require("./middleware/static"));

app.use([
  require("./middleware/bootstrap"),
  require("./middleware/error"),
  require("./middleware/react")
]);

const TRACKERS = process.env.WEBTORRENT_TRACKERS
  ? process.env.WEBTORRENT_TRACKERS.split(',').map(t => [t.trim()])
  : [
    ["wss://tracker.openwebtorrent.com"],
    ["wss://tracker.btorrent.xyz"],
    ["wss://tracker.fastcast.nz"]
  ];

function bootServer(server) {
  var io = socketIO(server);
  io.set("transports", ["polling"]);

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
        res({ token: upload.token, shortToken: upload.shortToken });
      });
    });

    socket.on("trackerConfig", function(_, res) {
      ice.getICEServers().then(function(iceServers) {
        res({ rtcConfig: { iceServers }, announce: TRACKERS });
      });
    });

    socket.on("disconnect", function() {
      db.remove(upload);
    });
  });

  server.on("error", function(err) {
    winston.error(err.message);
    process.exit(1);
  });

  server.listen(port, function(err) {
    var host = server.address().address;
    var port = server.address().port;
    winston.info("FilePizza listening on %s:%s", host, port);
  });
}

if (process.env.HTTPS_KEY && process.env.HTTPS_CERT) {
  // user-supplied HTTPS key/cert
  var https = require("https");
  var server = https.createServer({
    key: fs.readFileSync(process.env.HTTPS_KEY),
    cert: fs.readFileSync(process.env.HTTPS_CERT),
  }, app)
  bootServer(server)
} else {
  // no HTTPS
  var http = require("http");
  var server = http.Server(app)
  bootServer(server)
}
