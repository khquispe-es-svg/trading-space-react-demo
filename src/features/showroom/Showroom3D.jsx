import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace } from 'three'
import './Showroom3D.css'

const phoneColors = [
  ['#11b7e9', '#ec4899', '#f4a640'],
  ['#93c5fd', '#a3e635', '#e879f9'],
]

function BrandSign() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 280
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('No se pudo crear el letrero del showroom.')
    }

    context.fillStyle = '#07152d'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#42d8ff'
    context.lineWidth = 10
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24)
    context.textAlign = 'center'
    context.shadowColor = '#24bfff'
    context.shadowBlur = 24
    context.fillStyle = '#f5fbff'
    context.font = '700 112px Arial'
    context.fillText('TRADING SPACE', canvas.width / 2, 150)
    context.shadowBlur = 0
    context.fillStyle = '#77dfff'
    context.font = '500 34px Arial'
    context.fillText('TECNOLOGIA MOVIL', canvas.width / 2, 218)

    const signTexture = new CanvasTexture(canvas)
    signTexture.colorSpace = SRGBColorSpace
    return signTexture
  }, [])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={[0, 3.55, -4.35]}>
      <planeGeometry args={[4.2, 0.98]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function Phone({ color, position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[0.22, 0.43, 0.055]} radius={0.035} smoothness={4}>
        <meshStandardMaterial color={color} metalness={0.58} roughness={0.26} />
      </RoundedBox>
      <RoundedBox
        args={[0.185, 0.36, 0.006]}
        radius={0.024}
        smoothness={4}
        position={[0, 0, 0.031]}
      >
        <meshStandardMaterial
          color="#07101e"
          emissive="#0a3154"
          emissiveIntensity={0.35}
          roughness={0.2}
        />
      </RoundedBox>
      <mesh position={[0, 0.138, 0.036]}>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial color="#53dfff" />
      </mesh>
      <mesh position={[0, -0.164, 0.036]}>
        <boxGeometry args={[0.07, 0.009, 0.002]} />
        <meshBasicMaterial color="#54708d" />
      </mesh>
    </group>
  )
}

function DisplayCase({ position, colors }) {
  const phoneXPositions = [-0.72, 0, 0.72]
  const frameMaterial = '#203b5a'
  const glassMaterial = {
    color: '#b8eeff',
    transparent: true,
    opacity: 0.13,
    roughness: 0.12,
    metalness: 0.15,
    depthWrite: false,
  }

  return (
    <group position={position}>
      <mesh position={[0, 0.29, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.75, 0.58, 1.35]} />
        <meshStandardMaterial color="#10243c" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.59, 0.681]}>
        <boxGeometry args={[2.35, 0.035, 0.018]} />
        <meshStandardMaterial
          color="#4ad9ff"
          emissive="#22bce8"
          emissiveIntensity={1.6}
        />
      </mesh>
      {[0.88, 1.43].map((height) => (
        <mesh key={height} position={[0, height, 0]} receiveShadow>
          <boxGeometry args={[2.56, 0.045, 1.16]} />
          <meshStandardMaterial
            color="#8bdff4"
            transparent
            opacity={0.28}
            metalness={0.25}
            roughness={0.18}
          />
        </mesh>
      ))}
      {[-1.24, 1.24].flatMap((x) =>
        [-0.56, 0.56].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 1.26, z]}
          >
            <boxGeometry args={[0.055, 1.3, 0.055]} />
            <meshStandardMaterial color={frameMaterial} metalness={0.65} roughness={0.25} />
          </mesh>
        )),
      )}
      <mesh position={[0, 1.26, 0.56]}>
        <boxGeometry args={[2.48, 1.3, 0.018]} />
        <meshStandardMaterial {...glassMaterial} />
      </mesh>
      {[-1.24, 1.24, 0].map((x) => (
        <mesh key={x} position={[x, 1.26, -0.56]}>
          <boxGeometry args={[x === 0 ? 2.48 : 0.018, 1.3, 0.018]} />
          <meshStandardMaterial {...glassMaterial} />
        </mesh>
      ))}
      <mesh position={[0, 1.94, 0]} castShadow>
        <boxGeometry args={[2.75, 0.1, 1.35]} />
        <meshStandardMaterial color="#29486a" metalness={0.52} roughness={0.28} />
      </mesh>
      {colors.map((color, index) => (
        <group key={color}>
          <mesh position={[phoneXPositions[index], 0.925, 0]}>
            <boxGeometry args={[0.34, 0.035, 0.42]} />
            <meshStandardMaterial color="#dceaf5" metalness={0.3} roughness={0.25} />
          </mesh>
          <Phone
            color={color}
            position={[phoneXPositions[index], 1.13, 0]}
            rotation={(index - 1) * 0.11}
          />
          <mesh position={[phoneXPositions[index], 1.475, 0]}>
            <boxGeometry args={[0.34, 0.035, 0.42]} />
            <meshStandardMaterial color="#dceaf5" metalness={0.3} roughness={0.25} />
          </mesh>
          <Phone
            color={colors[(index + 1) % colors.length]}
            position={[phoneXPositions[index], 1.68, 0]}
            rotation={(1 - index) * 0.12}
          />
        </group>
      ))}
    </group>
  )
}

