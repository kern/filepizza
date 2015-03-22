const packetSize = 16 * 1024;

export default class UploadFile {

  constructor(file) {
    this.name = file.name;
    this.size = file.size;
    this.type = file.type;
    this.blob = file;
  }

  countPackets() {
    return Math.ceil(this.size / packetSize);
  }

  getPacket(i) {
    if (i < 0 || i >= this.countPackets())
      throw new Error('Packet out of bounds');

    let start = i * packetSize;
    let end = Math.min(start + packetSize, this.size);
    return this.blob.slice(start, end);
  }

}
