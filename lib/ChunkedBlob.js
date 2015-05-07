const rankSize = 16

function blobLength(b) {
  if (typeof b.byteLength !== 'undefined') return b.byteLength
  if (typeof b.size !== 'undefined') return b.size
  return b.length
}

export default class ChunkedBlob {

  constructor() {
    this.size = 0
    this.ranks = []
  }

  add(b) {
    this.size += blobLength(b)
    this.ranks.push(b)
  }

  toBlob() {
    return new Blob(this.ranks)
  }

}