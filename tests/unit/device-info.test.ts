import { describe, expect, it } from 'vitest'
import { getDeviceInfo } from '../../src/utils/device-info'

const cases = [
  {
    name: 'Chrome on Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    expected: ['Chrome', '126.0.0.0', 'Windows', '10.0', 'none', 'none'],
  },
  {
    name: 'Edge on Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.81',
    expected: ['Edge', '126.0.2592.81', 'Windows', '10.0', 'none', 'none'],
  },
  {
    name: 'Opera on Linux',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/111.0.0.0',
    expected: ['Opera', '111.0.0.0', 'Linux', 'none', 'none', 'none'],
  },
  {
    name: 'Firefox on Mac',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0',
    expected: ['Firefox', '127.0', 'Mac OS', '10.15', 'none', 'none'],
  },
  {
    name: 'Safari on iPhone',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    expected: ['Safari', '17.5', 'iOS', '17.5', 'Apple', 'iPhone'],
  },
  {
    name: 'Chrome on Android',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    expected: ['Chrome', '126.0.0.0', 'Android', '14', 'none', 'Pixel 8'],
  },
  {
    name: 'Chrome on Android without a Build token',
    ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    expected: ['Chrome', '126.0.0.0', 'Android', '10', 'none', 'K'],
  },
  {
    name: 'Chrome OS',
    ua: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    expected: ['Chrome', '126.0.0.0', 'Chrome OS', '14541.0.0', 'none', 'none'],
  },
  {
    name: 'an unknown agent',
    ua: 'curl/8.0',
    expected: ['none', 'none', 'none', 'none', 'none', 'none'],
  },
]

describe('getDeviceInfo', () => {
  it.each(cases)('parses $name', ({ ua, expected }) => {
    const info = getDeviceInfo(ua)
    expect([
      info.browserName,
      info.browserVersion,
      info.osName,
      info.osVersion,
      info.mobileVendor,
      info.mobileModel,
    ]).toEqual(expected)
  })
})
