import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace } from 'three'
import './Phone3DViewer.css'

const colorNames = {
  black: '#202a38',
  negro: '#202a38',
  white: '#e8edf2',
  blanco: '#e8edf2',
  blue: '#2875d2',
  azul: '#2875d2',
  red: '#d94a55',
  rojo: '#d94a55',
  green: '#3b9b78',
  verde: '#3b9b78',
  purple: '#8559bd',
  morado: '#8559bd',
  purpura: '#8559bd',
  pink: '#d970a1',
  rosa: '#d970a1',
  gray: '#8b98a8',
  grey: '#8b98a8',
  gris: '#8b98a8',
  silver: '#b8c5d2',
  plata: '#b8c5d2',
  gold: '#c9a35a',
  dorado: '#c9a35a',
  orange: '#d9844c',
  naranja: '#d9844c',
}

function getPhoneColor(product) {
  const explicitColor = [
    product.color,
    product.color_nombre,
    product.colorName,
  ].find((value) => typeof value === 'string' && value.trim())

  if (explicitColor) {
    const color = explicitColor.trim()
    if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) return color

    const normalizedColor = color
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
    const matchedName = Object.keys(colorNames).find((name) =>
      normalizedColor.includes(name),
    )
    if (matchedName) return colorNames[matchedName]
  }

  return '#4089d5'
}

function getPhoneDesign(product) {
  const brand = String(product.marca ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()

  if (brand.includes('iphone') || brand.includes('apple')) {
    return { cameraStyle: 'square', accent: '#cbd5e1' }
  }
  if (brand.includes('pixel') || brand.includes('google')) {
    return { cameraStyle: 'bar', accent: '#8ab4f8' }
  }
  if (brand.includes('samsung')) {
    return { cameraStyle: 'rail', accent: '#7dd3fc' }
  }
  if (brand.includes('huawei')) {
    return { cameraStyle: 'circle', accent: '#f0b5b5' }
  }
  if (brand.includes('motorola')) {
    return { cameraStyle: 'center', accent: '#93c5fd' }
  }
  if (brand.includes('xiaomi') || brand.includes('poco')) {
    return { cameraStyle: 'square', accent: '#fbbf77' }
  }
  return { cameraStyle: 'generic', accent: '#93c5fd' }
}

function createScreenTexture(accent) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1024
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('No se pudo crear la pantalla del modelo 3D.')
  }

  const background = context.createLinearGradient(0, 0, 512, 1024)
  background.addColorStop(0, '#07182e')
  background.addColorStop(0.55, '#102b4b')
  background.addColorStop(1, '#071324')
  context.fillStyle = background
  context.fillRect(0, 0, 512, 1024)

  context.globalAlpha = 0.9
  context.fillStyle = accent
  context.beginPath()
  context.ellipse(335, 460, 275, 370, -0.48, 0, Math.PI * 2)
  context.fill()

  context.globalAlpha = 0.55
  context.fillStyle = '#69d7ff'
  context.beginPath()
  context.ellipse(155, 640, 185, 330, 0.62, 0, Math.PI * 2)
  context.fill()

  context.globalAlpha = 1
  context.fillStyle = 'rgba(255, 255, 255, 0.88)'
  context.font = '500 29px Arial'
  context.textAlign = 'center'
  context.fillText('TRADING SPACE', 256, 902)
  context.fillStyle = 'rgba(255, 255, 255, 0.95)'
  context.font = '300 92px Arial'
  context.fillText('10:08', 256, 190)
  context.fillStyle = 'rgba(255, 255, 255, 0.72)'
  context.font = '400 24px Arial'
  context.fillText('Bienvenido', 256, 230)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function CameraLens({ position }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 24, 16]} />
        <meshStandardMaterial color="#111a2b" metalness={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, -0.047]} rotation={[Math.PI, 0, 0]}>
        <torusGeometry args={[0.069, 0.009, 8, 32]} />
        <meshStandardMaterial color="#bac8d7" metalness={0.88} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <sphereGeometry args={[0.031, 16, 12]} />
        <meshBasicMaterial color="#2a7fce" />
      </mesh>
    </group>
  )
}

