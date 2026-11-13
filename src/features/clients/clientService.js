import { supabase } from '../../lib/supabase.js'

const CLIENT_COLUMNS =
  'id,nombre,nombres,apellido_paterno,apellido_materno,ci_documento,telefono,estatus,created_at,updated_at,Id_Cliente'

export async function fetchClients(signal) {
  const { data, error } = await supabase
    .from('Cliente')
    .select(CLIENT_COLUMNS)
    .order('id', { ascending: true })
    .abortSignal(signal)

  if (error) throw error
  return data ?? []
}
