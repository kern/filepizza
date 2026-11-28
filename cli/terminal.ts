export interface Output {
  write(text: string): unknown
  isTTY?: boolean
}

export function percent(done: number, total: number): number {
  return total === 0 ? 100 : Math.floor((done / total) * 100)
}

// Lines are printed normally. A status (progress) is rewritten in place when
// the output is a terminal, and left out otherwise so logs stay readable.
export function createTerminal(out: Output) {
  let showingStatus = false

  const clear = (): void => {
    if (showingStatus) {
      out.write('\r\x1b[K')
      showingStatus = false
    }
  }

  return {
    line(text: string): void {
      clear()
      out.write(`${text}\n`)
    },
    status(text: string): void {
      if (!out.isTTY) return
      out.write(`\r\x1b[K${text}`)
      showingStatus = true
    },
    clear,
  }
}
