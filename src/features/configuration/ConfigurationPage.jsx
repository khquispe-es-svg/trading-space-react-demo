function ConfigurationPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
          Área administrativa
        </p>
        <h3 className="mt-1 text-lg font-bold text-blue-950">
          Configuración del sistema
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          La tabla <code className="font-semibold">configuracion</code> está
          confirmada, pero no se ha verificado su lista de columnas. No se
          consulta con <code className="font-semibold">select(&apos;*&apos;)</code>:
          una tabla de configuración puede contener valores que no deben
          exponerse al navegador.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['Columnas y tipos', 'Pendiente de inspección de catálogo'],
          ['Clave primaria y valores por defecto', 'Pendiente de inspección'],
          ['Restricciones y relaciones', 'Pendiente de inspección'],
          ['RLS y políticas', 'Verificar antes de leer o editar'],
          ['Permisos efectivos', 'Verificar SELECT y UPDATE'],
          ['Edición segura', 'Requiere RPC autorizada tras validar el esquema'],
        ].map(([label, detail]) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            key={label}
          >
            <h4 className="text-sm font-semibold text-blue-950">{label}</h4>
            <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
        En la revisión anterior se reportó RLS habilitado sin políticas de
        configuración. No se asume que ese estado siga vigente y no se envía
        ninguna lectura o actualización desde el cliente hasta volver a
        verificarlo.
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-bold text-blue-950">
          Consulta de solo lectura para descubrir el esquema
        </h4>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
{`SELECT
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  is_identity,
  identity_generation
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'configuracion'
ORDER BY ordinal_position;`}
        </pre>
      </div>
    </section>
  )
}

export default ConfigurationPage
