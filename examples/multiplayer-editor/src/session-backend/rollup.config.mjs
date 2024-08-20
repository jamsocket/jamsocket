import path from 'path'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const config = {
  input: path.resolve(__dirname, './index.ts'),
  plugins: [
    typescript({
      tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
      outputToFilesystem: false
    }),
    commonjs({ extensions: ['.ts', '.js'] }),
    resolve({ extensions: ['.ts', '.js'] }),
    json()
  ]
}

export default config
