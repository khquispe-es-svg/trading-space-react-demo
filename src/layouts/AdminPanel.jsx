import { lazy, Suspense, useState } from 'react'
import ClientsPage from '../features/clients/ClientsPage.jsx'
import ConfigurationPage from '../features/configuration/ConfigurationPage.jsx'
import AdminDashboard from '../features/dashboard/AdminDashboard.jsx'
import PurchasesPage from '../features/purchases/PurchasesPage.jsx'
import ProductsPage from '../features/products/ProductsPage.jsx'
import ProvidersPage from '../features/providers/ProvidersPage.jsx'
import ReportsPage from '../features/reports/ReportsPage.jsx'
import SalesPage from '../features/sales/SalesPage.jsx'
import UsersPage from '../features/users/UsersPage.jsx'

const Showroom3D = lazy(() => import('../features/showroom/Showroom3D.jsx'))

const adminMenu = [
  'Dashboard',
  'Productos',
  'Ventas',
  'Clientes',
  'Compras',
  'Proveedores',
  'Trabajadores y usuarios',
  'Reportes',
  'Configuración',
  'Tienda 3D',
]

function AdminPlaceholder({ section }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">
        Área administrativa
      </p>
      <h3 className="mt-2 text-xl font-bold text-blue-950">{section}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Esta sección aún no tiene una pantalla conectada a Supabase. No se
        muestran datos de demostración ni se realizan cambios en la base de
        datos.
      </p>
    </section>
  )
}

function ShowroomFullscreen({ onExit }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950 p-3 pt-16 sm:p-5 sm:pt-16">
      <button
        className="absolute left-4 top-4 z-[110] rounded-lg border border-white/30 bg-slate-900/90 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        onClick={onExit}
        type="button"
      >
        Volver al panel
      </button>
      <Suspense
        fallback={
          <div
            aria-live="polite"
            className="rounded-2xl bg-white p-8 text-center text-slate-600"
            role="status"
          >
            Cargando tienda 3D…
          </div>
        }
      >
        <Showroom3D />
      </Suspense>
    </div>
  )
}

function AdminPanel({ profile, profileName, onSignOut, logoutError }) {
  const [active, setActive] = useState('Dashboard')

  if (active === 'Tienda 3D') {
    return <ShowroomFullscreen onExit={() => setActive('Dashboard')} />
  }

  let content
  if (active === 'Dashboard') {
    content = <AdminDashboard onNavigate={setActive} />
  } else if (active === 'Productos') {
    content = <ProductsPage canManage={profile.rol === 'admin'} />
  } else if (active === 'Ventas') {
    content = <SalesPage />
  } else if (active === 'Clientes') {
    content = <ClientsPage />
  } else if (active === 'Compras') {
    content = <PurchasesPage profile={profile} />
  } else if (active === 'Proveedores') {
    content = <ProvidersPage />
  } else if (active === 'Trabajadores y usuarios') {
    content = <UsersPage />
  } else if (active === 'Reportes') {
    content = <ReportsPage />
  } else if (active === 'Configuración') {
    content = <ConfigurationPage />
  } else {
    content = <AdminPlaceholder section={active} />
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="w-full shrink-0 bg-gradient-to-b from-sky-400 via-blue-700 to-blue-950 p-5 text-white md:min-h-screen md:w-64 md:p-6">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
            Administración
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            TRADING SPACE
          </h1>
          <p className="mt-1 text-sm text-blue-100">Panel administrador</p>
        </div>

        <nav aria-label="Menú administrador" className="space-y-1.5">
          {adminMenu.map((item) => (
            <button
              aria-current={active === item ? 'page' : undefined}
              className={`w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                active === item
                  ? 'bg-white font-semibold text-blue-900 shadow-sm'
                  : 'text-blue-50 hover:bg-white/10'
              }`}
              key={item}
              onClick={() => setActive(item)}
              type="button"
            >
              {item}
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
            Espacio administrativo
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">
            {active}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Gestión del sistema TRADING SPACE
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

export default AdminPanel
