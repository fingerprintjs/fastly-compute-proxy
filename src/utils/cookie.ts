import { parse } from 'cookie'

export function getFilteredCookies(cookieValue: string | null, filterFunc: (key: string) => boolean): string {
  const cookie = parse(cookieValue ?? '')
  const filteredCookieList = []
  for (const cookieName in cookie) {
    if (filterFunc(cookieName)) {
      filteredCookieList.push(`${cookieName}=${cookie[cookieName]}`)
    }
  }

  return filteredCookieList.length > 0 ? filteredCookieList.join('; ') : ''
}
