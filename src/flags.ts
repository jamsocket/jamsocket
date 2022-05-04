import { Flags } from '@oclif/core'

export const env = Flags.build<[string, string]>({
  char: 'e',
  description: 'optional environment variables to pass to the container',
  multiple: true,
  parse: async input => {
    const match = input.match(/([^=]+)=(.+)/s)
    if (!match) {
      throw new Error(`Error parsing env flag. Must be in the format KEY=VALUE. Received: ${input}`)
    }
    return [match[1], match[2]]
  },
})
