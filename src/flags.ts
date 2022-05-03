import { Flags } from '@oclif/core'

export const env = Flags.build<[string, string]>({
  char: 'e',
  description: 'optional environment variables to pass to the container',
  multiple: true,
  parse: async input => {
    const pair = input.split('=').map(str => str.trim())
    if (pair.length !== 2 || pair[0].length === 0 || pair[1].length === 0) {
      throw new Error(`Error parsing env flag. Must be in the format KEY=VALUE. Received: ${input}`)
    }
    return [pair[0], pair[1]]
  },
})
