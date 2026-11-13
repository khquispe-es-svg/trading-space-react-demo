import { useEffect, useMemo, useState } from 'react'
import { fetchReportData } from './reportService.js'

function sum(rows, field) {
  return rows.reduce((total, row) => {
    const value = Number(row[field])
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)
}

function formatAmount(value) {
  return `Bs. ${value.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatMonth(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-BO', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function monthKey(value) {
  if (!value) return 'sin-fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'sin-fecha'
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function ReportsPage() {
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [filters, setFilters] = useState({ fromDate: '', toDate: '' })
  const [report, setReport] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retryable, setRetryable] = useState(false)
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchReportData({ ...filters, signal: controller.signal })
      .then((data) => {
        if (!active) return
        setReport(data)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los reportes.',
        )
        setRetryable(true)
        setStatus('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [filters, requestId])

  const monthlyRows = useMemo(() => {
    if (!report) return []
    const grouped = new Map()
    const ensureMonth = (date) => {
      const key = monthKey(date)
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label: formatMonth(date),
          saleCount: 0,
          salesTotal: 0,
          purchaseCount: 0,
          purchasesTotal: 0,
        })
      }
      return grouped.get(key)
    }

    report.sales.forEach((sale) => {
      const row = ensureMonth(sale.fecha_venta)
      row.saleCount += 1
      row.salesTotal += Number(sale.total) || 0
    })
    report.purchases.forEach((purchase) => {
      const row = ensureMonth(purchase.fecha_compra)
      row.purchaseCount += 1
      row.purchasesTotal += Number(purchase.total) || 0
    })
    return [...grouped.values()].sort((left, right) =>
      right.key.localeCompare(left.key),
    )
  }, [report])

  const applyFilters = (event) => {
    event.preventDefault()
    if (fromInput && toInput && fromInput > toInput) {
      setError('La fecha inicial no puede ser posterior a la fecha final.')
      setRetryable(false)
      setStatus('error')
      return
    }
    setError('')
    setRetryable(false)
    setStatus('loading')
    setFilters({ fromDate: fromInput, toDate: toInput })
  }

  const metrics = report
    ? [
        {
          label: 'Ventas registradas',
          value: report.sales.length.toLocaleString('es-BO'),
          description: 'Registros en Venta',
        },
        {
          label: 'Ingresos por ventas',
          value: formatAmount(sum(report.sales, 'total')),
          description: 'Suma de Venta.total',
        },
        {
          label: 'Compras registradas',
          value: report.purchases.length.toLocaleString('es-BO'),
          description: 'Registros en compras',
        },
        {
          label: 'Total de compras',
          value: formatAmount(sum(report.purchases, 'total')),
          description: 'Suma de compras.total',
        },
        {
          label: 'Unidades vendidas',
          value: sum(report.saleDetails, 'cantidad').toLocaleString('es-BO'),
          description: 'Suma de DetalleVenta.cantidad',
        },
        {
          label: 'Unidades adquiridas',
          value: sum(report.purchaseDetails, 'cantidad').toLocaleString('es-BO'),
          description: 'Suma de detalles_compra.cantidad',
        },
      ]
    : []

  const hasData =
    report &&
    (report.sales.length > 0 ||
      report.purchases.length > 0 ||
      report.saleDetails.length > 0 ||
      report.purchaseDetails.length > 0)

  return (
    <section className="space-y-4">
      <form
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between"
        onSubmit={applyFilters}
      >
        <div>
          <h3 className="text-lg font-bold text-blue-950">Reportes</h3>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores calculados desde las tablas de ventas y compras
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <label className="text-xs font-medium text-slate-600">
            Desde
            <input
              className="mt-1 block h-9 rounded-lg border border-slate-300 px-2 text-sm"
              onChange={(event) => setFromInput(event.target.value)}
              type="date"
              value={fromInput}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Hasta
            <input
              className="mt-1 block h-9 rounded-lg border border-slate-300 px-2 text-sm"
              onChange={(event) => setToInput(event.target.value)}
              type="date"
              value={toInput}
            />
          </label>
          <button
            className="col-span-2 h-9 rounded-lg bg-blue-800 px-4 text-xs font-semibold text-white hover:bg-blue-900 sm:col-span-1"
            type="submit"
          >
            Aplicar filtros
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-950">
        Los importes corresponden a totales registrados. No se calcula
        ganancia: el costo histórico, inventario y reglas de margen no están
        confirmados para ese cálculo.
      </div>

      {status === 'loading' && (
        <div aria-live="polite" className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          Cargando datos reales…
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-800" role="alert">
          <p>{error}</p>
          {retryable && (
            <button
              className="mt-3 h-8 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white"
              onClick={() => {
                setStatus('loading')
                setError('')
                setRetryable(false)
                setRequestId((current) => current + 1)
              }}
              type="button"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      {status === 'success' && !hasData && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          No hay ventas ni compras registradas para el periodo seleccionado.
        </div>
      )}
      {status === 'success' && hasData && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                key={metric.label}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-xl font-bold text-blue-950">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">{metric.description}</p>
              </article>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h4 className="text-sm font-bold text-blue-950">
                Resumen mensual
              </h4>
            </div>
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Ventas</th>
                  <th className="px-4 py-3">Ingresos</th>
                  <th className="px-4 py-3">Compras</th>
                  <th className="px-4 py-3">Total compras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyRows.map((row) => (
                  <tr className="text-slate-700" key={row.key}>
                    <td className="px-4 py-3 font-medium text-blue-950">
                      {row.label}
                    </td>
                    <td className="px-4 py-3">{row.saleCount}</td>
                    <td className="px-4 py-3">{formatAmount(row.salesTotal)}</td>
                    <td className="px-4 py-3">{row.purchaseCount}</td>
                    <td className="px-4 py-3">{formatAmount(row.purchasesTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default ReportsPage
