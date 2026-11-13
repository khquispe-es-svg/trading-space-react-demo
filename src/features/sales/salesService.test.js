import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from },
}))

import { fetchSaleDetails, fetchSales } from './salesService.js'

function createQuery(response) {
  const query = {
    abortSignal: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    then(resolve, reject) {
      return Promise.resolve(response).then(resolve, reject)
    },
  }

  return query
}

describe('salesService', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('loads sales and resolves customers and sellers through confirmed keys', async () => {
    const salesQuery = createQuery({
      data: [
        {
          id: 21,
          codigo: 'V-021',
          cliente_id: 7,
          cliente_codigo: 'C007',
          vendedor_id: 3,
          total: '1200',
          fecha_venta: '2026-10-25T13:00:00Z',
          metodo_pago: 'Efectivo',
          estado: 'Completada',
        },
      ],
      error: null,
    })
    const clientsQuery = createQuery({
      data: [
        {
          id: 7,
          nombres: 'Elena',
          apellido_paterno: 'Rojas',
          apellido_materno: 'Paz',
          Id_Cliente: 'C007',
        },
      ],
      error: null,
    })
    const sellersQuery = createQuery({
      data: [
        { id: 3, nombre: 'Luis', apellido_paterno: 'Vega' },
      ],
      error: null,
    })
    from
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(clientsQuery)
      .mockReturnValueOnce(sellersQuery)

    const result = await fetchSales()

    expect(from).toHaveBeenNthCalledWith(1, 'Venta')
    expect(from).toHaveBeenNthCalledWith(2, 'Cliente')
    expect(from).toHaveBeenNthCalledWith(3, 'usuarios')
    expect(result.sales[0].cliente).toMatchObject({
      id: 7,
      Id_Cliente: 'C007',
    })
    expect(result.sales[0].vendedor).toMatchObject({
      id: 3,
      nombre: 'Luis',
    })
    expect(result.warnings).toEqual([])
  })

  it('returns sale details with product and variant lookups without selecting purchase cost', async () => {
    const detailsQuery = createQuery({
      data: [
        {
          id: 55,
          venta_id: 21,
          precio_venta: '600',
          variante_id: 9,
          cantidad: 2,
          producto_codigo: 'P-100',
        },
      ],
      error: null,
    })
    const productsQuery = createQuery({
      data: [
        {
          codigo: 'P-100',
          marca: 'Marca',
          modelo: 'Modelo',
        },
      ],
      error: null,
    })
    const variantsQuery = createQuery({
      data: [{ id: 9 }],
      error: null,
    })
    from
      .mockReturnValueOnce(detailsQuery)
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(variantsQuery)

    const result = await fetchSaleDetails(21)

    expect(from).toHaveBeenNthCalledWith(1, 'DetalleVenta')
    expect(detailsQuery.select).toHaveBeenCalledWith(
      'id,venta_id,precio_venta,variante_id,cantidad,producto_codigo',
    )
    expect(result.details[0].producto).toMatchObject({
      codigo: 'P-100',
      marca: 'Marca',
      modelo: 'Modelo',
    })
    expect(result.details[0].variante).toEqual({ id: 9 })
    expect(result.details[0]).not.toHaveProperty('precio_compra')
    expect(result.warnings).toEqual([])
  })

  it('keeps sale history available and reports a related-table read error', async () => {
    from
      .mockReturnValueOnce(
        createQuery({
          data: [
            {
              id: 22,
              cliente_id: 8,
              vendedor_id: 4,
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createQuery({
          data: null,
          error: { message: 'permission denied' },
        }),
      )
      .mockReturnValueOnce(createQuery({ data: [], error: null }))

    const result = await fetchSales()

    expect(result.sales).toHaveLength(1)
    expect(result.sales[0].cliente).toBeNull()
    expect(result.warnings).toEqual([
      'No se pudieron consultar algunos clientes: permission denied',
    ])
  })
})
