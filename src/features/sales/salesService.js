import { supabase } from '../../lib/supabase.js'

const SALE_COLUMNS =
  'id,codigo,cliente_id,cliente_codigo,vendedor_id,fecha_venta,metodo_pago,total,estado'
const CLIENT_COLUMNS =
  'id,nombre,nombres,apellido_paterno,apellido_materno,Id_Cliente'
const USER_COLUMNS =
  'id,nombre,apellido_paterno,apellido_materno,email'
const DETAIL_COLUMNS =
  'id,venta_id,precio_venta,variante_id,cantidad,producto_codigo'

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))]
}

function addAbortSignal(query, signal) {
  return signal ? query.abortSignal(signal) : query
}

async function fetchRelatedRows({
  table,
  columns,
  key,
  values,
  label,
  signal,
  warnings,
}) {
  if (values.length === 0) return []

  const query = addAbortSignal(
    supabase.from(table).select(columns).in(key, values),
    signal,
  )
  const { data, error } = await query

  if (error) {
    warnings.push(`${label}: ${error.message}`)
    return []
  }

  return data ?? []
}

export async function fetchSales(signal) {
  const query = addAbortSignal(
    supabase
      .from('Venta')
      .select(SALE_COLUMNS)
      .order('fecha_venta', { ascending: false }),
    signal,
  )
  const { data, error } = await query

  if (error) throw error

  const sales = data ?? []
  const warnings = []
  const clientIds = uniqueValues(sales.map((sale) => sale.cliente_id))
  const sellerIds = uniqueValues(sales.map((sale) => sale.vendedor_id))

  const [clients, sellers] = await Promise.all([
    fetchRelatedRows({
      table: 'Cliente',
      columns: CLIENT_COLUMNS,
      key: 'id',
      values: clientIds,
      label: 'No se pudieron consultar algunos clientes',
      signal,
      warnings,
    }),
    fetchRelatedRows({
      table: 'usuarios',
      columns: USER_COLUMNS,
      key: 'id',
      values: sellerIds,
      label: 'No se pudieron consultar algunos vendedores',
      signal,
      warnings,
    }),
  ])

  const clientsById = new Map(
    clients.map((client) => [String(client.id), client]),
  )
  const sellersById = new Map(
    sellers.map((seller) => [String(seller.id), seller]),
  )

  return {
    sales: sales.map((sale) => ({
      ...sale,
      cliente: clientsById.get(String(sale.cliente_id)) ?? null,
      vendedor: sellersById.get(String(sale.vendedor_id)) ?? null,
    })),
    warnings,
  }
}

export async function fetchSaleDetails(saleId, signal) {
  const query = addAbortSignal(
    supabase
      .from('DetalleVenta')
      .select(DETAIL_COLUMNS)
      .eq('venta_id', saleId)
      .order('id', { ascending: true }),
    signal,
  )
  const { data, error } = await query

  if (error) throw error

  const details = data ?? []
  const warnings = []
  const productCodes = uniqueValues(
    details.map((detail) => detail.producto_codigo),
  )
  const variantIds = uniqueValues(
    details.map((detail) => detail.variante_id),
  )

  const [products, variants] = await Promise.all([
    fetchRelatedRows({
      table: 'Producto',
      columns: 'codigo,marca,modelo,imagen',
      key: 'codigo',
      values: productCodes,
      label: 'No se pudieron consultar algunos productos',
      signal,
      warnings,
    }),
    fetchRelatedRows({
      table: 'variantes',
      columns: 'id',
      key: 'id',
      values: variantIds,
      label: 'No se pudieron consultar algunas variantes',
      signal,
      warnings,
    }),
  ])

  const productsByCode = new Map(
    products.map((product) => [String(product.codigo), product]),
  )
  const variantsById = new Map(
    variants.map((variant) => [String(variant.id), variant]),
  )

  return {
    details: details.map((detail) => ({
      ...detail,
      producto: productsByCode.get(String(detail.producto_codigo)) ?? null,
      variante: variantsById.get(String(detail.variante_id)) ?? null,
    })),
    warnings,
  }
}
