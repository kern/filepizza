export default class ChunkedBlob {

  constructor(n) {
    this.n = n;
    this.count = n;
    this.chunks = [];
  }

  setChunk(i, b) {
    if (i < 0 || i >= this.n)
      throw new Error('Chunk out of range');

    if (this.chunks[i])
      throw new Error('Chunk already set');

    this.count--;
    this.chunks[i] = b;
  }

  ready() {
    return this.count === 0;
  }

  toBlob() {
    if (!this.ready())
      throw new Error('Incomplete blob');

    return new Blob(this.chunks);
  }

}
