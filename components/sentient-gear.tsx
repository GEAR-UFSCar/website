"use client"

import { useEffect, useRef, useMemo, useState, useSyncExternalStore } from "react"
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useReducedMotion } from "framer-motion"
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

/*
 * Orçamento de malha por classe de aparelho.
 *
 * `maxEdgeLength` é o comprimento de aresta acima do qual o TessellateModifier
 * continua dividindo o triângulo, e `iteracoes` o teto de passadas. Os dois
 * andam juntos: aresta maior e menos passadas derrubam a contagem de vértices
 * das três engrenagens somadas, que é o que pesa numa GPU de celular.
 *
 * O wireframe fica mais grosso no mobile — é a troca aceita para ele existir
 * lá. O desktop segue com os números originais.
 */
const MALHA = {
  cheia: { arestaMax: 0.22, iteracoes: 4, curvas: 20 },
  leve: { arestaMax: 0.45, iteracoes: 2, curvas: 10 },
} as const

function useGearGeometry(radius: number, teeth: number, leve: boolean) {
  return useMemo<BufferGeometry>(() => {
    const orcamento = leve ? MALHA.leve : MALHA.cheia
    const depth = radius * 0.22
    const shape = createGearShape(teeth, radius, radius * R_ROOT, radius * R_HOLE)
    const geometry = new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.2,
      bevelSize: radius * 0.02,
      bevelSegments: 1,
      curveSegments: orcamento.curvas,
    })
    geometry.center()
    // O extrude sai com triângulos grandes demais para o wireframe respirar;
    // subdividir dá densidade para o ruído do vertex shader aparecer.
    const tessellated = new TessellateModifier(
      radius * orcamento.arestaMax,
      orcamento.iteracoes,
    ).modify(geometry)
    tessellated.computeVertexNormals()
    return tessellated
  }, [radius, teeth, leve])
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
  /** Malha reduzida — ver MALHA. */
  leve: boolean
}

function Gear({ radius, teeth, position, ratio, phase, opacity, amplitude, spin, leve }: GearProps) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const geometry = useGearGeometry(radius, teeth, leve)

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

/*
 * Envelope horizontal da engrenagem principal: raio do topo do dente (1.5)
 * mais a amplitude do ruído (0.16), que empurra vértice para fora do raio
 * nominal. É esse envelope — não o raio — que decide se ela encosta na borda.
 */
const RAIO_ENVELOPE = 1.5 + 0.16
/** Quanto da largura visível a engrenagem principal ocupa no celular. */
const FRACAO_LARGURA = 0.8

