export function normalizeProductFieldInput(kind, value) {
  if (kind === 'brand') {
    return value.replace(/[^\p{L}\p{M}\s]/gu, '')
  }

  if (kind === 'model') {
    return value.replace(/[^\p{L}\p{M}0-9\s.+-]/gu, '')
  }

  if (kind === 'decimal') {
    const normalized = value.replace(',', '.')
    return /^\d*(?:\.\d*)?$/.test(normalized) ? normalized : null
  }

  if (kind === 'integer') {
    return /^\d*$/.test(value) ? value : null
  }

  if (kind === 'imei') {
    return /^\d{0,15}$/.test(value) ? value : null
  }

  return value
}

export function validateProductBrand(value) {
  const brand = String(value ?? '').trim()
  if (brand && /[^\p{L}\p{M}\s]/u.test(brand)) {
    return 'La marca solo puede contener letras y espacios.'
  }
  return ''
}

export function validateProductModel(value) {
  const model = String(value ?? '').trim()
  if (model && !/\p{L}/u.test(model)) {
    return 'El modelo debe incluir al menos una letra.'
  }
  return ''
}
