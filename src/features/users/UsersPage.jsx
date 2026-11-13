import { useEffect, useMemo, useState } from 'react'
import { fetchUsers } from './userService.js'

function fullName(user) {
  return [
    user.nombre,
    user.apellido_paterno,
    user.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ') || 'Nombre no disponible'
}

function UsersPage() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchUsers(controller.signal)
      .then((rows) => {
        if (!active) return
        setUsers(rows)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo consultar el directorio de usuarios.',
        )
        setStatus('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [retry])

  const roles = [...new Set(users.map((user) => user.rol).filter(Boolean))]
  const statuses = [
    ...new Set(users.map((user) => user.estatus).filter(Boolean)),
  ]
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        [fullName(user), user.email, user.id]
          .some((value) =>
            String(value ?? '').toLocaleLowerCase().includes(term),
          )
      return (
        matchesSearch &&
        (!roleFilter || user.rol === roleFilter) &&
        (!statusFilter || user.estatus === statusFilter)
      )
    })
  }, [users, search, roleFilter, statusFilter])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-blue-950">
            Trabajadores y usuarios
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Directorio limitado a las filas permitidas por Supabase
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            aria-label="Buscar usuario"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, correo o ID"
            type="search"
            value={search}
          />
          <select
            aria-label="Filtrar por rol"
            className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
            onChange={(event) => setRoleFilter(event.target.value)}
            value={roleFilter}
          >
            <option value="">Todos los roles visibles</option>
            {roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por estado"
            className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="">Todos los estados visibles</option>
            {statuses.map((userStatus) => (
              <option key={userStatus} value={userStatus}>
                {userStatus}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
        La política RLS previamente informada limita la lectura al perfil propio;
        por eso el resultado puede no incluir a todo el personal. No se envían
        cambios de rol/estado ni se administran cuentas de Auth: aún no hay
        permisos o RPC segura confirmados para esas operaciones.
      </div>

      {status === 'loading' && (
        <div aria-live="polite" className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          Consultando usuarios…
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-800" role="alert">
          <p>No se pudo cargar el directorio: {error}</p>
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
          No hay usuarios visibles con estos filtros.
        </div>
      )}
      {status === 'success' && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr className="text-slate-700" key={user.id}>
                  <td className="px-4 py-3 font-medium text-blue-950">
                    {fullName(user)}
                  </td>
                  <td className="px-4 py-3">{user.email || '—'}</td>
                  <td className="px-4 py-3">{user.rol || '—'}</td>
                  <td className="px-4 py-3">{user.estatus || '—'}</td>
                  <td className="px-4 py-3">{user.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            {filtered.length} perfiles visibles
          </div>
        </div>
      )}
    </section>
  )
}

export default UsersPage
