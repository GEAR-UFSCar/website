"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Color, ExtrudeGeometry, MathUtils, Path, Shape } from "three"
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js"
import type { BufferGeometry, Group, Mesh, ShaderMaterial } from "three"

/*
 * Perfil medido em public/gear-icon-g.svg (raios 92 / 76 / 42, passo de 45°):
 * 8 dentes, e dentro de cada passo — 22,5° de raiz, 5,625° de flanco,
 * 11,25° de topo, 5,625° de flanco. Normalizado com o topo em 1.0.
 */
const TEETH = 8
const R_ROOT = 76 / 92
const R_HOLE = 42 / 92
const GEAR_AMBER = "#FF7A2F"

/** Rotação automática de base, em rad/s. */
const BASE_SPEED = 0.22
/** Quanto um pixel de arraste horizontal vira rotação. */
const RAD_PER_PX = 0.006
/** Teto da velocidade de arremesso, em rad/s. */
const MAX_FLICK = 9
/** Constante de desaceleração após soltar (maior = para mais rápido). */
const FLICK_DECAY = 2.2

type DragState = {
  active: boolean
  lastX: number
  lastTime: number
  /** Rotação acumulada pelo ponteiro e ainda não consumida por um frame. */
  pending: number
  /** Velocidade de arremesso em rad/s, decai até zero após soltar. */
  velocity: number
}

function createGearShape(teeth: number, rTip: number, rRoot: number, rHole: number, steps = 5) {
  const shape = new Shape()
  const pitch = (Math.PI * 2) / teeth
  // frações do passo, na ordem raiz → sobe → topo → desce
  const segments: Array<[number, number, number, number]> = [
    [0, 0.5, rRoot, rRoot],
    [0.5, 0.625, rRoot, rTip],
    [0.625, 0.875, rTip, rTip],
    [0.875, 1, rTip, rRoot],
  ]

  let started = false
  for (let i = 0; i < teeth; i++) {
    const base = i * pitch
    for (const [from, to, rFrom, rTo] of segments) {
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const angle = base + pitch * (from + (to - from) * t)
        const radius = rFrom + (rTo - rFrom) * t
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        if (started) {
          shape.lineTo(x, y)
        } else {
          shape.moveTo(x, y)
          started = true
        }
      }
    }
  }
  shape.closePath()

  const bore = new Path()
  bore.absarc(0, 0, rHole, 0, Math.PI * 2, true)
  shape.holes.push(bore)

  return shape
}

function useGearGeometry(radius: number, teeth: number) {
  return useMemo<BufferGeometry>(() => {
    const depth = radius * 0.22
    const shape = createGearShape(teeth, radius, radius * R_ROOT, radius * R_HOLE)
    const geometry = new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.2,
      bevelSize: radius * 0.02,
      bevelSegments: 1,
      curveSegments: 20,
    })
    geometry.center()
    // O extrude sai com triângulos grandes demais para o wireframe respirar;
    // subdividir dá densidade para o ruído do vertex shader aparecer.
    const tessellated = new TessellateModifier(radius * 0.22, 4).modify(geometry)
    tessellated.computeVertexNormals()
    return tessellated
  }, [radius, teeth])
}

const vertexShader = `
  uniform float uTime;
  uniform float uNoiseScale;
  uniform float uAmplitude;
  varying vec2 vUv;
  varying float vDisplacement;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;

    float noise = snoise(position * uNoiseScale + uTime * 0.15);
    float displacement = noise * uAmplitude;
    vDisplacement = displacement;

    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    float intensity = 0.45 + vDisplacement * 3.0;
    vec3 color = uColor * intensity;

    float line = smoothstep(0.0, 0.02, abs(fract(vUv.x * 20.0) - 0.5));
    line *= smoothstep(0.0, 0.02, abs(fract(vUv.y * 20.0) - 0.5));

    gl_FragColor = vec4(color * (1.0 - line * 0.5), uOpacity);
  }
`

type GearProps = {
  radius: number
  teeth: number
  position: [number, number, number]
  /** Multiplicador de giro; negativo engrena contra a engrenagem vizinha. */
  ratio: number
  /** Defasagem para os dentes caírem nos vãos da engrenagem principal. */
  phase: number
  opacity: number
  amplitude: number
  spin: MutableRefObject<number>
}

function Gear({ radius, teeth, position, ratio, phase, opacity, amplitude, spin }: GearProps) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const geometry = useGearGeometry(radius, teeth)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: [0, 0] },
      uColor: { value: new Color(GEAR_AMBER) },
      uOpacity: { value: opacity },
      uNoiseScale: { value: 1.5 / radius },
      uAmplitude: { value: amplitude },
    }),
    [opacity, radius, amplitude],
  )

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
      materialRef.current.uniforms.uMouse.value = [state.pointer.x, state.pointer.y]
    }
    if (meshRef.current) {
      meshRef.current.rotation.z = phase + spin.current * ratio
    }
  })

  return (
    <mesh ref={meshRef} position={position} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        wireframe
      />
    </mesh>
  )
}

