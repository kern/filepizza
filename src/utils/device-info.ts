export type DeviceInfo = {
  browserName: string
  browserVersion: string
  osName: string
  osVersion: string
  mobileVendor: string
  mobileModel: string
}

const NONE = 'none'

// Order matters: Edge, Opera and Chrome on iOS all also claim to be Chrome or
// Safari, so the more specific tokens come first.
const BROWSERS: Array<[string, RegExp]> = [
  ['Edge', /\bEdgA?\/([\d.]+)/],
  ['Opera', /\bOPR\/([\d.]+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/([\d.]+)/],
  ['Safari', /\bVersion\/([\d.]+).*\bSafari\//],
]

const SYSTEMS: Array<[string, RegExp]> = [
  ['Windows', /\bWindows NT ([\d.]+)/],
  ['iOS', /\bOS ([\d_]+) like Mac OS X/],
  ['Android', /\bAndroid ([\d.]+)/],
  ['Mac OS', /\bMac OS X ([\d_.]+)/],
  ['Chrome OS', /\bCrOS \S+ ([\d.]+)/],
  ['Linux', /\bLinux()/],
]

function match(
  table: Array<[string, RegExp]>,
  userAgent: string,
): [string, string] {
  for (const [name, pattern] of table) {
    const found = pattern.exec(userAgent)
    if (found) return [name, found[1].replace(/_/g, '.') || NONE]
  }
  return [NONE, NONE]
}

export function getDeviceInfo(userAgent: string): DeviceInfo {
  const [browserName, browserVersion] = match(BROWSERS, userAgent)
  const [osName, osVersion] = match(SYSTEMS, userAgent)

  let mobileVendor = NONE
  let mobileModel = NONE
  const apple = /\b(iPhone|iPad|iPod)\b/.exec(userAgent)
  const android = /\bAndroid [\d.]+; ([^;)]+?)(?: Build|[;)])/.exec(userAgent)
  if (apple) {
    mobileVendor = 'Apple'
    mobileModel = apple[1]
  } else if (android) {
    mobileModel = android[1]
  }

  return {
    browserName,
    browserVersion,
    osName,
    osVersion,
    mobileVendor,
    mobileModel,
  }
}
