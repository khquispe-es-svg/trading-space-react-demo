import { supabase } from '../../lib/supabase.js'

const PURCHASE_COLUMNS =
  'id,proveedor_id,usuario_id,fecha_compra,metodo_pago,total,created_at,updated_at'
const PURCHASE_DETAIL_COLUMNS =
  'id,compra_id,producto_id,cantidad,precio_unitario,subtotal,variante_id'
const PAGE_SIZE = 1000
const RELATED_ID_BATCH_SIZE = 100

function nextDateStart(date) {
  const next = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(next.getTime())) {
    throw new Error('La fecha de filtro no es válida.')
  }
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}

function withDateRange(query, field, fromDate, toDate) {
  let result = query
  if (fromDate) result = result.gte(field, `${fromDate}T00:00:00.000Z`)
  if (toDate) result = result.lt(field, nextDateStart(toDate))
  return result
}

function withAbortSignal(query, signal) {
  return signal ? query.abortSignal(signal) : query
}

async function fetchAllPages(buildQuery) {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await buildQuery(offset)
    if (error) throw error

    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

export async function fetchPurchases({
  fromDate = '',
  toDate = '',
  signal,
} = {}) {
  return fetchAllPages((offset) => {
    let query = supabase
      .from('compras')
      .select(PURCHASE_COLUMNS)
    query = withDateRange(query, 'fecha_compra', fromDate, toDate)
      .order('fecha_compra', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    return withAbortSignal(query, signal)
  })
}

async function fetchProductsByIds(productIds, signal) {
  const products = []
  for (
    let offset = 0;
    offset < productIds.length;
    offset += RELATED_ID_BATCH_SIZE
  ) {
    const ids = productIds.slice(offset, offset + RELATED_ID_BATCH_SIZE)
    const rows = await fetchAllPages((pageOffset) =>
      withAbortSignal(
        supabase
          .from('Producto')
          .select('id,marca,modelo')
          .in('id', ids)
          .order('id', { ascending: true })
          .range(pageOffset, pageOffset + PAGE_SIZE - 1),
        signal,
      ),
    )
    products.push(...rows)
  }
  return products
}

export async function fetchPurchaseDetails(purchaseId, signal) {
  const details = await fetchAllPages((offset) =>
    withAbortSignal(
      supabase
        .from('detalles_compra')
        .select(PURCHASE_DETAIL_COLUMNS)
        .eq('compra_id', purchaseId)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      signal,
    ),
  )

  const productIds = [
    ...new Set(
      details
        .map((detail) => detail.producto_id)
        .filter((id) => id !== null && id !== undefined),
    ),
  ]
  const products = await fetchProductsByIds(productIds, signal)
  const productsById = new Map(
    products.map((product) => [String(product.id), product]),
  )

  return details.map((detail) => ({
    ...detail,
    producto: productsById.get(String(detail.producto_id)) ?? null,
  }))
}
