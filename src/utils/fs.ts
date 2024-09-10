import { UploadedFile } from '../types'

export function validateOffset(
  files: UploadedFile[],
  fullPath: string,
  offset: number,
): UploadedFile {
  const validFile = files.find(
    (file) =>
      (file.fullPath === fullPath || file.name === fullPath) &&
      offset <= file.size,
  )
  if (!validFile) {
    throw new Error('invalid file offset')
  }
  return validFile
}
