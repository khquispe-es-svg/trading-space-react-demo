import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionError, setSessionError] = useState('')
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profileState, setProfileState] = useState({
    userId: null,
    data: null,
    error: '',
    loading: false,
  })

  useEffect(() => {
    let active = true
    let authEventReceived = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true
      if (!active) return

      setSession(nextSession)
      setSessionError('')
      setSessionLoading(false)
      if (!nextSession) {
        setProfileState({
          userId: null,
          data: null,
          error: '',
          loading: false,
        })
      }
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return

        if (error) {
          setSessionError(error.message)
          return
        }

        setSession(data.session)
      })
      .catch((error) => {
        if (!active || authEventReceived) return
        setSessionError(
          error instanceof Error
            ? error.message
            : 'No se pudo recuperar la sesión.',
        )
      })
      .finally(() => {
        if (active) setSessionLoading(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const authUserId = session?.user?.id ?? null

  useEffect(() => {
    if (!authUserId) return

    let active = true

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select(
            'id,nombre,apellido_paterno,apellido_materno,email,rol,estatus,auth_user_id',
          )
          .eq('auth_user_id', authUserId)
          .single()

        if (!active) return

        if (error) {
          const noProfileFound =
            error.code === 'PGRST116' &&
            /0 rows/i.test(`${error.details ?? ''} ${error.message ?? ''}`)

          setProfileState({
            userId: authUserId,
            data: null,
            error: noProfileFound
              ? 'No se encontró un perfil en usuarios vinculado a esta cuenta. Contacta al administrador.'
              : `No se pudo cargar el perfil de usuarios: ${error.message}`,
            loading: false,
          })
          return
        }

        if (!data) {
          setProfileState({
            userId: authUserId,
            data: null,
            error:
              'No se encontró un perfil en usuarios vinculado a esta cuenta. Contacta al administrador.',
            loading: false,
          })
          return
        }

        setProfileState({
          userId: authUserId,
          data,
          error: '',
          loading: false,
        })
      } catch (error) {
        if (!active) return
        setProfileState({
          userId: authUserId,
          data: null,
          error:
            error instanceof Error
              ? `No se pudo cargar el perfil de usuarios: ${error.message}`
              : 'No se pudo cargar el perfil de usuarios. Inténtalo de nuevo.',
          loading: false,
        })
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [authUserId])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const profileStateMatchesSession = profileState.userId === authUserId
  const profile = profileStateMatchesSession ? profileState.data : null
  const profileError = profileStateMatchesSession ? profileState.error : ''
  const profileLoading =
    Boolean(authUserId) &&
    (!profileStateMatchesSession || profileState.loading)
  const loading = sessionLoading || profileLoading

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      sessionError,
      profileError,
      signIn,
      signOut,
    }),
    [session, profile, loading, sessionError, profileError, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
