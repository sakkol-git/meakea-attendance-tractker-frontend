/** Component wrappers may carry aria-invalid while their input owns focus. */
export function focusInvalidField(form?: HTMLFormElement) {
  const invalid = form?.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!invalid) return
  const target = invalid.matches('input, textarea, select, [tabindex]:not([tabindex="-1"])')
    ? invalid
    : invalid.querySelector<HTMLElement>('input, textarea, select, [tabindex]:not([tabindex="-1"])')
  target?.focus()
}
