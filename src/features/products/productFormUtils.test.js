import { describe, expect, it } from 'vitest'
import {
  normalizeProductFieldInput,
  validateProductBrand,
  validateProductModel,
} from './productFormUtils.js'

describe('normalizeProductFieldInput', () => {
  it('limits brands to letters and spaces', () => {
    expect(normalizeProductFieldInput('brand', 'Samsu5ng-X')).toBe('SamsungX')
    expect(normalizeProductFieldInput('brand', 'Xiaomi Redmi')).toBe(
      'Xiaomi Redmi',
    )
    expect(validateProductBrand('Xiaomi Redmi')).toBe('')
    expect(validateProductBrand('Samsung5')).toBe(
      'La marca solo puede contener letras y espacios.',
    )
  })

  it('allows model names with letters and embedded numbers only', () => {
    expect(normalizeProductFieldInput('model', 'iPhone 15 Pro')).toBe(
      'iPhone 15 Pro',
    )
    expect(normalizeProductFieldInput('model', 'Galaxy S24+')).toBe(
      'Galaxy S24+',
    )
    expect(normalizeProductFieldInput('model', 'Galaxy_S24')).toBe(
      'GalaxyS24',
    )
    expect(validateProductModel('2024')).toBe(
      'El modelo debe incluir al menos una letra.',
    )
    expect(validateProductModel('')).toBe('')
    expect(validateProductModel('Galaxy S24')).toBe('')
  })

  it('accepts decimals and normalizes a decimal comma', () => {
    expect(normalizeProductFieldInput('decimal', '125.50')).toBe('125.50')
    expect(normalizeProductFieldInput('decimal', '125,50')).toBe('125.50')
    expect(normalizeProductFieldInput('decimal', '1e3')).toBeNull()
    expect(normalizeProductFieldInput('decimal', '1.2.3')).toBeNull()
  })

  it('accepts only whole-number stock values', () => {
    expect(normalizeProductFieldInput('integer', '12')).toBe('12')
    expect(normalizeProductFieldInput('integer', '12.5')).toBeNull()
    expect(normalizeProductFieldInput('integer', '-1')).toBeNull()
  })

  it('accepts only up to 15 IMEI digits', () => {
    expect(normalizeProductFieldInput('imei', '123456789012345')).toBe(
      '123456789012345',
    )
    expect(normalizeProductFieldInput('imei', '12345a')).toBeNull()
    expect(normalizeProductFieldInput('imei', '1234567890123456')).toBeNull()
  })
})
