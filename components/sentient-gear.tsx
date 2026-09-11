"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { MathUtils, Shape, Path, ExtrudeGeometry } from "three"
import type { Mesh, ShaderMaterial, Group } from "three"

// ---------- shared noise shader (same technique as the original sphere) ----------
const vertexShader = `
  uniform float uTime;
  uniform float uNoiseScale;
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
    float displacement = noise * 0.12;
    vDisplacement = displacement;
    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

const fragmentShader = `
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    float intensity = 0.35 + vDisplacement * 2.0;
    vec3 amber = vec3(1.0, 0.478, 0.184);
    vec3 color = intensity * amber;

    float line = smoothstep(0.0, 0.02, abs(fract(vUv.x * 14.0) - 0.5));
    line *= smoothstep(0.0, 0.02, abs(fract(vUv.y * 14.0) - 0.5));

    gl_FragColor = vec4(color * (1.0 - line * 0.5), 0.6 * uOpacity);
  }
`

// ---------- gear silhouette with flat-topped teeth (trapezoidal), no bevel, WITH center hole ----------
function buildGearShape(teeth: number, innerRadius: number, outerRadius: number, holeRadius: number) {
  const shape = new Shape()
  const anglePerTooth = (Math.PI * 2) / teeth
  const tipHalfWidth = anglePerTooth * 0.28
  const rootHalfWidth = anglePerTooth * 0.5

  for (let i = 0; i < teeth; i++) {
    const center = i * anglePerTooth
    const a0 = center - rootHalfWidth
    const a1 = center - tipHalfWidth
    const a2 = center + tipHalfWidth
    const a3 = center + rootHalfWidth

    const p0 = [Math.cos(a0) * innerRadius, Math.sin(a0) * innerRadius]
    const p1 = [Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius]
    const p2 = [Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius]
    const p3 = [Math.cos(a3) * innerRadius, Math.sin(a3) * innerRadius]

    if (i === 0) shape.moveTo(p0[0], p0[1])
    else shape.lineTo(p0[0], p0[1])
    shape.lineTo(p1[0], p1[1])
    shape.lineTo(p2[0], p2[1])
    shape.lineTo(p3[0], p3[1])
  }
  shape.closePath()

  // hole must wind OPPOSITE to the outer contour (clockwise=true) or the
  // triangulation breaks and produces the huge malformed mesh
  const hole = new Path()
  hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true)
  shape.holes.push(hole)

  return shape
}

function GearMesh({
  teeth,
  innerRadius,
  outerRadius,
  depth,
  opacity,
  spinSpeed,
  noiseScale,
}: {
  teeth: number
  innerRadius: number
  outerRadius: number
  depth: number
  opacity: number
  spinSpeed: number
  noiseScale: number
}) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)

  const geometry = useMemo(() => {
    const holeRadius = innerRadius * 0.42
    const shape = buildGearShape(teeth, innerRadius, outerRadius, holeRadius)
    const geo = new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 8,
    })
    geo.center()
    return geo
  }, [teeth, innerRadius, outerRadius, depth])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uNoiseScale: { value: noiseScale },
    }),
    [opacity, noiseScale],
  )

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
    if (meshRef.current && spinSpeed !== 0) {
      meshRef.current.rotation.z += delta * spinSpeed
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
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

function GearSystem() {
  const mainGroupRef = useRef<Group>(null)
  const { pointer } = useThree()

  const dragVelocity = useRef(0)
  const isDragging = useRef(false)
  const lastX = useRef(0)
  const baseSpeed = 0.16
  const baseTiltX = -0.45 // fixed tilt so the extrusion depth reads immediately

  useEffect(() => {
    // attached to window (not the canvas element) so the drag still works
    // even though the hero's text/button overlay sits on top of the canvas
    // in the DOM stacking order and would otherwise swallow the event
    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true
      lastX.current = e.clientX
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - lastX.current
      dragVelocity.current = dx * 0.006
      lastX.current = e.clientX
    }
    const onPointerUp = () => {
      isDragging.current = false
    }

    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [])

  useFrame((state, delta) => {
    if (!isDragging.current) {
      dragVelocity.current = MathUtils.lerp(dragVelocity.current, 0, 0.05)
    }
    const speed = baseSpeed + dragVelocity.current * 12

    if (mainGroupRef.current) {
      // turntable rotation on Y — this is what reveals the 3D depth of the
      // extrusion; rotating on Z instead (as before) just spins it in-plane
      // like a flat clock hand and looks 2D
      mainGroupRef.current.rotation.y += speed * delta
      mainGroupRef.current.rotation.x = MathUtils.lerp(
        mainGroupRef.current.rotation.x,
        baseTiltX + pointer.y * 0.12,
        0.05,
      )
    }
  })

  return (
    <group>
      <group ref={mainGroupRef}>
        <GearMesh
          teeth={12}
          innerRadius={1.3}
          outerRadius={1.8}
          depth={0.4}
          opacity={0.7}
          spinSpeed={0}
          noiseScale={1.5}
        />
      </group>

      {/* engrenagens auxiliares — giram mais rápido quanto menores, como engrenagens reais */}
      <group position={[2.5, 1.3, -0.6]} rotation={[baseTiltX, 0, 0]}>
        <GearMesh
          teeth={8}
          innerRadius={0.5}
          outerRadius={0.75}
          depth={0.3}
          opacity={0.32}
          spinSpeed={0.34}
          noiseScale={2.2}
        />
      </group>
      <group position={[-2.3, -1.1, -0.9]} rotation={[baseTiltX, 0, 0]}>
        <GearMesh
          teeth={10}
          innerRadius={0.62}
          outerRadius={0.92}
          depth={0.3}
          opacity={0.26}
          spinSpeed={-0.24}
          noiseScale={2.2}
        />
      </group>
    </group>
  )
}

export function SentientGear() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-64 h-64 rounded-full border border-white/10 animate-pulse" />
      </div>
    )
  }

  return (
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
      <GearSystem />
    </Canvas>
  )
}
