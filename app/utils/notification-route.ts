interface NoticeTarget {
  kind?: string | null
  recordId?: string | null
  to?: string | null
}
/** Domain facts link only to known local views; absent legacy targets remain read-only. */
export function notificationRoute(notice: NoticeTarget): string | undefined {
  if (notice.kind && notice.recordId && /^[a-z0-9-]+$/.test(notice.recordId)) {
    const id = notice.recordId
    if (notice.kind === 'request') return `/requests/${id}`
    if (notice.kind === 'leave') return `/leave/${id}`
    if (notice.kind === 'correction') return `/attendance?correction=${id}`
    if (notice.kind === 'attendance') return '/attendance'
  }
  const legacy = notice.to
  return legacy &&
    /^(?:\/(?:requests|leave)\/[a-z0-9-]+|\/attendance(?:\?correction=[a-z0-9-]+)?|\/notifications|\/)$/.test(
      legacy,
    )
    ? legacy
    : undefined
}
