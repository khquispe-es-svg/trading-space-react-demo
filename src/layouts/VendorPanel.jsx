import { useState } from 'react'
import ProductsPage from '../features/products/ProductsPage.jsx'
import VendorDashboard from '../features/dashboard/VendorDashboard.jsx'

const vendorMenu = [
  { label: 'Dashboard de vendedor' },
  { label: 'Productos' },
  {
    label: 'Ventas',
    disabled: true,
    reason: 'La consulta de ventas propias aún no está protegida.',
  },
  {
    label: 'Clientes',
    disabled: true,
    reason: 'El acceso a clientes estará disponible durante el registro de ventas.',
  },
]

function VendorPanel({ profile, profileName, onSignOut, logoutError }) {
  const [active, setActive] = useState('Dashboard de vendedor')

  const content =
    active === 'Dashboard de vendedor' ? (
      <VendorDashboard onNavigate={setActive} />
    ) : active === 'Productos' ? (
      <ProductsPage canManage={false} />
    ) : (
      <section
        aria-live="polite"
        className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8"
        role="status"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
          Acceso pendiente
        </p>
        <h3 className="mt-2 text-xl font-bold text-blue-950">{active}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {active === 'Ventas'
            ? 'La consulta está deshabilitada hasta que pueda limitarse de forma segura a las ventas de este vendedor.'
            : 'El directorio completo no está disponible. El registro limitado de clientes aún no forma parte del flujo de ventas.'}
        </p>
      </section>
    )

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="w-full shrink-0 bg-gradient-to-b from-sky-400 via-blue-700 to-blue-950 p-5 text-white md:min-h-screen md:w-64 md:p-6">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
            Operación comercial
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            TRADING SPACE
          </h1>
          <p className="mt-1 text-sm text-blue-100">Panel vendedor</p>
        </div>

        <nav aria-label="Menú vendedor" className="space-y-1.5">
          {vendorMenu.map(({ label, disabled, reason }) => (
            <button
              aria-current={!disabled && active === label ? 'page' : undefined}
              className={`w-full rounded-xl px-3.5 py-2.5 text-left text-sm transition ${
                disabled
                  ? 'cursor-not-allowed text-blue-100/70'
                  : active === label
                    ? 'bg-white font-semibold text-blue-900 shadow-sm'
                    : 'font-medium text-blue-50 hover:bg-white/10'
              }`}
              disabled={disabled}
              key={label}
              onClick={() => setActive(label)}
              title={reason}
              type="button"
            >
              <span>{label}</span>
              {disabled && (
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-blue-100/80">
                  Pendiente
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-7 border-t border-blue-200/30 pt-5">
          <p className="truncate text-sm font-semibold">{profileName}</p>
          <p className="mt-1 text-xs text-blue-100">
            Rol: {profile.rol}
          </p>
          <button
            className="mt-4 w-full rounded-xl border border-white/50 px-3.5 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10"
            onClick={onSignOut}
            type="button"
          >
            Cerrar sesión
          </button>
          {logoutError && (
            <p className="mt-3 text-sm text-red-100" role="alert">
              {logoutError}
            </p>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 sm:p-7 lg:p-9">
        <header className="mb-7">
          <p className="text-sm font-medium text-slate-500">
            Espacio de ventas
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">
            {active}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Herramientas para la atención comercial
          </p>
        </header>
        {content}
        <footer className="mt-9 text-center text-xs text-slate-400">
          TRADING SPACE © 2026
        </footer>
      </main>
    </div>
  )
}

export default VendorPanel
