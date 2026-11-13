import { useEffect, useMemo, useState } from 'react'
import { fetchPurchaseDetails, fetchPurchases } from './purchaseService.js'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return `Bs. ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function display(value) {
  return value === null || value === undefined || value === '' ? '—' : value
}

function PurchaseEditor({ purchase, profile, onClose }) {
  const [form, setForm] = useState(() => ({
    proveedor_id: purchase?.proveedor_id ?? '',
    usuario_id: purchase?.usuario_id ?? profile?.id ?? '',
    fecha_compra: purchase?.fecha_compra?.slice(0, 10) ?? '',
    metodo_pago: purchase?.metodo_pago ?? '',
  }))
  const [lines, setLines] = useState(() =>
    purchase
      ? []
      : [{
          key: 'new-line',
          producto_id: '',
          variante_id: '',
          cantidad: '',
          precio_unitario: '',
        }],
  )
  const [status, setStatus] = useState(purchase ? 'loading' : 'success')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const total = lines.reduce((sum, line) => {
    const quantity = Number(line.cantidad) || 0
    const unitPrice = Number(line.precio_unitario) || 0
    return sum + quantity * unitPrice
  }, 0)

  useEffect(() => {
    if (!purchase) return undefined

    let active = true
    const controller = new AbortController()
    fetchPurchaseDetails(purchase.id, controller.signal)
      .then((rows) => {
        if (!active) return
        setLines(
          rows.map((row) => ({
            key: String(row.id),
            producto_id: String(row.producto_id ?? ''),
            variante_id: String(row.variante_id ?? ''),
            cantidad: String(row.cantidad ?? ''),
            precio_unitario: String(row.precio_unitario ?? ''),
          })),
        )
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar las líneas de la compra.',
        )
        setStatus('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [purchase, retry])

  const updateForm = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }))
  const updateLine = (key, field, value) =>
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, [field]: value } : line,
      ),
    )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="purchase-editor-title"
        aria-modal="true"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              {purchase ? `Compra #${purchase.id}` : 'Nueva compra'}
            </p>
            <h3
              className="mt-1 text-lg font-bold text-blue-950"
              id="purchase-editor-title"
            >
              {purchase ? 'Editar compra' : 'Registrar compra'}
            </h3>
          </div>
          <button
            className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Proveedor ID
            <input
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm"
              min="1"
              onChange={(event) => updateForm('proveedor_id', event.target.value)}
              type="number"
              value={form.proveedor_id}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Responsable (usuario ID)
            <input
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm"
              onChange={(event) => updateForm('usuario_id', event.target.value)}
              readOnly
              value={form.usuario_id}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Fecha de compra
            <input
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm"
              onChange={(event) => updateForm('fecha_compra', event.target.value)}
              type="date"
              value={form.fecha_compra}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Método de pago
            <input
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm"
              onChange={(event) => updateForm('metodo_pago', event.target.value)}
              value={form.metodo_pago}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-blue-950">Productos</h4>
          <button
            className="h-8 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-800"
            onClick={() =>
              setLines((current) => [
                ...current,
                {
                  key: `line-${Date.now()}-${current.length}`,
                  producto_id: '',
                  variante_id: '',
                  cantidad: '',
                  precio_unitario: '',
                },
              ])
            }
            type="button"
          >
            Agregar línea
          </button>
        </div>

        {status === 'loading' && (
          <p aria-live="polite" className="py-5 text-center text-sm text-slate-500">
            Cargando líneas existentes…
          </p>
        )}
        {status === 'error' && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p>No se pudo cargar el detalle: {error}</p>
            <button
              className="mt-2 h-8 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white"
              onClick={() => {
                setError('')
                setStatus('loading')
                setRetry((current) => current + 1)
              }}
              type="button"
            >
              Reintentar
            </button>
          </div>
        )}
        {status === 'success' && (
          <div className="mt-3 space-y-2">
            {lines.map((line) => (
              <div
                className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-5"
                key={line.key}
              >
                {[
                  ['producto_id', 'Producto ID'],
                  ['variante_id', 'Variante ID'],
                  ['cantidad', 'Cantidad'],
                  ['precio_unitario', 'Precio unitario'],
                ].map(([field, label]) => (
                  <label className="text-[11px] font-medium text-slate-500" key={field}>
                    {label}
                    <input
                      className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-800"
                      min={field === 'producto_id' || field === 'variante_id' ? '1' : '0'}
                      onChange={(event) =>
                        updateLine(line.key, field, event.target.value)
                      }
                      type="number"
                      value={line[field]}
                    />
                  </label>
                ))}
                <div className="flex items-end justify-between gap-2">
                  <div className="pb-1">
                    <p className="text-[11px] font-medium text-slate-500">Subtotal</p>
                    <p className="mt-1 text-sm font-semibold text-blue-950">
                      {formatAmount(
                        (Number(line.cantidad) || 0) *
                          (Number(line.precio_unitario) || 0),
                      )}
                    </p>
                  </div>
                  <button
                    aria-label="Quitar línea"
                    className="mb-1 h-7 rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-700"
                    onClick={() =>
                      setLines((current) =>
                        current.filter((entry) => entry.key !== line.key),
                      )
                    }
                    type="button"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
            {lines.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                Agrega al menos una línea de producto.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-blue-950">
            Total calculado: {formatAmount(total)}
          </p>
          <button
            className="h-9 cursor-not-allowed rounded-lg bg-slate-300 px-4 text-xs font-semibold text-slate-600"
            disabled
            title="Requiere una operación RPC transaccional autorizada en Supabase."
            type="button"
          >
            Guardar deshabilitado
          </button>
        </div>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
          El formulario usa las columnas confirmadas, pero no guarda datos. Falta
          una operación transaccional segura y permisos/RPC autorizados para
          guardar encabezado y detalle sin escrituras parciales.
        </p>
      </section>
    </div>
  )
}

function PurchaseDetails({ purchase, onClose }) {
  const [details, setDetails] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchPurchaseDetails(purchase.id, controller.signal)
      .then((rows) => {
        if (!active) return
        setDetails(rows)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los detalles de la compra.',
        )
        setStatus('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [purchase.id, retry])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="purchase-details-title"
        aria-modal="true"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              Compra #{purchase.id}
            </p>
            <h3
              className="mt-1 text-lg font-bold text-blue-950"
              id="purchase-details-title"
            >
              Detalles de la compra
            </h3>
          </div>
          <button
            className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-blue-50/70 p-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">Fecha</dt>
            <dd className="mt-1 font-medium text-slate-800">
              {formatDate(purchase.fecha_compra)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Proveedor ID</dt>
            <dd className="mt-1 font-medium text-slate-800">
              {display(purchase.proveedor_id)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Responsable ID</dt>
            <dd className="mt-1 font-medium text-slate-800">
              {display(purchase.usuario_id)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Total</dt>
            <dd className="mt-1 font-semibold text-blue-950">
              {formatAmount(purchase.total)}
            </dd>
          </div>
        </dl>

        {status === 'loading' && (
          <p aria-live="polite" className="py-8 text-center text-sm text-slate-500">
            Cargando detalles…
          </p>
        )}
        {status === 'error' && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
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
        {status === 'success' && details.length === 0 && (
          <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
            Esta compra no tiene detalles visibles.
          </p>
        )}
        {status === 'success' && details.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Producto</th>
                  <th className="px-3 py-3">Variante ID</th>
                  <th className="px-3 py-3">Cantidad</th>
                  <th className="px-3 py-3">Precio unitario</th>
                  <th className="px-3 py-3">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details.map((detail) => (
                  <tr className="text-slate-700" key={detail.id}>
                    <td className="px-3 py-3">
                      {detail.producto
                        ? [
                            detail.producto.marca,
                            detail.producto.modelo,
                          ]
                            .filter(Boolean)
                            .join(' ') || `Producto #${detail.producto_id}`
                        : `Producto #${detail.producto_id}`}
                    </td>
                    <td className="px-3 py-3">{display(detail.variante_id)}</td>
                    <td className="px-3 py-3">{display(detail.cantidad)}</td>
                    <td className="px-3 py-3">
                      {formatAmount(detail.precio_unitario)}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {formatAmount(detail.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function PurchasesPage({ profile }) {
  const [purchases, setPurchases] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const pageSize = 20

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchPurchases({ fromDate, toDate, signal: controller.signal })
      .then((rows) => {
        if (!active) return
        setPurchases(rows)
        setPage(1)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar las compras.',
        )
        setStatus('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [fromDate, requestId, toDate])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return purchases
    return purchases.filter((purchase) =>
      [purchase.id, purchase.proveedor_id, purchase.usuario_id]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(term)),
    )
  }, [purchases, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-blue-950">Compras</h3>
          <p className="mt-1 text-sm text-slate-500">
            Historial de compras y detalles registrados
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <label className="text-xs font-medium text-slate-600">
            Desde
            <input
              className="mt-1 block h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-800"
              onChange={(event) => {
                setFromDate(event.target.value)
                setStatus('loading')
                setError('')
              }}
              type="date"
              value={fromDate}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Hasta
            <input
              className="mt-1 block h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-800"
              onChange={(event) => {
                setToDate(event.target.value)
                setStatus('loading')
                setError('')
              }}
              type="date"
              value={toDate}
            />
          </label>
          <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">
            Buscar por ID o proveedor
            <input
              className="mt-1 block h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 sm:w-56"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              type="search"
              value={search}
            />
          </label>
        </div>
        <button
          className="h-9 shrink-0 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white hover:bg-blue-900"
          onClick={() => {
            setEditingPurchase(null)
            setEditorOpen(true)
          }}
          type="button"
        >
          Nueva compra
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Vista de solo lectura. Los permisos de escritura previamente informados
        no permiten registrar ni editar compras. Se muestra el identificador de
        proveedor porque sus columnas descriptivas aún no están verificadas.
      </div>

      {status === 'loading' && (
        <div aria-live="polite" className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          Cargando compras…
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-800" role="alert">
          <p>No se pudieron cargar las compras: {error}</p>
          <button
            className="mt-3 h-8 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white"
            onClick={() => {
              setStatus('loading')
              setError('')
              setRequestId((current) => current + 1)
            }}
            type="button"
          >
            Reintentar
          </button>
        </div>
      )}
      {status === 'success' && filtered.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          No hay compras para mostrar con estos filtros.
        </div>
      )}
      {status === 'success' && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Compra</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Proveedor ID</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((purchase) => (
                <tr className="text-slate-700" key={purchase.id}>
                  <td className="px-4 py-3 font-semibold text-blue-950">
                    #{purchase.id}
                  </td>
                  <td className="px-4 py-3">{formatDate(purchase.fecha_compra)}</td>
                  <td className="px-4 py-3">{display(purchase.proveedor_id)}</td>
                  <td className="px-4 py-3">{display(purchase.metodo_pago)}</td>
                  <td className="px-4 py-3 font-medium">{formatAmount(purchase.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="h-8 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                        onClick={() => setSelectedPurchase(purchase)}
                        type="button"
                      >
                        Ver detalle
                      </button>
                      <button
                        className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setEditingPurchase(purchase)
                          setEditorOpen(true)
                        }}
                        type="button"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>{filtered.length} compras</span>
            <div className="flex items-center gap-2">
              <button
                className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                type="button"
              >
                Anterior
              </button>
              <span>{page} / {pageCount}</span>
              <button
                className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPurchase && (
        <PurchaseDetails
          onClose={() => setSelectedPurchase(null)}
          purchase={selectedPurchase}
        />
      )}
      {editorOpen && (
        <PurchaseEditor
          onClose={() => setEditorOpen(false)}
          profile={profile}
          purchase={editingPurchase}
        />
      )}
    </section>
  )
}

export default PurchasesPage