function Counter() {
  return (
    <group position={[0, 0, 2.05]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 1.08, 1.2]} />
        <meshStandardMaterial color="#102743" metalness={0.42} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[3.48, 0.12, 1.32]} />
        <meshStandardMaterial color="#edf7ff" metalness={0.28} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.43, 0.611]}>
        <boxGeometry args={[2.45, 0.035, 0.018]} />
        <meshStandardMaterial
          color="#53dfff"
          emissive="#28c4f2"
          emissiveIntensity={1.5}
        />
      </mesh>
      <mesh position={[0, 0.75, 0.615]}>
        <boxGeometry args={[1.1, 0.12, 0.02]} />
        <meshStandardMaterial
          color="#39cfff"
          emissive="#159dce"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  )
}

function Room() {
  return (
    <>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[12, 0.2, 9.2]} />
        <meshStandardMaterial color="#101b2c" roughness={0.72} />
      </mesh>
      {Array.from({ length: 11 }, (_, index) => (
        <mesh key={`floor-x-${index}`} position={[-5 + index, -0.012, 0]}>
          <boxGeometry args={[0.012, 0.008, 9]} />
          <meshBasicMaterial color="#203751" />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={`floor-z-${index}`} position={[0, -0.012, -4 + index]}>
          <boxGeometry args={[12, 0.008, 0.012]} />
          <meshBasicMaterial color="#203751" />
        </mesh>
      ))}
      <mesh position={[0, 2.55, -4.48]} receiveShadow>
        <boxGeometry args={[12, 5.3, 0.22]} />
        <meshStandardMaterial color="#172a43" roughness={0.62} />
      </mesh>
      {[-5.9, 5.9].map((x) => (
        <mesh key={x} position={[x, 2.55, 0]} receiveShadow>
          <boxGeometry args={[0.22, 5.3, 9.2]} />
          <meshStandardMaterial color="#14253c" roughness={0.65} />
        </mesh>
      ))}
      <BrandSign />
      {[-4.8, 4.8].map((x) => (
        <mesh key={x} position={[x, 2.7, -4.345]}>
          <boxGeometry args={[0.055, 3.9, 0.025]} />
          <meshStandardMaterial
            color="#45cfff"
            emissive="#26bfff"
            emissiveIntensity={1.25}
          />
        </mesh>
      ))}
      <mesh position={[0, 4.8, -0.5]}>
        <boxGeometry args={[9.8, 0.045, 0.08]} />
        <meshStandardMaterial
          color="#eaf9ff"
          emissive="#c6efff"
          emissiveIntensity={1.1}
        />
      </mesh>
    </>
  )
}

function Scene({ controlsRef }) {
  return (
    <>
      <color attach="background" args={['#080f1c']} />
      <fog attach="fog" args={['#080f1c', 14, 24]} />
      <ambientLight intensity={0.78} />
      <hemisphereLight args={['#d9f4ff', '#13223b', 1.15]} />
      <directionalLight
        position={[2, 8, 5]}
        intensity={2.2}
        color="#f4fbff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-4, 3.6, -2]} intensity={22} distance={8} color="#168dff" />
      <pointLight position={[4, 3.5, -1.5]} intensity={17} distance={7} color="#b4eaff" />
      <Room />
      <DisplayCase position={[-3.05, 0, -0.65]} colors={phoneColors[0]} />
      <DisplayCase position={[3.05, 0, -0.65]} colors={phoneColors[1]} />
      <Counter />
      <ContactShadows
        position={[0, -0.015, 0]}
        opacity={0.42}
        scale={12}
        blur={2.5}
        far={5}
      />
      <OrbitControls
        makeDefault
        target={[0, 1.25, 0]}
        minDistance={6.5}
        maxDistance={18}
        minPolarAngle={0.28}
        maxPolarAngle={1.48}
        enableDamping
        dampingFactor={0.08}
        ref={controlsRef}
      />
    </>
  )
}

function Showroom3D() {
  const controlsRef = useRef()

  return (
    <section className="showroom">
      <header className="showroom__header">
        <div>
          <p className="showroom__eyebrow">RECORRIDO INTERACTIVO</p>
          <h3 className="showroom__title">Showroom TRADING SPACE</h3>
          <p className="showroom__description">
            Explora la tienda, sus vitrinas y los modelos de exhibición.
          </p>
        </div>
        <button
          className="showroom__reset"
          onClick={() => controlsRef.current?.reset()}
          type="button"
        >
          Restablecer vista
        </button>
      </header>

      <div className="showroom__canvas" aria-label="Escena 3D interactiva del showroom">
        <Canvas
          camera={{ position: [8.4, 6.2, 10.4], fov: 43 }}
          dpr={[1, 1.6]}
          shadows
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Scene controlsRef={controlsRef} />
        </Canvas>
        <div className="showroom__badge">3D · VISTA EN TIEMPO REAL</div>
      </div>

      <div className="showroom__footer">
        <span><strong>Arrastra</strong> para girar</span>
        <span><strong>Rueda</strong> para acercar o alejar</span>
        <span><strong>Restablecer vista</strong> para volver al inicio</span>
      </div>
    </section>
  )
}

export default Showroom3D
