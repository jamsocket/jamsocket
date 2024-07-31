import chalk from 'chalk'

type Vec3 = [number, number, number]

const JAMSOCKET_BLUE: Vec3 = [0, 98, 255]
const LIGHT_BLUE: Vec3 = [97, 213, 255]
const LIGHT_GREEN: Vec3 = [97, 255, 183]
const LIGHT_MAGENTA: Vec3 = [255, 97, 208]
const GRAY: Vec3 = [128, 128, 128]

function makeColorFormatter(color: Vec3): (text: string) => string {
  return (text) => chalk.bold.rgb(...color)(text)
}

export const blue = makeColorFormatter(JAMSOCKET_BLUE)
export const lightBlue = makeColorFormatter(LIGHT_BLUE)
export const lightGreen = makeColorFormatter(LIGHT_GREEN)
export const lightMagenta = makeColorFormatter(LIGHT_MAGENTA)
export const gray = makeColorFormatter(GRAY)

export function gradientBlue(text: string): string {
  return getFormattedTextWithGradient(text, JAMSOCKET_BLUE, LIGHT_BLUE)
}

// multiply the first vec3 (a) by multiplier (m) then add the second vec3 (b)
function scaleAndAddVec3(m: number, a: Vec3, b: Vec3): Vec3 {
  return [Math.floor(m * a[0] + b[0]), Math.floor(m * a[1] + b[1]), Math.floor(m * a[2] + b[2])]
}

function getFormattedTextWithGradient(text: string, startRGB: Vec3, endRGB: Vec3): string {
  const stops = text.length
  const rgbStep: Vec3 = [
    (endRGB[0] - startRGB[0]) / (stops - 1),
    (endRGB[1] - startRGB[1]) / (stops - 1),
    (endRGB[2] - startRGB[2]) / (stops - 1),
  ]

  const letters = [...text]
  return letters
    .map((l, i) => {
      const stop = scaleAndAddVec3(i, rgbStep, startRGB)
      return chalk.bold.rgb(stop[0], stop[1], stop[2])(l)
    })
    .join('')
}
