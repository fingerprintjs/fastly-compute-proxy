import { getIngressBackendByRegion } from '../../src/utils/getIngressBackendByRegion'
import { expect, jest } from '@jest/globals'
import { Backend } from 'fastly:backend'

describe('Get Ingress Backend By Region - fingerprint backend', () => {
  beforeEach(() => {
    jest.spyOn(Backend, 'exists').mockReturnValue(true)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return fingerprint for eu region', () => {
    const url = new URL('https://test/?region=eu')
    expect(getIngressBackendByRegion(url)).toBe('fingerprint')
  })

  it('should return fingerprint for ap region', () => {
    const url = new URL('https://test/?region=ap')
    expect(getIngressBackendByRegion(url)).toBe('fingerprint')
  })

  it('should return fingerprint for us region', () => {
    const url = new URL('https://test/?region=us')
    expect(getIngressBackendByRegion(url)).toBe('fingerprint')
  })

  it('should return fingerprint when no region is specified', () => {
    const url = new URL('https://test/')
    expect(getIngressBackendByRegion(url)).toBe('fingerprint')
  })
})

describe('Get Ingress Backend By Region - legacy fallback', () => {
  beforeEach(() => {
    jest.spyOn(Backend, 'exists').mockReturnValue(false)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return eu.api.fpjs.io for eu region', () => {
    const url = new URL('https://test/?region=eu')
    expect(getIngressBackendByRegion(url)).toBe('eu.api.fpjs.io')
  })

  it('should return ap.api.fpjs.io for ap region', () => {
    const url = new URL('https://test/?region=ap')
    expect(getIngressBackendByRegion(url)).toBe('ap.api.fpjs.io')
  })

  it('should return api.fpjs.io for us region', () => {
    const url = new URL('https://test/?region=us')
    expect(getIngressBackendByRegion(url)).toBe('api.fpjs.io')
  })

  it('should return api.fpjs.io when no region is specified', () => {
    const url = new URL('https://test/')
    expect(getIngressBackendByRegion(url)).toBe('api.fpjs.io')
  })

  it('should return api.fpjs.io for an invalid region', () => {
    const url = new URL('https://test/?region=invalid')
    expect(getIngressBackendByRegion(url)).toBe('api.fpjs.io')
  })
})
