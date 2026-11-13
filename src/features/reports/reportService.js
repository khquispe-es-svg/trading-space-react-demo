import { supabase } from '../../lib/supabase.js'

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

async function fetchHeaders(table, columns, dateField, fromDate, toDate, signal) {
  return fetchAllPages((offset) => {
    let query = supabase.from(table).select(columns)
    query = withDateRange(query, dateField, fromDate, toDate)
      .order(dateField, { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    return withAbortSignal(query, signal)
  })
}

async function fetchRelatedRows(table, columns, foreignKey, parentIds, signal) {
  const rows = []
  for (
    let idOffset = 0;
    idOffset < parentIds.length;
    idOffset += RELATED_ID_BATCH_SIZE
  ) {
    const ids = parentIds.slice(idOffset, idOffset + RELATED_ID_BATCH_SIZE)
    const batch = await fetchAllPages((offset) =>
      withAbortSignal(
        supabase
          .from(table)
          .select(columns)
          .in(foreignKey, ids)
          .order('id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1),
        signal,
      ),
    )
    rows.push(...batch)
  }
  return rows
}

export async function fetchReportData({
  fromDate = '',
  toDate = '',
  signal,
} = {}) {
  const [sales, purchases] = await Promise.all([
    fetchHeaders(
      'Venta',
      'id,total,fecha_venta',
      'fecha_venta',
      fromDate,
      toDate,
      signal,
    ),
    fetchHeaders(
      'compras',
      'id,total,fecha_compra',
      'fecha_compra',
      fromDate,
      toDate,
      signal,
    ),
  ])

  const [saleDetails, purchaseDetails] = await Promise.all([
    fetchRelatedRows(
      'DetalleVenta',
      'id,venta_id,cantidad',
      'venta_id',
      sales.map((sale) => sale.id),
      signal,
    ),
    fetchRelatedRows(
      'detalles_compra',
      'id,compra_id,cantidad',
      'compra_id',
      purchases.map((purchase) => purchase.id),
      signal,
    ),
  ])

  return { sales, purchases, saleDetails, purchaseDetails }
}
