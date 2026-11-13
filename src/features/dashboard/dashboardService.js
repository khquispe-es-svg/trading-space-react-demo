import { supabase } from '../../lib/supabase.js'

const PAGE_SIZE = 1000

function addAbortSignal(query, signal) {
  return signal ? query.abortSignal(signal) : query
}

function localDayBounds(now) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

async function fetchTodaySales(signal, now) {
  const { start, end } = localDayBounds(now)
  const rows = []

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = addAbortSignal(
      supabase
        .from('Venta')
        .select('id,total,fecha_venta')
        .gte('fecha_venta', start)
        .lt('fecha_venta', end)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      signal,
    )
    const { data, error } = await query
    if (error) throw error

    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

async function fetchCount(table, signal) {
  const { count, error } = await addAbortSignal(
    supabase.from(table).select('id', { count: 'exact', head: true }),
    signal,
  )
  if (error) throw error
  return count ?? 0
}

export async function fetchDashboardMetrics({ signal, now = new Date() } = {}) {
  const [productsCount, clientsCount, todaySales] = await Promise.all([
    fetchCount('Producto', signal),
    fetchCount('Cliente', signal),
    fetchTodaySales(signal, now),
  ])

  const todaySalesTotal = todaySales.reduce((total, sale) => {
    const amount = Number(sale.total)
    return total + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  return {
    productsCount,
    clientsCount,
    todaySalesCount: todaySales.length,
    todaySalesTotal,
  }
}
