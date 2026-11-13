import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchSaleDetails, fetchSales } from './salesService.js'

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

function displayValue(value) {
  return value === null || value === undefined || value === ''
    ? '—'
    : String(value)
}

function formatDate(value) {
  if (!value) return '—'

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
  const date = new Date(dateOnly ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    ...(dateOnly ? {} : { timeStyle: 'short' }),
  }).format(date)
}

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'

  return `Bs. ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getClientName(client) {
  if (!client) return ''

  return [
    client.nombres || client.nombre,
    client.apellido_paterno,
    client.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
}

function getSellerName(seller) {
  if (!seller) return ''

  return [
    seller.nombre,
    seller.apellido_paterno,
    seller.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
}

function getSaleCode(sale) {
  return sale.codigo ? String(sale.codigo) : `#${sale.id}`
}

function getRelationFallback(label, id) {
  return id === null || id === undefined
    ? `${label} no disponible`
    : `${label} no disponible (ID ${id})`
}

function getSubtotal(detail) {
  const price = Number(detail.precio_venta)
  const quantity = Number(detail.cantidad)
  if (!Number.isFinite(price) || !Number.isFinite(quantity)) return null
  return price * quantity
}

function SaleField({ label, value, emphasize = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd
        className={`mt-1 break-words text-sm ${
          emphasize ? 'font-semibold text-blue-950' : 'text-slate-700'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function SaleDetails({ sale, onClose }) {
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    fetchSaleDetails(sale.id, controller.signal)
      .then((data) => {
        if (!active) return
        setResult(data)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los detalles de la venta.',
        )
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [requestId, sale.id])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRetry = () => {
    setError('')
    setStatus('loading')
    setRequestId((current) => current + 1)
  }

  const clientName =
    getClientName(sale.cliente) ||
    getRelationFallback('Cliente', sale.cliente_id)
  const sellerName =
    getSellerName(sale.vendedor) ||
    getRelationFallback('Vendedor', sale.vendedor_id)

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="sale-details-title"
        aria-modal="true"
        className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">
              Detalle de venta
            </p>
            <h3
              className="mt-1 break-words text-xl font-bold text-blue-950"
              id="sale-details-title"
            >
              Venta {getSaleCode(sale)}
            </h3>
          </div>
          <button
            aria-label="Cerrar detalles de venta"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-slate-200 text-xl leading-none text-slate-500 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="grid gap-4 border-b border-slate-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <SaleField label="Fecha" value={formatDate(sale.fecha_venta)} />
          <SaleField label="Cliente" value={clientName} />
          <SaleField label="Vendedor" value={sellerName} />
          <SaleField
            label="Método de pago"
            value={displayValue(sale.metodo_pago)}
          />
        </div>

        <div className="p-6">
          {status === 'loading' && (
            <div
              aria-live="polite"
              className="rounded-xl border border-blue-100 bg-blue-50/60 p-8 text-center text-sm font-medium text-slate-600"
              role="status"
            >
              Cargando productos de la venta…
            </div>
          )}

          {status === 'error' && (
            <div
              className="rounded-xl border border-red-100 bg-red-50 p-6 text-center"
              role="alert"
            >
              <p className="font-semibold text-red-800">
                No se pudieron cargar los detalles
              </p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <button
                className="mt-4 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
                onClick={handleRetry}
                type="button"
              >
                Reintentar
              </button>
            </div>
          )}

          {status === 'success' && result.warnings.length > 0 && (
            <div
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              <p className="font-semibold">
                Algunos datos relacionados no están disponibles.
              </p>
              <ul className="mt-1 list-inside list-disc">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {status === 'success' && result.details.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="font-semibold text-blue-950">
                Esta venta no tiene detalles disponibles.
              </p>
            </div>
          )}

          {status === 'success' && result.details.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[680px] divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Producto</th>
                    <th className="px-4 py-3 font-semibold">Variante</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.details.map((detail) => {
                    const productName = detail.producto
                      ? [detail.producto.marca, detail.producto.modelo]
                          .filter(Boolean)
                          .join(' ') || 'Producto sin nombre disponible'
                      : getRelationFallback(
                          'Producto',
                          detail.producto_codigo,
                        )

                    return (
                      <tr
                        className="text-sm text-slate-700"
                        key={detail.id}
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-blue-950">
                            {productName}
                          </p>
                          {detail.producto_codigo && (
                            <p className="mt-1 text-xs text-slate-500">
                              Código: {detail.producto_codigo}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {detail.variante
                            ? `ID ${detail.variante.id}`
                            : getRelationFallback(
                                'Variante',
                                detail.variante_id,
                              )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {displayValue(detail.cantidad)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {formatAmount(detail.precio_venta)}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-blue-950">
                          {formatAmount(getSubtotal(detail))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Estado: {displayValue(sale.estado)}
          </p>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <p className="text-sm font-semibold text-slate-600">
              Total registrado
            </p>
            <p className="text-lg font-bold text-blue-950">
              {formatAmount(sale.total)}
            </p>
          </div>
        </footer>
      </section>
    </div>
  )
}

function SaleCard({ sale, onViewDetails }) {
  const clientName =
    getClientName(sale.cliente) ||
    getRelationFallback('Cliente', sale.cliente_id)
  const sellerName =
    getSellerName(sale.vendedor) ||
    getRelationFallback('Vendedor', sale.vendedor_id)

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
            Venta {getSaleCode(sale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(sale.fecha_venta)}
          </p>
        </div>
        <span className="max-w-full break-words rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {displayValue(sale.estado)}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <SaleField label="Cliente" value={clientName} />
        <SaleField label="Vendedor" value={sellerName} />
        <SaleField
          label="Método de pago"
          value={displayValue(sale.metodo_pago)}
        />
        <SaleField
          emphasize
          label="Total"
          value={formatAmount(sale.total)}
        />
      </dl>

      <button
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={() => onViewDetails(sale)}
        type="button"
      >
        Ver detalles
      </button>
    </article>
  )
}

function SalesPage() {
  const [sales, setSales] = useState([])
  const [warnings, setWarnings] = useState([])
  const [selectedSale, setSelectedSale] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    fetchSales(controller.signal)
      .then((result) => {
        if (!active) return
        setSales(result.sales)
        setWarnings(result.warnings)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar las ventas.',
        )
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [requestId])

  const filteredSales = useMemo(() => {
    const term = normalize(search)
    if (!term) return sales

    return sales.filter((sale) => {
      const searchableValues = [
        sale.codigo,
        sale.cliente_codigo,
        sale.cliente_id,
        sale.cliente?.Id_Cliente,
        getClientName(sale.cliente),
      ]

      return searchableValues.some((value) => normalize(value).includes(term))
    })
  }, [sales, search])

  const closeDetails = useCallback(() => setSelectedSale(null), [])

  const handleRetry = () => {
    setError('')
    setWarnings([])
    setStatus('loading')
    setRequestId((current) => current + 1)
  }

  return (
    <section>
      <header className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-sky-50 shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-2 lg:items-end lg:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
              Operaciones comerciales
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-blue-950">
              Ventas
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Consulta las ventas registradas y sus productos asociados.
            </p>
          </div>

          <div className="w-full">
            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="sales-search"
            >
              Buscar ventas
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-blue-500"
              >
                ⌕
              </span>
              <input
                className="w-full rounded-2xl border border-blue-200 bg-white py-3.5 pl-11 pr-4 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                id="sales-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Código de venta o cliente"
                type="search"
                value={search}
              />
            </div>
          </div>
        </div>
      </header>

      {status === 'loading' && (
        <div
          aria-live="polite"
          className="rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm"
          role="status"
        >
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700"
          />
          <p className="mt-4 font-medium text-slate-600">
            Cargando ventas desde Supabase…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div
          className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <h3 className="font-semibold text-red-800">
            No se pudieron cargar las ventas
          </h3>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            className="mt-5 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
            onClick={handleRetry}
            type="button"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'success' && warnings.length > 0 && (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          <p className="font-semibold">
            Algunas relaciones no están disponibles.
          </p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {status === 'success' && sales.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <div
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl text-blue-700"
          >
            ↗
          </div>
          <h3 className="mt-4 font-semibold text-blue-950">
            No hay ventas para mostrar
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            La consulta a Supabase no devolvió registros.
          </p>
        </div>
      )}

      {status === 'success' &&
        sales.length > 0 &&
        filteredSales.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <h3 className="font-semibold text-blue-950">
              No se encontraron coincidencias
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Prueba con otro código de venta o cliente.
            </p>
          </div>
        )}

      {status === 'success' && filteredSales.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-blue-950">
                Historial de ventas
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Información consultada del sistema.
              </p>
            </div>
            <p
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-sky-500"
              />
              {filteredSales.length} de {sales.length}{' '}
              {sales.length === 1 ? 'venta' : 'ventas'}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredSales.map((sale) => (
              <SaleCard
                key={sale.id}
                onViewDetails={setSelectedSale}
                sale={sale}
              />
            ))}
          </div>
        </>
      )}

      {selectedSale && (
        <SaleDetails onClose={closeDetails} sale={selectedSale} />
      )}
    </section>
  )
}

export default SalesPage
