import { pathToFileURL } from 'node:url'

export function validateBuildConfiguration(environment, demoBuild = false) {
  const mode = environment.NUXT_PUBLIC_DATA_SOURCE || 'local'
  if (!['local', 'remote'].includes(mode)) {
    throw new Error('NUXT_PUBLIC_DATA_SOURCE must be local or remote.')
  }
  if (mode === 'local') {
    if (!demoBuild) {
      throw new Error(
        'Release builds require NUXT_PUBLIC_DATA_SOURCE=remote. Use npm run build:demo only for an explicitly labeled demonstration artifact.',
      )
    }
    return
  }

  let url
  try {
    url = new URL(environment.NUXT_PUBLIC_API_BASE_URL || '')
  } catch {
    throw new Error('Remote builds require an absolute NUXT_PUBLIC_API_BASE_URL.')
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.replace(/\/$/, '').endsWith('/api/v1')
  ) {
    throw new Error(
      'The API URL must use HTTPS, end in /api/v1, and contain no credentials, query, or fragment. HTTP is allowed only for loopback development.',
    )
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    validateBuildConfiguration(process.env, process.argv.includes('--demo'))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
