var db = require("./db");
var express = require("express");
var expressWinston = require("express-winston");
var fs = require("fs");
var http = require("http");
var https = require("https");
var ice = require("./ice");
var socketIO = require("socket.io");
var winston = require("winston");

var app = express();
var server = http.Server(app);
var port =
  process.env.PORT || (process.env.NODE_ENV === "production" ? 80 : 3000);

var io = socketIO(server);
io.set("transports", ["polling"]);

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
      res({ token: upload.token, shortToken: upload.shortToken });
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
