const rankSize = 16

function blobLength(b) {
  if (typeof b.byteLength !== 'undefined') return b.byteLength
  if (typeof b.size !== 'undefined') return b.size
  return b.length
}

export default class ChunkedBlob {

  constructor() {
    this.size = 0
    this.ranks = [[]]
  }

  add(b) {
    this.size += blobLength(b)
    this.ranks[0].push(b)

    for (let i = 0; i < this.ranks.length; i++) {
      let rank = this.ranks[i]
      if (rank.length === rankSize) {
        this.ranks[i + 1] = this.ranks[i + 1] || []
        this.ranks[i + 1].push(new Blob(rank))
        this.ranks[i] = []
      }
    }
  }

  toBlob() {
    let allRanks = [].concat(...this.ranks)
    return new Blob(allRanks)
  }

}
