const chunkSize = 256 * 1024

export default class UploadFile {

  constructor(file) {
    this.name = file.name
    this.size = file.size
    this.type = file.type
    this.blob = file
  }

  countChunks() {
    return Math.ceil(this.size / chunkSize)
  }

  getChunk(i) {
    if (i < 0 || i >= this.countChunks())
      throw new Error('Chunk out of bounds')

    let start = i * chunkSize
    let end = Math.min(start + chunkSize, this.size)
    return this.blob.slice(start, end)
  }

  toJSON() {
    return {
      name: this.name,
      size: this.size,
      type: this.type
    }
  }

}
