import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from, rpc } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from, rpc },
}))

import {
  createProduct,
  deleteProduct,
  fetchProductImeis,
  findExistingImeis,
  updateProduct,
} from './productService.js'

function createQuery(response) {
  const query = {
    abortSignal: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(() => query),
    update: vi.fn(() => query),
    then(resolve, reject) {
      return Promise.resolve(response).then(resolve, reject)
    },
  }

  return query
}

describe('productService RPC writes', () => {
  beforeEach(() => {
    from.mockReset()
    rpc.mockReset()
  })

  it('registers products through the atomic RPC and returns its result', async () => {
    const product = { marca: 'Marca', modelo: 'Modelo' }
    const result = { id: 21, ...product }
    rpc.mockResolvedValue({ data: result, error: null })

    await expect(
      createProduct(product, '123456789012347', ''),
    ).resolves.toEqual(result)

    expect(rpc).toHaveBeenCalledWith('guardar_producto_con_imeis', {
      p_producto: product,
      p_imei1: '123456789012347',
      p_imei2: null,
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('updates products through the atomic RPC and passes null for empty IMEIs', async () => {
    const product = { marca: 'Marca actualizada' }
    const result = { id: 21, ...product }
    rpc.mockResolvedValue({ data: result, error: null })

    await expect(
      updateProduct(21, product, '', '123456789012347'),
    ).resolves.toEqual(result)

    expect(rpc).toHaveBeenCalledWith('actualizar_producto_con_imeis', {
      p_id: 21,
      p_producto: product,
      p_imei1: null,
      p_imei2: '123456789012347',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('deletes products through the safe RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    await expect(deleteProduct(21)).resolves.toBeNull()

    expect(rpc).toHaveBeenCalledWith('eliminar_producto_seguro', {
      p_id: 21,
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('propagates RPC errors without returning a success-shaped value', async () => {
    const error = { message: 'El producto tiene registros relacionados.' }
    rpc.mockResolvedValue({ data: null, error })

    await expect(deleteProduct(21)).rejects.toBe(error)
    expect(rpc).toHaveBeenCalledWith('eliminar_producto_seguro', {
      p_id: 21,
    })
  })

  it('never falls back to direct table writes for product mutations', async () => {
    rpc
      .mockResolvedValueOnce({ data: { id: 1 }, error: null })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    await createProduct({ marca: 'Marca' }, '', '')
    await updateProduct(1, { marca: 'Marca' }, '', '')
    await deleteProduct(1)

    expect(from).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      'guardar_producto_con_imeis',
      expect.any(Object),
    )
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'actualizar_producto_con_imeis',
      expect.any(Object),
    )
    expect(rpc).toHaveBeenNthCalledWith(
      3,
      'eliminar_producto_seguro',
      { p_id: 1 },
    )
  })
})

describe('productService IMEI reads', () => {
  beforeEach(() => {
    from.mockReset()
    rpc.mockReset()
  })

  it('maps positioned IMEIs and counts legacy rows without a position', async () => {
    const query = createQuery({
      data: [
        { producto_id: 18, posicion: 2, imei: 'slot-two' },
        { producto_id: 18, posicion: null, imei: 'legacy-imei' },
        { producto_id: 18, posicion: 1, imei: 'slot-one' },
      ],
      error: null,
    })
    from.mockReturnValue(query)

    await expect(fetchProductImeis(18)).resolves.toEqual({
      imei1: 'slot-one',
      imei2: 'slot-two',
      unassignedCount: 1,
    })

    expect(from).toHaveBeenCalledWith('imeis')
    expect(query.select).toHaveBeenCalledWith('producto_id,posicion,imei')
    expect(query.eq).toHaveBeenCalledWith('producto_id', 18)
  })

  it('queries existing IMEIs by value and propagates read errors', async () => {
    const query = createQuery({
      data: null,
      error: { message: 'permission denied' },
    })
    from.mockReturnValue(query)

    await expect(findExistingImeis(['123456789012347'])).rejects.toMatchObject(
      { message: 'permission denied' },
    )

    expect(from).toHaveBeenCalledWith('imeis')
    expect(query.select).toHaveBeenCalledWith('producto_id,posicion,imei')
    expect(query.in).toHaveBeenCalledWith('imei', ['123456789012347'])
  })
})
