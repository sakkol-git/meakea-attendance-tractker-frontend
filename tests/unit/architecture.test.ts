import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const root = resolve('app')
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory()
      ? files(`${dir}/${x.name}`)
      : /\.(ts|vue)$/.test(x.name)
        ? [`${dir}/${x.name}`]
        : [],
  )
}
export function violations(path: string, source: string) {
  const errors: string[] = []
  const presentation = /\/(pages|components|layouts)\//.test(path)
  if (presentation && /\b(fetch|\$fetch)\s*\(/.test(source))
    errors.push('HTTP belongs to the data adapter')
  if (
    presentation &&
    /(?:api\.(?:list|create|detail|change|update)\(['"`]\/|\.\$demoSource|localStorage\.|sessionStorage\.)/.test(
      source,
    )
  )
    errors.push('Transport paths, demo state and persistence belong behind the API')
  const imports = [...source.matchAll(/import\s+(?!type\b)[\s\S]*?from\s+['"]([^'"]+)['"]/g)].map(
    (x) => x[1]!,
  )
  if (presentation && imports.some((x) => /(?:data|api)\//.test(x)))
    errors.push('Presentation uses injected APIs through composables')
  if (
    /\/(api|data|schemas|utils|types)\//.test(path) &&
    imports.some((x) => /(?:pages|components|layouts|composables|stores|plugins)\//.test(x))
  )
    errors.push('Dependency direction points toward presentation')
  if (
    /\/(api|data|schemas|utils|types)\//.test(path) &&
    /\b(useNuxtApp|useRuntimeConfig|defineStore|defineNuxtPlugin)\s*\(/.test(source)
  )
    errors.push('Framework context belongs to the composition root')
  return errors
}
describe('Nuxt architecture fitness', () => {
  it('keeps framework-independent APIs and schemas below Nuxt presentation', () => {
    const found = files(root).flatMap((path) =>
      violations(path, readFileSync(path, 'utf8')).map((error) => `${path}: ${error}`),
    )
    expect(found).toEqual([])
  })
  it('detects forbidden examples rather than passing vacuously', () => {
    expect(violations('/app/pages/a.vue', 'fetch("/api/v1/x")')).toHaveLength(1)
    expect(violations('/app/pages/a.vue', 'api.list("/employees")')).toHaveLength(1)
    expect(violations('/app/api/a.ts', 'const app = useNuxtApp()')).toHaveLength(1)
  })
})
