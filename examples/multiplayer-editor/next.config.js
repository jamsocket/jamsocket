/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'encoding': 'encoding',
        'bufferutil': 'bufferutil',
        'utf-8-validate': 'utf-8-validate',
        'supports-color': 'supports-color'
      })
    }
    return config
  }
}

module.exports = nextConfig
