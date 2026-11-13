
import { lazy, Suspense, useState } from 'react'
import { useAuth } from './auth/AuthContext.js'
import LoginForm from './auth/LoginForm.jsx'
import AdminPanel from './layouts/AdminPanel.jsx'
import VendorPanel from './layouts/VendorPanel.jsx'

const supportedRoles = ['admin', 'vendedor']

function getProfileName(profile) {
  return [
    profile.nombre,
    profile.apellido_paterno,
    profile.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
}

function AccessNotice({ title, message, profile, onSignOut, logoutError }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-950">TRADING SPACE</h1>
        <h2 className="mt-6 text-xl font-semibold text-slate-800">{title}</h2>
        {profile && (
          <p className="mt-3 text-sm text-slate-600">
            {getProfileName(profile)} · Rol: {profile.rol}
          </p>
        )}
        <p className="mt-3 text-slate-600">{message}</p>
        <button
          className="mt-6 rounded-xl bg-blue-800 px-4 py-3 font-semibold text-white transition hover:bg-blue-900"
          onClick={onSignOut}
          type="button"
        >
          Cerrar sesión
        </button>
        {logoutError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {logoutError}
          </p>
        )}
      </section>
    </main>
  )
}

function App() {
  const [logoutError, setLogoutError] = useState('')
  const {
    session,
    profile,
    loading,
    sessionError,
    profileError,
    signOut,
  } = useAuth()

  const handleSignOut = async () => {
    setLogoutError('')
    try {
      await signOut()
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar sesión. Inténtalo de nuevo.',
      )
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Comprobando sesión…
      </main>
    )
  }

  if (!session) return <LoginForm sessionError={sessionError} />

  if (profileError || !profile) {
    return (
      <AccessNotice
        title="No se pudo cargar el perfil"
        message={
          profileError ||
          'No se encontró un perfil en usuarios vinculado a esta cuenta. Contacta al administrador.'
        }
        onSignOut={handleSignOut}
        logoutError={logoutError}
      />
    )
  }

  if (profile.estatus !== 'ACTIVO') {
    return (
      <AccessNotice
        title="Acceso no disponible"
        message={`El estatus de tu cuenta es "${profile.estatus ?? 'sin estatus'}". Solo los usuarios con estatus ACTIVO pueden entrar al panel.`}
        onSignOut={handleSignOut}
        profile={profile}
        logoutError={logoutError}
      />
    )
  }

  if (!supportedRoles.includes(profile.rol)) {
    return (
      <AccessNotice
        title="Rol no reconocido"
        message="Tu perfil no tiene uno de los roles permitidos (admin o vendedor). Contacta al administrador."
        onSignOut={handleSignOut}
        profile={profile}
        logoutError={logoutError}
      />
    )
  }

  const profileName = getProfileName(profile)

  const panelProps = {
    profile,
    profileName: profileName || profile.email || 'Usuario',
    onSignOut: handleSignOut,
    logoutError,
  }

  return profile.rol === 'admin'
    ? <AdminPanel {...panelProps} />
    : <VendorPanel {...panelProps} />
}

export default App
