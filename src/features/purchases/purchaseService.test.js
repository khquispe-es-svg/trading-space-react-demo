import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from },
}))

import { fetchPurchaseDetails, fetchPurchases } from './purchaseService.js'

function createQuery(response) {
  const query = {
    abortSignal: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    select: vi.fn(() => query),
    then(resolve, reject) {
      return Promise.resolve(response).then(resolve, reject)
    },
  }
  return query
}

describe('purchaseService', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('reads purchases with confirmed columns and date filters', async () => {
    const query = createQuery({ data: [], error: null })
    from.mockReturnValue(query)

    await expect(
      fetchPurchases({ fromDate: '2026-01-01', toDate: '2026-01-31' }),
    ).resolves.toEqual([])

    expect(from).toHaveBeenCalledWith('compras')
    expect(query.select).toHaveBeenCalledWith(
      'id,proveedor_id,usuario_id,fecha_compra,metodo_pago,total,created_at,updated_at',
    )
    expect(query.gte).toHaveBeenCalledWith(
      'fecha_compra',
      '2026-01-01T00:00:00.000Z',
    )
    expect(query.lt).toHaveBeenCalledWith(
      'fecha_compra',
      '2026-02-01T00:00:00.000Z',
    )
  })

  it('surfaces errors when reading purchase details', async () => {
    const query = createQuery({
      data: null,
      error: { message: 'permission denied' },
    })
    from.mockReturnValue(query)

    await expect(fetchPurchaseDetails(12)).rejects.toMatchObject({
      message: 'permission denied',
    })
    expect(from).toHaveBeenCalledWith('detalles_compra')
    expect(query.select).toHaveBeenCalledWith(
      'id,compra_id,producto_id,cantidad,precio_unitario,subtotal,variante_id',
    )
    expect(query.eq).toHaveBeenCalledWith('compra_id', 12)
  })

  it('loads purchase line items and their confirmed product fields', async () => {
    const detailsQuery = createQuery({
      data: [
        {
          id: 4,
          compra_id: 12,
          producto_id: 8,
          cantidad: 2,
          precio_unitario: '100',
          subtotal: '200',
          variante_id: 3,
        },
      ],
      error: null,
    })
    const productsQuery = createQuery({
      data: [{ id: 8, marca: 'Marca', modelo: 'Modelo' }],
      error: null,
    })
    from.mockReturnValueOnce(detailsQuery).mockReturnValueOnce(productsQuery)

    await expect(fetchPurchaseDetails(12)).resolves.toEqual([
      expect.objectContaining({
        id: 4,
        variante_id: 3,
        producto: { id: 8, marca: 'Marca', modelo: 'Modelo' },
      }),
    ])
    expect(from).toHaveBeenNthCalledWith(1, 'detalles_compra')
    expect(from).toHaveBeenNthCalledWith(2, 'Producto')
    expect(productsQuery.select).toHaveBeenCalledWith('id,marca,modelo')
    expect(productsQuery.in).toHaveBeenCalledWith('id', [8])
  })
})
