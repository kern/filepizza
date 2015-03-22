const chunkSize = 32;

function blobLength(b) {
  if (typeof b.byteLength !== 'undefined') return b.byteLength;
  if (typeof b.size !== 'undefined') return b.size;
  return b.length;
}

export default class ChunkedBlob {

  constructor() {
    this.count = 0;
    this.size = 0;
    this.chunks = [];
    this.lastChunk = [];
  }

  add(b) {
    this.count++;
    this.size += blobLength(b);
    this.lastChunk.push(b);

    if (this.lastChunk.length === chunkSize) {
      let chunk = new Blob(this.lastChunk);
      this.chunks.push(chunk);
      this.lastChunk = [];
    }
  }

  toBlob() {
    let allChunks = this.chunks.concat(this.lastChunk);
    return new Blob(allChunks);
  }

}
