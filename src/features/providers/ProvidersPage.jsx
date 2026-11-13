import { useEffect, useMemo, useState } from 'react'
import { fetchProviders } from './providerService.js'

function ProvidersPage() {
  const [providers, setProviders] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchProviders(controller.signal)
      .then((rows) => {
        if (!active) return
        setProviders(rows)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo consultar la lista de proveedores.',
        )
        setStatus('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [retry])

  const filtered = useMemo(() => {
    const term = search.trim()
    if (!term) return providers
    return providers.filter((provider) =>
      String(provider.id).includes(term),
    )
  }, [providers, search])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-blue-950">Proveedores</h3>
          <p className="mt-1 text-sm text-slate-500">
            Registros visibles según las políticas actuales
          </p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          Buscar por ID
          <input
            className="mt-1 block h-9 rounded-lg border border-slate-300 px-3 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            value={search}
          />
        </label>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
        La columna confirmada es <code className="font-semibold">id</code>;
        todavía faltan las columnas descriptivas para mostrar nombres o crear y
        editar proveedores. No se envían escrituras. La eliminación segura
        también requiere confirmar restricciones y relaciones con compras.
      </div>

      {status === 'loading' && (
        <div aria-live="polite" className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          Consultando proveedores…
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-800" role="alert">
          <p>No se pudo cargar proveedores: {error}</p>
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
      {status === 'success' && filtered.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          No hay proveedores visibles con este filtro.
        </div>
      )}
      {status === 'success' && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ID de proveedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((provider) => (
                <tr className="text-slate-700" key={provider.id}>
                  <td className="px-4 py-3 font-medium text-blue-950">
                    {provider.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            {filtered.length} proveedores visibles
          </div>
        </div>
      )}
    </section>
  )
}

export default ProvidersPage
