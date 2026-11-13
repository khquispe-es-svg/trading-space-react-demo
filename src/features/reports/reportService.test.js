import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from },
}))

import { fetchReportData } from './reportService.js'

function createQuery(response) {
  const query = {
    abortSignal: vi.fn(() => query),
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

describe('reportService', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('reads real sale and purchase headers with date filters', async () => {
    const salesQuery = createQuery({ data: [], error: null })
    const purchasesQuery = createQuery({ data: [], error: null })
    from.mockReturnValueOnce(salesQuery).mockReturnValueOnce(purchasesQuery)

    await expect(
      fetchReportData({ fromDate: '2026-03-01', toDate: '2026-03-31' }),
    ).resolves.toEqual({
      sales: [],
      purchases: [],
      saleDetails: [],
      purchaseDetails: [],
    })

    expect(from).toHaveBeenNthCalledWith(1, 'Venta')
    expect(salesQuery.select).toHaveBeenCalledWith('id,total,fecha_venta')
    expect(salesQuery.gte).toHaveBeenCalledWith(
      'fecha_venta',
      '2026-03-01T00:00:00.000Z',
    )
    expect(from).toHaveBeenNthCalledWith(2, 'compras')
    expect(purchasesQuery.select).toHaveBeenCalledWith(
      'id,total,fecha_compra',
    )
    expect(purchasesQuery.lt).toHaveBeenCalledWith(
      'fecha_compra',
      '2026-04-01T00:00:00.000Z',
    )
  })

  it('returns Supabase read errors instead of a success-shaped report', async () => {
    const query = createQuery({
      data: null,
      error: { message: 'permission denied' },
    })
    from.mockReturnValue(query)

    await expect(fetchReportData()).rejects.toMatchObject({
      message: 'permission denied',
    })
  })

  it('loads detail rows only for the filtered sale and purchase IDs', async () => {
    const responses = {
      Venta: [{ id: 10, total: '250', fecha_venta: '2026-03-10T12:00:00Z' }],
      compras: [{ id: 20, total: '100', fecha_compra: '2026-03-11T12:00:00Z' }],
      DetalleVenta: [{ id: 1, venta_id: 10, cantidad: 2 }],
      detalles_compra: [{ id: 2, compra_id: 20, cantidad: 5 }],
    }
    const queries = new Map()
    from.mockImplementation((table) => {
      const query = createQuery({
        data: responses[table],
        error: null,
      })
      queries.set(table, query)
      return query
    })

    await expect(fetchReportData()).resolves.toEqual({
      sales: responses.Venta,
      purchases: responses.compras,
      saleDetails: responses.DetalleVenta,
      purchaseDetails: responses.detalles_compra,
    })

    expect(queries.get('DetalleVenta').in).toHaveBeenCalledWith('venta_id', [
      10,
    ])
    expect(queries.get('detalles_compra').in).toHaveBeenCalledWith(
      'compra_id',
      [20],
    )
  })
})
