import http from 'http'

export type Color = 'cyan' | 'magenta' | 'yellow' | 'blue'
const BACKEND_LOG_COLORS: Color[] = ['cyan', 'magenta', 'yellow', 'blue']

export function createColorGetter(): () => Color {
  let curColor = 0
  // eslint-disable-next-line func-names
  return function getColor(): Color {
    const color = BACKEND_LOG_COLORS[curColor]
    curColor = (curColor + 1) % BACKEND_LOG_COLORS.length
    return color
  }
}

export async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: string) => {
      body += chunk
    })
    req.on('end', () => {
      resolve(body)
    })
    req.on('error', (err: any) => {
      reject(err)
    })
  })
}

// lifted from https://github.com/oclif/core
export function termwidth(): number {
  if (!process.stdout.isTTY) {
    return 80
  }

  const width = process.stdout.getWindowSize()[0]
  if (width < 1) {
    return 80
  }

  if (width < 40) {
    return 40
  }

  return width
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