function GearSystem({ drag }: { drag: MutableRefObject<DragState> }) {
  const groupRef = useRef<Group>(null)
  const { pointer } = useThree()
  const spin = useRef(0)

  useFrame((state, delta) => {
    const d = drag.current

    // Enquanto arrasta, o ponteiro manda direto; ao soltar, o arremesso
    // decai exponencialmente até sobrar só a rotação de base.
    if (d.active) {
      spin.current += d.pending
      d.pending = 0
    } else if (d.velocity !== 0) {
      spin.current += d.velocity * delta
      d.velocity *= Math.exp(-FLICK_DECAY * delta)
      if (Math.abs(d.velocity) < 0.001) d.velocity = 0
    }
    spin.current += BASE_SPEED * delta

    if (groupRef.current) {
      groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, pointer.y * 0.25, 0.05)
      groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, pointer.x * 0.25, 0.05)
    }
  })

  /*
   * Engrenagens satélite: mesmo módulo da principal (dentes ∝ raio), postas
   * à distância em que os topos entram nos vãos, girando ao contrário e —
   * porque o raio é menor — proporcionalmente mais rápido (ratio = R/r).
   */
  return (
    <group ref={groupRef}>
      <Gear radius={1.5} teeth={TEETH} position={[0, 0, 0]} ratio={1} phase={0} opacity={0.62} amplitude={0.16} spin={spin} />
      <Gear
        radius={0.9}
        teeth={5}
        position={[-2.16, 1.04, -0.35]}
        ratio={-1.5 / 0.9}
        phase={Math.PI / 5}
        opacity={0.32}
        amplitude={0.1}
        spin={spin}
      />
      <Gear
        radius={0.7}
        teeth={4}
        position={[1.9, -1.24, -0.6]}
        ratio={-1.5 / 0.7}
        phase={Math.PI / 4}
        opacity={0.24}
        amplitude={0.08}
        spin={spin}
      />
    </group>
  )
}

export function SentientGear() {
  const [mounted, setMounted] = useState(false)
  /*
   * WebGL só a partir de md. Abaixo disso a engrenagem custava caro e não
   * devolvia nada: o canvas ocupava 100vh rodando três geometrias tesseladas
   * com shader de ruído a 60fps, e o arrasto já é desabilitado no toque
   * (o gesto fica reservado para a rolagem). Era bateria e GPU para um
   * elemento decorativo e inerte.
   *
   * A decisão precisa rodar em JS, não em CSS: `hidden md:block` esconderia
   * o canvas mas continuaria montando o Canvas e girando o useFrame.
   */
  const [comWebGL, setComWebGL] = useState(false)
  const [grabbing, setGrabbing] = useState(false)
  const drag = useRef<DragState>({ active: false, lastX: 0, lastTime: 0, pending: 0, velocity: 0 })

  useEffect(() => {
    setMounted(true)

    const consulta = window.matchMedia("(min-width: 768px)")
    const aplicar = () => setComWebGL(consulta.matches)
    aplicar()
    consulta.addEventListener("change", aplicar)
    return () => consulta.removeEventListener("change", aplicar)
  }, [])

  // O toque fica reservado para a rolagem da página; arrasto só com mouse/caneta.
  const isDraggable = (event: ReactPointerEvent<HTMLDivElement>) => event.pointerType !== "touch"

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggable(event)) return
    const d = drag.current
    d.active = true
    d.lastX = event.clientX
    d.lastTime = event.timeStamp
    d.pending = 0
    d.velocity = 0
    setGrabbing(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    const dx = event.clientX - d.lastX
    const dt = Math.max(event.timeStamp - d.lastTime, 1) / 1000
    d.lastX = event.clientX
    d.lastTime = event.timeStamp
    d.pending += dx * RAD_PER_PX
    d.velocity = MathUtils.clamp((dx * RAD_PER_PX) / dt, -MAX_FLICK, MAX_FLICK)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    setGrabbing(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    // Parado no momento de soltar não deve arremessar.
    if (event.timeStamp - d.lastTime > 120) d.velocity = 0
  }

  /*
   * Mesma silhueta para os dois casos de saída — antes da hidratação e no
   * mobile. Só CSS: dois anéis concêntricos em âmbar sobre o fundo do hero,
   * girando devagar. O `animate-[spin_24s_linear_infinite]` é neutralizado
   * pela regra de prefers-reduced-motion em globals.css, ao contrário do
   * loop em WebGL, que CSS nenhum alcança.
   */
  if (!mounted || !comWebGL) {
    return (
      <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
        <div className="relative h-56 w-56 sm:h-72 sm:w-72">
          <div className="absolute inset-0 rounded-full border border-[var(--gear-amber)]/30 animate-[spin_24s_linear_infinite]" />
          <div className="absolute inset-[18%] rounded-full border border-[var(--gear-amber)]/20" />
          <div className="absolute inset-[42%] rounded-full border border-[var(--gear-amber)]/40" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-full h-full ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        className="w-full my-0 h-full py-0"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <ambientLight intensity={0.5} />
        <GearSystem drag={drag} />
      </Canvas>
    </div>
  )
}
