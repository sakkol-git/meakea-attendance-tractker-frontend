import { expect, it } from 'vitest'
import { appearancePreference, darkAppearance } from '../../app/utils/appearance'

it('follows the device unless the user explicitly chooses an appearance', () => {
  expect(darkAppearance('system', true)).toBe(true)
  expect(darkAppearance('system', false)).toBe(false)
  expect(darkAppearance('light', true)).toBe(false)
  expect(darkAppearance('dark', false)).toBe(true)
})
it('treats unavailable or invalid stored preferences as device appearance', () => {
  expect(appearancePreference(null)).toBe('system')
  expect(appearancePreference('unexpected')).toBe('system')
  expect(appearancePreference('dark')).toBe('dark')
})
