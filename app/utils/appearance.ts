export type Appearance = 'system' | 'light' | 'dark'
export function appearancePreference(value: string | null): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system'
}
export function darkAppearance(preference: Appearance, systemDark: boolean) {
  return preference === 'dark' || (preference === 'system' && systemDark)
}
