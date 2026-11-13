import { useEffect, useState } from 'react'
import { fetchDashboardMetrics } from './dashboardService.js'

const shortcuts = [
  'Productos',
  'Ventas',
  'Clientes',
  'Compras',
  'Proveedores',
  'Trabajadores y usuarios',
  'Reportes',
  'Configuración',
]

function formatAmount(value) {
  return `Bs. ${value.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function AdminDashboard({ onNavigate }) {
  const [metrics, setMetrics] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchDashboardMetrics({ signal: controller.signal })
      .then((data) => {
        if (!active) return
        setMetrics(data)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los indicadores.',
        )
        setStatus('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [retry])

  const cards = metrics
    ? [
        {
          title: 'Ventas de hoy',
          value: formatAmount(metrics.todaySalesTotal),
          icon: '💰',
        },
        {
          title: 'Productos registrados',
          value: metrics.productsCount.toLocaleString('es-BO'),
          icon: '📱',
        },
        {
          title: 'Clientes registrados',
          value: metrics.clientsCount.toLocaleString('es-BO'),
          icon: '👥',
        },
        {
          title: 'Ventas realizadas hoy',
          value: metrics.todaySalesCount.toLocaleString('es-BO'),
          icon: '🛒',
        },
      ]
    : []

  return (
    <section className="space-y-6">
      {status === 'loading' && (
        <div
          aria-live="polite"
          className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
        >
          Consultando indicadores…
        </div>
      )}
      {status === 'error' && (
        <div
          className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-800"
          role="alert"
        >
          <p>No se pudieron cargar los indicadores: {error}</p>
          <button
            className="mt-3 h-8 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white"
            onClick={() => {
              setStatus('loading')
              setError('')
              setRetry((current) => current + 1)
            }}
            type="button"
          >
            Reintentar
          </button>
        </div>
      )}
      {status === 'success' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              key={card.title}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <span aria-hidden="true" className="text-xl">
                  {card.icon}
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-blue-950">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Consultado de Supabase
              </p>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h3 className="text-lg font-semibold text-blue-950">
            Áreas de trabajo
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Accesos directos a los módulos administrativos.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((item) => (
            <button
              className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-left text-sm font-semibold text-blue-900 transition hover:border-blue-200 hover:bg-blue-50"
              key={item}
              onClick={() => onNavigate(item)}
              type="button"
            >
              {item}
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Abrir módulo
              </span>
            </button>
          ))}
        </div>
      </section>
    </section>
  )
}

export default AdminDashboard
