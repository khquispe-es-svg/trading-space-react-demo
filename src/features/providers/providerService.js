import { supabase } from '../../lib/supabase.js'

const PAGE_SIZE = 1000

function addAbortSignal(query, signal) {
  return signal ? query.abortSignal(signal) : query
}

export async function fetchProviders(signal) {
  const providers = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = addAbortSignal(
      supabase
        .from('proveedores')
        .select('id')
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      signal,
    )
    const { data, error } = await query
    if (error) throw error

    const page = data ?? []
    providers.push(...page)
    if (page.length < PAGE_SIZE) return providers
  }
}
