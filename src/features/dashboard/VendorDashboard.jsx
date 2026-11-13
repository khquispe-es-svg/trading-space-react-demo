function VendorDashboard({ onNavigate }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-sky-50 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
          Panel de vendedor
        </p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-blue-950">
          Bienvenido a TRADING SPACE
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Consulta el catálogo de productos disponibles para apoyar la atención
          a tus clientes.
        </p>
        <button
          className="mt-5 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          onClick={() => onNavigate('Productos')}
          type="button"
        >
          Ver productos
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-blue-950">
          Acceso a módulos
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Las consultas de ventas propias y el registro limitado de clientes
          estarán disponibles cuando sus flujos estén protegidos.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
            Productos disponible
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Ventas pendiente
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Clientes limitado
          </span>
        </div>
      </section>
    </section>
  )
}

export default VendorDashboard
