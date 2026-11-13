import { supabase } from '../../lib/supabase.js'

const USER_COLUMNS =
  'id,nombre,apellido_paterno,apellido_materno,email,rol,estatus'
const PAGE_SIZE = 1000

function addAbortSignal(query, signal) {
  return signal ? query.abortSignal(signal) : query
}

export async function fetchUsers(signal) {
  const users = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = addAbortSignal(
      supabase
        .from('usuarios')
        .select(USER_COLUMNS)
        .order('nombre', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      signal,
    )
    const { data, error } = await query
    if (error) throw error

    const page = data ?? []
    users.push(...page)
    if (page.length < PAGE_SIZE) return users
  }
}