function RearCameraSystem({ design }) {
  const layouts = {
    square: {
      size: [0.34, 0.43, 0.045],
      position: [-0.2, 0.53, -0.094],
      lenses: [
        [-0.28, 0.63, -0.13],
        [-0.12, 0.63, -0.13],
        [-0.2, 0.43, -0.13],
      ],
      flash: [-0.12, 0.45, -0.13],
    },
    bar: {
      size: [0.69, 0.17, 0.045],
      position: [0, 0.61, -0.094],
      lenses: [
        [-0.23, 0.61, -0.13],
        [-0.02, 0.61, -0.13],
        [0.19, 0.61, -0.13],
      ],
      flash: [0.29, 0.61, -0.13],
    },
    rail: {
      size: [0.17, 0.57, 0.045],
      position: [-0.25, 0.52, -0.094],
      lenses: [
        [-0.25, 0.7, -0.13],
        [-0.25, 0.52, -0.13],
        [-0.25, 0.34, -0.13],
      ],
      flash: [-0.08, 0.7, -0.13],
    },
    circle: {
      size: [0.43, 0.43, 0.045],
      position: [-0.2, 0.53, -0.094],
      lenses: [
        [-0.28, 0.63, -0.13],
        [-0.12, 0.63, -0.13],
        [-0.2, 0.45, -0.13],
      ],
      flash: [-0.08, 0.45, -0.13],
    },
    center: {
      size: [0.25, 0.42, 0.045],
      position: [0, 0.53, -0.094],
      lenses: [
        [0, 0.66, -0.13],
        [0, 0.48, -0.13],
      ],
      flash: [0.12, 0.66, -0.13],
    },
    generic: {
      size: [0.31, 0.48, 0.045],
      position: [-0.2, 0.53, -0.094],
      lenses: [
        [-0.27, 0.65, -0.13],
        [-0.12, 0.51, -0.13],
        [-0.27, 0.36, -0.13],
      ],
      flash: [-0.08, 0.53, -0.13],
    },
  }
  const layout = layouts[design.cameraStyle] ?? layouts.generic

  return (
    <>
      <RoundedBox
        args={layout.size}
        radius={0.065}
        smoothness={6}
        position={layout.position}
      >
        <meshStandardMaterial color="#182538" metalness={0.48} roughness={0.28} />
      </RoundedBox>
      {design.cameraStyle === 'circle' && (
        <mesh position={[-0.2, 0.53, -0.121]}>
          <torusGeometry args={[0.19, 0.012, 8, 40]} />
          <meshStandardMaterial
            color={design.accent}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      )}
      {layout.lenses.map((position) => (
        <CameraLens key={position.join(',')} position={position} />
      ))}
      <mesh position={layout.flash}>
        <sphereGeometry args={[0.022, 16, 12]} />
        <meshBasicMaterial color="#f4d98c" />
      </mesh>
    </>
  )
}

function PhoneModel({ color, design }) {
  const screenTexture = useMemo(() => createScreenTexture(color), [color])
  const backMaterial = useMemo(
    () => ({ color, metalness: 0.35, roughness: 0.24 }),
    [color],
  )

  useEffect(() => () => screenTexture.dispose(), [screenTexture])

  return (
    <group rotation={[0.02, -0.3, 0]}>
      <RoundedBox args={[0.82, 1.7, 0.125]} radius={0.095} smoothness={8} castShadow>
        <meshStandardMaterial color={color} metalness={0.78} roughness={0.22} />
      </RoundedBox>

      <RoundedBox
        args={[0.77, 1.63, 0.018]}
        radius={0.078}
        smoothness={8}
        position={[0, 0, -0.066]}
        castShadow
      >
        <meshStandardMaterial {...backMaterial} />
      </RoundedBox>

      <RoundedBox
        args={[0.754, 1.535, 0.012]}
        radius={0.07}
        smoothness={8}
        position={[0, -0.015, 0.067]}
      >
        <meshBasicMaterial map={screenTexture} toneMapped={false} />
      </RoundedBox>

      <RoundedBox
        args={[0.2, 0.046, 0.012]}
        radius={0.02}
        smoothness={6}
        position={[0, 0.773, 0.069]}
      >
        <meshStandardMaterial color="#080e18" roughness={0.2} />
      </RoundedBox>
      <mesh position={[0.055, 0.773, 0.077]}>
        <sphereGeometry args={[0.012, 16, 12]} />
        <meshBasicMaterial color="#294d78" />
      </mesh>

      <RearCameraSystem design={design} />

      <RoundedBox
        args={[0.11, 0.025, 0.012]}
        radius={0.01}
        smoothness={4}
        position={[0, -0.72, -0.08]}
      >
        <meshStandardMaterial
          color={design.accent}
          metalness={0.72}
          roughness={0.25}
        />
      </RoundedBox>

      <RoundedBox
        args={[0.16, 0.035, 0.018]}
        radius={0.012}
        smoothness={4}
        position={[0, 0.86, 0]}
      >
        <meshStandardMaterial color="#c6d4e3" metalness={0.9} roughness={0.18} />
      </RoundedBox>
      <RoundedBox
        args={[0.12, 0.26, 0.028]}
        radius={0.012}
        smoothness={4}
        position={[0.418, 0.27, 0]}
      >
        <meshStandardMaterial color="#9aabc0" metalness={0.85} roughness={0.2} />
      </RoundedBox>
      <RoundedBox
        args={[0.12, 0.15, 0.028]}
        radius={0.012}
        smoothness={4}
        position={[-0.418, 0.43, 0]}
      >
        <meshStandardMaterial color="#9aabc0" metalness={0.85} roughness={0.2} />
      </RoundedBox>
    </group>
  )
}

