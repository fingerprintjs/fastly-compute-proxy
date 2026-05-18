function setDirective(directives: string[], directive: 'max-age' | 's-maxage', maxValue: number) {
  const directiveIndex = directives.findIndex(
    (directivePair) => directivePair.split('=')[0].trim().toLowerCase() === directive
  )
  if (directiveIndex === -1) {
    directives.push(`${directive}=${maxValue}`)
  } else {
    const oldValue = Number(directives[directiveIndex].split('=')[1])
    const newValue = Math.min(maxValue, oldValue)
    directives[directiveIndex] = `${directive}=${newValue}`
  }
}

export function getCacheControlHeaderWithMaxAgeIfLower(
  cacheControlHeaderValue: string,
  maxMaxAge: number,
  maxSMaxAge: number
): string {
  const cacheControlDirectives = cacheControlHeaderValue.split(', ')

  setDirective(cacheControlDirectives, 'max-age', maxMaxAge)
  setDirective(cacheControlDirectives, 's-maxage', maxSMaxAge)

  return cacheControlDirectives.join(', ')
}
