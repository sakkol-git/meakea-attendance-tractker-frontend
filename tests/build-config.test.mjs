import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBuildConfiguration } from '../scripts/validate-build.mjs'

test('release build refuses implicit demo mode', () => {
  assert.throws(() => validateBuildConfiguration({}), /Release builds require/)
  assert.doesNotThrow(() => validateBuildConfiguration({}, true))
})

test('release build accepts only a safe remote API URL', () => {
  assert.doesNotThrow(() =>
    validateBuildConfiguration({
      NUXT_PUBLIC_DATA_SOURCE: 'remote',
      NUXT_PUBLIC_API_BASE_URL: 'https://hr.example.com/api/v1',
    }),
  )
  for (const url of [
    '',
    'http://hr.example.com/api/v1',
    'https://user:secret@hr.example.com/api/v1',
    'https://hr.example.com/api/v1?debug=true',
    'https://hr.example.com/api',
  ]) {
    assert.throws(
      () =>
        validateBuildConfiguration({
          NUXT_PUBLIC_DATA_SOURCE: 'remote',
          NUXT_PUBLIC_API_BASE_URL: url,
        }),
      /Remote builds require|API URL must/,
    )
  }
})
