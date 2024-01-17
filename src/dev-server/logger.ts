import chalk from 'chalk'
import stringLength from 'string-length'

export class Logger {
  curFooterLength = 0
  displayFooter = false

  constructor(private _getFooter: () => string[]) {}

  footerOff(): void {
    this.displayFooter = false
    this.clearFooter()
  }

  footerOn(): void {
    this.displayFooter = true
    this.refreshFooter()
  }

  log(logLines: string[] = []): void {
    this.clearFooter()

    for (const logLine of logLines) {
      console.log(logLine)
    }

    if (this.displayFooter) {
      const footer = this.getFooter()
      this.curFooterLength = footer.length
      for (const line of footer) {
        console.log(line)
      }
    }
  }

  refreshFooter(): void {
    this.log()
  }

  getFooter(): string[] {
    let footer = this._getFooter()

    // draw a box around the footer
    const padding = 2
    // eslint-disable-next-line unicorn/no-array-reduce
    const boxWidth = footer.reduce((max, line) => Math.max(max, stringLength(line)), 0) + (padding * 2) + 2
    footer = footer.map(line => {
      line = `\u2016${' '.repeat(padding)}${line}`
      const endPadding = boxWidth - stringLength(line) - 1
      return `${line}${' '.repeat(endPadding)}\u2016`
    })

    footer.unshift(chalk.bold(`\u2554${'='.repeat(boxWidth - 2)}\u2557`))
    footer.push(chalk.bold(`\u255A${'='.repeat(boxWidth - 2)}\u255D`))

    return footer
  }

  clearFooter(): void {
    for (let i = 0; i < this.curFooterLength; i++) {
      process.stdout.write('\r\u001B[1A') // move cursor up by one line and to beginning of line
      process.stdout.write('\u001B[2K') // clear line
    }
    this.curFooterLength = 0
  }
}