function GearSystem({ drag, telaPequena }: { drag: MutableRefObject<DragState>; telaPequena: boolean }) {
  const groupRef = useRef<Group>(null)
  const { pointer, viewport } = useThree()
  const spin = useRef(0)

  /*
   * A câmera enquadra uma altura fixa (2·tan(fov/2)·distância ≈ 4,14 unidades,
   * independente do aspecto) e uma largura que encolhe junto com a tela. Num
   * celular em pé a largura visível fica em torno de 1,9–2,3 unidades, e a
   * engrenagem principal sozinha tem ~3,3 de envelope: em escala 1 ela sai
   * cortada nos dois lados.
   *
   * Daí a escala vir do viewport e não de um número fixo — 0.6 serve para um
   * aparelho e não para o vizinho. `Math.min(1, …)` garante que o mobile nunca
   * fique MAIOR que o desktop (celular deitado cai nesse caso), e o `? :` por
   * `telaPequena` garante que de md para cima a escala é exatamente 1, isto é,
   * o desktop segue idêntico ao que era.
   *
   * Escalar o grupo já reposiciona as satélites para perto do centro na mesma
   * proporção — elas são filhas dele. Encolher as coordenadas delas por cima
   * disso aplicaria o fator duas vezes e as enfiaria dentro da principal,
   * quebrando o engrenamento que as posições atuais codificam.
   */
  const escala = telaPequena
    ? Math.min(1, (viewport.width * FRACAO_LARGURA) / (RAIO_ENVELOPE * 2))
    : 1

  /*
   * `drag` é escrito pelos handlers de ponteiro do pai e consumido aqui, a
   * cada frame, fora do ciclo de render do React — é o padrão do R3F para
   * entrada contínua. Passar isso por estado re-renderizaria a cena a 60fps.
   */
  // eslint-disable-next-line react-hooks/immutability
  useFrame((state, delta) => {
    const d = drag.current

    // Enquanto arrasta, o ponteiro manda direto; ao soltar, o arremesso
    // decai exponencialmente até sobrar só a rotação de base.
    if (d.active) {
      spin.current += d.pending
      // eslint-disable-next-line react-hooks/immutability -- ver comentário acima de useFrame
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
    <group ref={groupRef} scale={escala}>
      <Gear radius={1.5} teeth={TEETH} position={[0, 0, 0]} ratio={1} phase={0} opacity={0.62} amplitude={0.16} spin={spin} leve={telaPequena} />
      <Gear
        radius={0.9}
        teeth={5}
        position={[-2.16, 1.04, -0.35]}
        ratio={-1.5 / 0.9}
        phase={Math.PI / 5}
        opacity={0.32}
        amplitude={0.1}
        spin={spin}
        leve={telaPequena}
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
        leve={telaPequena}
      />
    </group>
  )
}

const TELA_PEQUENA = "(max-width: 767px)"

function assinarTela(aviso: () => void) {
  const consulta = window.matchMedia(TELA_PEQUENA)
  consulta.addEventListener("change", aviso)
  return () => consulta.removeEventListener("change", aviso)
}

const nada = () => () => {}

export function SentientGear() {
  // true no cliente, false no servidor e na hidratação — o mesmo contrato do
  // antigo useEffect(setMounted(true)), sem o render extra em cascata.
  const mounted = useSyncExternalStore(nada, () => true, () => false)
  /*
   * Antes havia aqui um portão `(min-width: 768px)` que impedia o Canvas de
   * montar no celular — a engrenagem não "sumia" no mobile, ela nunca era
   * criada. O portão saiu: a engrenagem agora monta em qualquer largura.
   *
   * O que sobrou dele é a razão que o justificava, que continua real —
   * três geometrias tesseladas com shader de ruído a 60fps custam caro numa
   * GPU de celular. Em vez de não desenhar, desenhamos mais barato: malha
   * reduzida (MALHA.leve) e teto de dpr menor. Ver `telaPequena` abaixo.
   */
  const telaPequena = useSyncExternalStore(
    assinarTela,
    () => window.matchMedia(TELA_PEQUENA).matches,
    () => false,
  )
  const [grabbing, setGrabbing] = useState(false)
  const drag = useRef<DragState>({ active: false, lastX: 0, lastTime: 0, pending: 0, velocity: 0 })

  /*
   * Fora da tela, o loop para. Sem isto a GPU desenhava a engrenagem a 60fps
   * durante a leitura do resto da home, onde ninguém a vê — bateria de
   * celular gasta à toa.
   */
  // Menos movimento: "demand" desenha um quadro e para — engrenagem estática.
  const menosMovimento = useReducedMotion()
  const caixaRef = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(true)
  useEffect(() => {
    const caixa = caixaRef.current
    if (!caixa) return
    const observador = new IntersectionObserver(([entrada]) => setVisivel(entrada.isIntersecting))
    observador.observe(caixa)
    return () => observador.disconnect()
  }, [mounted])

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
   * Saída antes da hidratação — e só ela, agora que o mobile também recebe o
   * Canvas. Só CSS: dois anéis concêntricos em âmbar sobre o fundo do hero,
   * girando devagar. O `animate-[spin_24s_linear_infinite]` é neutralizado
   * pela regra de prefers-reduced-motion em globals.css; o loop em WebGL
   * respeita a mesma preferência pelo `frameloop` do Canvas.
   */
  if (!mounted) {
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
      ref={caixaRef}
      className={`w-full h-full ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        frameloop={!visivel ? "never" : menosMovimento ? "demand" : "always"}
        className="w-full my-0 h-full py-0"
        /*
         * O teto do dpr multiplica a área do buffer de desenho: num aparelho
         * de dpr 3, `2` pede 4x os pixels de `1`, para um canvas que já ocupa
         * a tela inteira. 1.5 é o meio-termo que mantém o wireframe nítido
         * sem pedir um buffer que a GPU do celular tenha de recusar.
         */
        dpr={telaPequena ? [1, 1.5] : [1, 2]}
        gl={{
          // Antialias sobre um buffer desse tamanho é custo repetido por
          // frame; no mobile o wireframe aguenta a serrilha.
          antialias: !telaPequena,
          alpha: true,
        }}
      >
        <ambientLight intensity={0.5} />
        <GearSystem drag={drag} telaPequena={telaPequena} />
      </Canvas>
    </div>
  )
}
