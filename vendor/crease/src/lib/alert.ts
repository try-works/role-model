export type AlertSeverity = 'info' | 'success' | 'warning' | 'error'
export type AlertAnnouncement = 'static' | 'status' | 'alert'

export const alertSemantics = (
  announcement: AlertAnnouncement,
): Readonly<{
  role?: 'status' | 'alert'
  live?: 'polite' | 'assertive'
}> =>
  announcement === 'status'
    ? { role: 'status', live: 'polite' }
    : announcement === 'alert'
      ? { role: 'alert', live: 'assertive' }
      : {}
