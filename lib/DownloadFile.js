import ChunkedBlob from './ChunkedBlob'

export default class DownloadFile {

  constructor(name, size, type) {
    this.name = name
    this.size = size
    this.type = type
    this.chunks = new ChunkedBlob()
  }

  addChunk(b) {
    this.chunks.add(b)
  }

  clearChunks() {
    this.chunks = new ChunkedBlob()
  }

  isComplete() {
    return this.getProgress() === 1
  }

  getProgress() {
    return this.chunks.size / this.size
  }

  download() {

    let blob = this.chunks.toBlob()
    let url = URL.createObjectURL(blob)

    let a = document.createElement('a')
    document.body.appendChild(a)
    a.download = this.name
    a.href = url
    a.click()

    setTimeout(() => {
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }, 0)

  }

  toJSON() {
    return {
      name: this.name,
      size: this.size,
      type: this.type
    }
  }

}
