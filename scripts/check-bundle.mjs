import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const assetDirectory = '.output/public/_nuxt'
const budgets = {
  totalJavaScript: 1_500_000,
  largestJavaScript: 500_000,
  totalCss: 80_000,
  totalFonts: 160_000,
}

const files = readdirSync(assetDirectory).map((name) => ({
  name,
  bytes: statSync(join(assetDirectory, name)).size,
}))
const bytes = (pattern) => files.filter(({ name }) => pattern.test(name)).map(({ bytes }) => bytes)
const javascript = bytes(/\.js$/)
const css = bytes(/\.css$/)
const fonts = bytes(/\.woff2$/)
const total = (values) => values.reduce((sum, value) => sum + value, 0)
const checks = [
  ['total JavaScript', total(javascript), budgets.totalJavaScript],
  ['largest JavaScript chunk', Math.max(0, ...javascript), budgets.largestJavaScript],
  ['total CSS', total(css), budgets.totalCss],
  ['total WOFF2 fonts', total(fonts), budgets.totalFonts],
]
const failures = checks.filter(([, actual, budget]) => actual > budget)

for (const [label, actual, budget] of checks) {
  console.log(`${label}: ${actual} / ${budget} bytes`)
}
if (failures.length) {
  throw new Error(`Bundle budget exceeded: ${failures.map(([label]) => label).join(', ')}`)
}
