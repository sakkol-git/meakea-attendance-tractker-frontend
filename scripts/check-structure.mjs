import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const reviewedLargeFiles = new Map([
  ['app/api/workspace.ts', 350],
  ['app/data/business-demo.ts', 850],
  ['app/data/demo.ts', 672],
  ['app/features/workflows/catalog.ts', 414],
  ['app/features/workflows/forms.ts', 344],
  ['app/pages/workflows/[id].vue', 400],
])
const sourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|vue)$/.test(entry.name) ? [relative('.', path)] : []
  })
const failures = []

for (const path of sourceFiles('app')) {
  const lines = readFileSync(path, 'utf8').trimEnd().split('\n').length
  if (lines <= 300) continue
  const reviewedLimit = reviewedLargeFiles.get(path)
  if (reviewedLimit === undefined)
    failures.push(`${path} is ${lines} lines and needs a cohesion review`)
  else if (lines > reviewedLimit)
    failures.push(`${path} grew from its reviewed ${reviewedLimit}-line limit to ${lines}`)
}
for (const path of reviewedLargeFiles.keys()) {
  if (!sourceFiles('app').includes(path)) failures.push(`${path} is a stale structure exception`)
}
if (failures.length) throw new Error(failures.join('\n'))
console.log(`Structure budget passed; ${reviewedLargeFiles.size} existing large files cannot grow.`)
