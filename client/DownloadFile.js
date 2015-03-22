import ChunkedBlob from './ChunkedBlob';

export default class DownloadFile {

  constructor(name, size, type) {
    this.name = name;
    this.size = size;
    this.type = type;
    this.packets = new ChunkedBlob();
  }

  addPacket(b) {
    this.packets.add(b);
  }

  clearPackets() {
    this.packets = new ChunkedBlob();
  }

  isComplete() {
    return this.packets.size === this.size;
  }

  getProgress() {
    return this.packets.size / this.size;
  }

  download() {
    let blob = this.packets.toBlob();
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.download = this.name;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }

}
