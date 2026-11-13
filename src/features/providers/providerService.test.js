import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from },
}))

import { fetchProviders } from './providerService.js'

function createQuery(response) {
  const query = {
    abortSignal: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    select: vi.fn(() => query),
    then(resolve, reject) {
      return Promise.resolve(response).then(resolve, reject)
    },
  }
  return query
}

describe('providerService', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('reads only the confirmed provider identifier', async () => {
    const query = createQuery({ data: [{ id: 1 }], error: null })
    from.mockReturnValue(query)

    await expect(fetchProviders()).resolves.toEqual([{ id: 1 }])
    expect(from).toHaveBeenCalledWith('proveedores')
    expect(query.select).toHaveBeenCalledWith('id')
  })

  it('surfaces RLS errors', async () => {
    from.mockReturnValue(
      createQuery({ data: null, error: { message: 'permission denied' } }),
    )

    await expect(fetchProviders()).rejects.toMatchObject({
      message: 'permission denied',
    })
  })
})
