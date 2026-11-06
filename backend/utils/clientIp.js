import { isIPv6 } from 'node:net'

// The address rate limits are keyed on. req.ip honours `trust proxy` (set in production in index.js).
// An IPv6 user typically controls a whole /64, so limits apply to that prefix rather than single addresses.
export const clientIp = (req) => {
  const ip = (req.ip ?? req.socket?.remoteAddress ?? 'unknown').split('%')[0]
  if (ip.startsWith('::ffff:')) return ip.slice(7)
  if (!isIPv6(ip)) return ip

  const [head, tail = ''] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = ip.includes('::') ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left
  return `${groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16)).join(':')}::/64`
}
