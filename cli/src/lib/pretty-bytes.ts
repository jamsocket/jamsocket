// Based on https://www.npmjs.com/package/pretty-bytes/v/6.1.1

const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

const BIBYTE_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

const BIT_UNITS = ['b', 'kbit', 'Mbit', 'Gbit', 'Tbit', 'Pbit', 'Ebit', 'Zbit', 'Ybit']

const BIBIT_UNITS = ['b', 'kibit', 'Mibit', 'Gibit', 'Tibit', 'Pibit', 'Eibit', 'Zibit', 'Yibit']

type Locale = string | string[] | boolean
type Options = {
  bits?: boolean
  binary?: boolean
  space?: boolean
  signed?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: Locale
}

/*
Formats the given number using `Number#toLocaleString`.
- If locale is a string, the value is expected to be a locale-key (for example: `de`).
- If locale is true, the system default locale is used for translation.
- If no value for locale is specified, the number is returned unmodified.
*/
function toLocaleString(
  number: number,
  locale?: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  let result = `${number}`
  if (typeof locale === 'string' || Array.isArray(locale)) {
    result = number.toLocaleString(locale, options)
  } else if (locale === true || options !== undefined) {
    result = number.toLocaleString(undefined, options)
  }

  return result
}

export default function prettyBytes(number: number, options?: Options): string {
  if (!Number.isFinite(number)) {
    throw new TypeError(`Expected a finite number, got ${typeof number}: ${number}`)
  }

  options = {
    bits: false,
    binary: false,
    space: true,
    ...options,
  }

  const UNITS = options.bits
    ? options.binary
      ? BIBIT_UNITS
      : BIT_UNITS
    : options.binary
      ? BIBYTE_UNITS
      : BYTE_UNITS

  const separator = options.space ? ' ' : ''

  if (options.signed && number === 0) {
    return ` 0${separator}${UNITS[0]}`
  }

  const isNegative = number < 0
  const prefix = isNegative ? '-' : options.signed ? '+' : ''

  if (isNegative) {
    number = -number
  }

  let localeOptions

  if (options.minimumFractionDigits !== undefined) {
    localeOptions = { minimumFractionDigits: options.minimumFractionDigits }
  }

  if (options.maximumFractionDigits !== undefined) {
    localeOptions = { maximumFractionDigits: options.maximumFractionDigits, ...localeOptions }
  }

  if (number < 1) {
    const numberString = toLocaleString(number, options.locale, localeOptions)
    return prefix + numberString + separator + UNITS[0]
  }

  const exponent = Math.min(
    Math.floor(options.binary ? Math.log(number) / Math.log(1024) : Math.log10(number) / 3),
    UNITS.length - 1,
  )
  number /= (options.binary ? 1024 : 1000) ** exponent

  if (!localeOptions) {
    number = Number(number.toPrecision(3))
  }

  const numberString = toLocaleString(Number(number), options.locale, localeOptions)

  const unit = UNITS[exponent]

  return prefix + numberString + separator + unit
}
