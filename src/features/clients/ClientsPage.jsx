import { useEffect, useMemo, useState } from 'react'
import { fetchClients } from './clientService.js'

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

function matchesSearch(client, search) {
  const term = normalize(search)
  if (!term) return true

  const textFields = [
    client.nombre,
    client.nombres,
    client.apellido_paterno,
    client.apellido_materno,
    client.Id_Cliente,
    client.ci_documento,
    client.telefono,
  ]

  if (textFields.some((value) => normalize(value).includes(term))) return true

  const digits = term.replace(/\D/g, '')
  if (!digits) return false

  return [client.ci_documento, client.telefono].some((value) =>
    String(value ?? '')
      .replace(/\D/g, '')
      .includes(digits),
  )
}

function displayValue(value) {
  return value === null || value === undefined || value === ''
    ? '—'
    : String(value)
}

function formatPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return '—'

  if (digits.startsWith('591') && digits.length === 11) {
    const nationalNumber = digits.slice(3)
    return `+591 ${nationalNumber.slice(0, 1)} ${nationalNumber.slice(1, 4)} ${nationalNumber.slice(4)}`
  }

  if (digits.length === 8) {
    return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`
  }

  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  return digits
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getClientName(client) {
  return [
    client.nombres || client.nombre,
    client.apellido_paterno,
    client.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
}

function getInitials(client) {
  const firstName = String(client.nombres || client.nombre || '')
    .trim()
    .split(/\s+/)[0]
  const firstSurname = String(client.apellido_paterno || '')
    .trim()
    .split(/\s+/)[0]

  const initials = [firstName, firstSurname]
    .filter(Boolean)
    .map((part) =>
      part
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .charAt(0)
        .toLocaleUpperCase(),
    )
    .join('')

  return initials || 'CL'
}

function ClientDetails({ client, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const details = [
    ['ID', client.id],
    ['Id_Cliente', client.Id_Cliente],
    ['Nombre', client.nombre],
    ['Nombres', client.nombres],
    ['Apellido paterno', client.apellido_paterno],
    ['Apellido materno', client.apellido_materno],
    ['Documento', client.ci_documento],
    ['Teléfono', formatPhone(client.telefono)],
    ['Estado', client.estatus],
    ['Creado', formatDate(client.created_at)],
    ['Actualizado', formatDate(client.updated_at)],
  ]

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="client-details-title"
        aria-modal="true"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">
              Ficha de cliente
            </p>
            <h3
              className="mt-1 text-xl font-bold text-blue-950"
              id="client-details-title"
            >
              {getClientName(client) || 'Datos del cliente'}
            </h3>
          </div>
          <button
            aria-label="Cerrar detalles"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-slate-200 text-xl leading-none text-slate-500 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <dl className="grid gap-px bg-slate-100 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div className="min-w-0 bg-white px-6 py-4" key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-800">
                {displayValue(value)}
              </dd>
            </div>
          ))}
        </dl>

        <footer className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            className="rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  )
}

function ClientCard({ client, onViewDetails }) {
  const name = getClientName(client)
  const status = String(client.estatus ?? '')

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-sm font-bold text-blue-800"
        >
          {getInitials(client)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-bold text-blue-950">
            {name || 'Nombre no disponible'}
          </h3>
          <p className="mt-1 truncate text-sm text-slate-500">
            Id_Cliente: {displayValue(client.Id_Cliente)}
          </p>
        </div>
        <span
          className={`flex-none rounded-full px-2.5 py-1 text-xs font-semibold ${
            status.toLocaleUpperCase() === 'ACTIVO'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {displayValue(client.estatus)}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-500">Documento</dt>
          <dd className="mt-0.5 break-all text-sm font-semibold text-slate-800">
            {displayValue(client.ci_documento)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Teléfono</dt>
          <dd className="mt-0.5 break-all text-sm font-semibold text-slate-800">
            {formatPhone(client.telefono)}
          </dd>
        </div>
      </dl>

      <button
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={() => onViewDetails(client)}
        type="button"
      >
        Ver detalles
      </button>
    </article>
  )
}

function ClientsPage() {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    fetchClients(controller.signal)
      .then((data) => {
        if (!active) return
        setClients(data)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los clientes.',
        )
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [requestId])

  const filteredClients = useMemo(
    () => clients.filter((client) => matchesSearch(client, search)),
    [clients, search],
  )

  const handleRetry = () => {
    setError('')
    setStatus('loading')
    setRequestId((current) => current + 1)
  }

  return (
    <section>
      <header className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-sky-50 shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-2 lg:items-end lg:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
              Gestión de personas
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-blue-950">
              Clientes
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Consulta la información de contacto de los clientes registrados.
            </p>
          </div>

          <div className="w-full">
            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="client-search"
            >
              Buscar clientes
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
                id="client-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, documento, teléfono o Id_Cliente"
                type="search"
                value={search}
              />
            </div>
          </div>
        </div>
      </header>

      {status === 'success' && clients.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-blue-950">Directorio de clientes</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Información consultada del sistema.
            </p>
          </div>
          <p
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" />
            {filteredClients.length} de {clients.length}{' '}
            {clients.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
      )}

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
            Cargando clientes desde Supabase…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div
          className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <h3 className="font-semibold text-red-800">
            No se pudieron cargar los clientes
          </h3>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            className="mt-5 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={handleRetry}
            type="button"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'success' && clients.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <div
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl text-blue-700"
          >
            ♙
          </div>
          <h3 className="mt-4 font-semibold text-blue-950">
            No hay clientes para mostrar
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            La consulta a Supabase no devolvió registros.
          </p>
        </div>
      )}

      {status === 'success' &&
        clients.length > 0 &&
        filteredClients.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <h3 className="font-semibold text-blue-950">
              No se encontraron coincidencias
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Prueba con otro nombre, apellido, documento, teléfono o Id_Cliente.
            </p>
          </div>
        )}

      {status === 'success' && filteredClients.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredClients.map((client) => (
              <ClientCard
                client={client}
                key={client.id}
                onViewDetails={setSelectedClient}
              />
            ))}
          </div>
      )}

      {selectedClient && (
        <ClientDetails
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </section>
  )
}

export default ClientsPage
