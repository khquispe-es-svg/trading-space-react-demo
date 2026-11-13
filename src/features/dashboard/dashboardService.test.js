import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from },
}))

import { fetchDashboardMetrics } from './dashboardService.js'

function createQuery(response) {
  const query = {
    abortSignal: vi.fn(() => query),
    gte: vi.fn(() => query),
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

describe('dashboardService', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('returns counts and same-day sales totals from Supabase reads', async () => {
    const responses = {
      Producto: { data: null, count: 7, error: null },
      Cliente: { data: null, count: 4, error: null },
      Venta: {
        data: [
          { id: 2, total: '12.5', fecha_venta: '2026-11-12T10:00:00Z' },
          { id: 3, total: '7.5', fecha_venta: '2026-11-12T13:00:00Z' },
        ],
        error: null,
      },
    }
    from.mockImplementation((table) => createQuery(responses[table]))

    await expect(
      fetchDashboardMetrics({ now: new Date('2026-11-12T15:00:00-04:00') }),
    ).resolves.toEqual({
      productsCount: 7,
      clientsCount: 4,
      todaySalesCount: 2,
      todaySalesTotal: 20,
    })
    expect(from).toHaveBeenCalledWith('Producto')
    expect(from).toHaveBeenCalledWith('Cliente')
    expect(from).toHaveBeenCalledWith('Venta')
  })

  it('surfaces denied reads rather than replacing them with demo metrics', async () => {
    from.mockImplementation((table) =>
      createQuery({
        data: null,
        count: null,
        error:
          table === 'Producto'
            ? { message: 'permission denied' }
            : null,
      }),
    )

    await expect(
      fetchDashboardMetrics({ now: new Date('2026-11-12T15:00:00Z') }),
    ).rejects.toMatchObject({ message: 'permission denied' })
  })
})
