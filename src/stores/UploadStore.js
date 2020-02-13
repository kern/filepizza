import UploadActions from "../actions/UploadActions";
import alt from "../alt";
import socket from "filepizza-socket";
import { getClient } from "../wt";

const SPEED_REFRESH_TIME = 2000;

export default alt.createStore(
  class UploadStore {
    constructor() {
      this.bindActions(UploadActions);

      this.fileName = "";
      this.fileSize = 0;
      this.fileType = "";
      this.infoHash = null;
      this.peers = 0;
      this.speedUp = 0;
      this.status = "ready";
      this.token = null;
      this.shortToken = null;
    }

    onUploadFile(file) {
      if (this.status !== "ready") return;
      this.status = "processing";

      getClient().then(client => {
        client.seed(file, { announce: client.tracker.announce }, torrent => {
          const updateSpeed = () => {
            this.setState({
              speedUp: torrent.uploadSpeed,
              peers: torrent.numPeers
            });
          };

          torrent.on("upload", updateSpeed);
          torrent.on("download", updateSpeed);
          setInterval(updateSpeed, SPEED_REFRESH_TIME);

          socket.emit(
            "upload",
            {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              infoHash: torrent.magnetURI
            },
            (res) => {
              this.setState({
                status: "uploading",
                token: res.token,
                shortToken: res.shortToken,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                infoHash: torrent.magnetURI
              });
            }
          );
        });
      });
    }
  },
  "UploadStore"
);
