import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from },
}))

import { fetchUsers } from './userService.js'

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

describe('userService', () => {
  beforeEach(() => {
    from.mockReset()
  })

  it('reads only profile directory fields and excludes password hashes', async () => {
    const query = createQuery({ data: [], error: null })
    from.mockReturnValue(query)

    await expect(fetchUsers()).resolves.toEqual([])
    expect(from).toHaveBeenCalledWith('usuarios')
    expect(query.select).toHaveBeenCalledWith(
      'id,nombre,apellido_paterno,apellido_materno,email,rol,estatus',
    )
  })

  it('surfaces RLS errors for directory reads', async () => {
    from.mockReturnValue(
      createQuery({ data: null, error: { message: 'permission denied' } }),
    )

    await expect(fetchUsers()).rejects.toMatchObject({
      message: 'permission denied',
    })
  })
})