function Scene({ color, design }) {
  return (
    <>
      <color attach="background" args={['#07182f']} />
      <fog attach="fog" args={['#07182f', 8, 15]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#d9f3ff', '#11233c', 1.15]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={2.2}
        color="#f4fbff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3, 1.8, 1]} intensity={16} distance={7} color="#168dff" />
      <pointLight position={[3, 1, -2]} intensity={10} distance={6} color="#59d7ff" />

      <mesh position={[0, -1.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.62, 0.72, 0.12, 64]} />
        <meshStandardMaterial color="#163758" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.954, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.018, 64]} />
        <meshStandardMaterial
          color="#33c8ff"
          emissive="#168dff"
          emissiveIntensity={1.4}
          metalness={0.55}
          roughness={0.24}
        />
      </mesh>
      <PhoneModel color={color} design={design} />
      <ContactShadows position={[0, -1.1, 0]} opacity={0.48} scale={4.5} blur={2} far={3} />

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={2.5}
        maxDistance={7}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI - 0.25}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  )
}

function Phone3DViewer({ product, onClose }) {
  const color = getPhoneColor(product)
  const design = getPhoneDesign(product)
  const productName = [product.marca, product.modelo].filter(Boolean).join(' ')
  const hasProductIdentity = Boolean(
    String(product.marca ?? '').trim() && String(product.modelo ?? '').trim(),
  )

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="phone-viewer__overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="phone-viewer-title"
        aria-modal="true"
        className="phone-viewer"
        role="dialog"
      >
        <header className="phone-viewer__header">
          <div className="phone-viewer__heading">
            <span className="phone-viewer__eyebrow">VISOR INTERACTIVO 3D</span>
            <h2 className="phone-viewer__title" id="phone-viewer-title">
              {productName || 'Modelo de celular'}
            </h2>
            <p className="phone-viewer__subtitle">
              Modelo procedural orientativo; no es una réplica exacta del dispositivo.
            </p>
          </div>
          <button
            aria-label="Cerrar visor 3D"
            className="phone-viewer__close"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {!hasProductIdentity && (
          <p className="phone-viewer__notice" role="status">
            Faltan datos de marca o modelo. Esta representación es genérica y orientativa.
          </p>
        )}

        <div className="phone-viewer__canvas">
          <Canvas
            camera={{ position: [2.8, 1.8, 3.8], fov: 36 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            shadows
          >
            <Scene color={color} design={design} />
          </Canvas>
          <span className="phone-viewer__badge">3D EN TIEMPO REAL</span>
        </div>

        <footer className="phone-viewer__footer">
          <span><strong>Arrastra</strong> para girar</span>
          <span><strong>Rueda</strong> o gesto táctil para zoom</span>
          <span className="phone-viewer__swatch">
            <i aria-hidden="true" style={{ backgroundColor: color }} />
            Color de representación
          </span>
        </footer>
      </section>
    </div>
  )
}

export default Phone3DViewer
