const attempts = new Map<string, number[]>()
const lockouts = new Map<string, number>()

const ONE_MINUTE = 60_000
const FIFTEEN_MINUTES = 15 * ONE_MINUTE

export function isIpLocked(ip: string): boolean {
  const lockedUntil = lockouts.get(ip)
  return Boolean(lockedUntil && lockedUntil > Date.now())
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now()
  const recent = (attempts.get(ip) ?? []).filter((timestamp) => now - timestamp < ONE_MINUTE)
  recent.push(now)
  attempts.set(ip, recent)

  if (recent.length >= 5) {
    lockouts.set(ip, now + FIFTEEN_MINUTES)
    attempts.set(ip, [])
  }
}

export function resetFailedLogins(ip: string): void {
  attempts.set(ip, [])
  lockouts.delete(ip)
}
