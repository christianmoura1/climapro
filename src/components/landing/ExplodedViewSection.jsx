import React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AC_MODEL_URLS } from "./acModelConfig";

gsap.registerPlugin(ScrollTrigger);

const PARTS = [
  {
    key: "tampa",
    label: "Tampa frontal",
    desc: "A carcaça externa protege os componentes internos e direciona o fluxo de ar para o ambiente.",
    z: 0.55,
    dir: [0.05, 0.04, 1],
    distance: 2.3
  },
  {
    key: "filtros",
    label: "Filtros",
    desc: "Filtros removíveis retêm poeira e partículas, mantendo o ar limpo e o desempenho do equipamento.",
    z: 0.32,
    dir: [-0.05, 0.05, 1],
    distance: 1.7
  },
  {
    key: "serpentina",
    label: "Serpentina",
    desc: "A serpentina troca calor com o ar ambiente — é o coração do processo de refrigeração.",
    z: 0.12,
    dir: [0.08, -0.05, 1],
    distance: 1.15
  },
  {
    key: "turbina",
    label: "Turbina",
    desc: "A turbina força a circulação do ar através da serpentina para dentro do ambiente.",
    z: -0.05,
    dir: [-0.1, 0.08, 0.75],
    distance: 0.75
  },
  {
    key: "motor",
    label: "Motor",
    desc: "O motor elétrico aciona a turbina com eficiência energética e baixo nível de ruído.",
    z: -0.16,
    dir: [0.1, -0.1, 0.35],
    distance: 0.4
  },
  {
    key: "placa",
    label: "Placa eletrônica",
    desc: "A placa controla temperatura, velocidade e todos os modos de operação do aparelho.",
    z: -0.26,
    dir: [0.6, 0.25, -0.55],
    distance: 1.05
  },
  {
    key: "sensores",
    label: "Sensores",
    desc: "Sensores de temperatura monitoram o ambiente em tempo real para ajustes automáticos.",
    z: -0.3,
    dir: [-0.55, 0.35, -0.85],
    distance: 1.35
  },
  {
    key: "bandeja",
    label: "Bandeja de drenagem",
    desc: "A bandeja coleta a água condensada e a direciona para o dreno, evitando vazamentos.",
    z: -0.38,
    dir: [0.05, -0.42, -0.55],
    distance: 1.2,
    size: 3.8
  },
  {
    key: "estrutura",
    label: "Estrutura traseira",
    desc: "A estrutura traseira sustenta o conjunto e direciona a instalação na parede.",
    z: -0.48,
    dir: [-0.05, -0.05, -1],
    distance: 2.1
  }
];

const PART_WINDOW = 0.28;
const PART_STAGGER = 0.09;

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function explodeGlobal(progress) {
  if (progress < 0.45) return progress / 0.45;
  if (progress < 0.55) return 1;
  return Math.max(0, 1 - (progress - 0.55) / 0.45);
}

function TampaFrontal() {
  return (
    <group>
      <RoundedBox args={[4.2, 1.4, 0.16]} radius={0.14} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#f1f5f9" roughness={0.35} metalness={0.05} />
      </RoundedBox>
      <mesh position={[0, -0.55, 0.09]}>
        <boxGeometry args={[3.6, 0.1, 0.02]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Filtros() {
  return (
    <group>
      {[-0.95, 0.95].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh>
            <boxGeometry args={[1.7, 1.1, 0.05]} />
            <meshStandardMaterial color="#bfdbfe" roughness={0.4} transparent opacity={0.85} />
          </mesh>
          <mesh>
            <boxGeometry args={[1.74, 1.14, 0.052]} />
            <meshStandardMaterial color="#60a5fa" wireframe transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Serpentina() {
  const fins = Array.from({ length: 16 }, (_, i) => -1.6 + i * 0.21);
  return (
    <group>
      {fins.map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.03, 1.1, 0.55]} />
          <meshStandardMaterial color="#d97757" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
      {[0.42, -0.42].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 3.4, 12]} />
          <meshStandardMaterial color="#b45309" roughness={0.25} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Turbina() {
  const blades = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
  const bladeRadius = 0.42;
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 1.9, 24]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.4} />
      </mesh>
      {blades.map((angle) => (
        <mesh
          key={angle}
          position={[0, bladeRadius * Math.cos(angle), bladeRadius * Math.sin(angle)]}
          rotation={[angle, 0, 0]}
        >
          <boxGeometry args={[1.9, 0.3, 0.02]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Motor() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.6, 20]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.7, 12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function PlacaEletronica() {
  const chips = [
    [-0.4, 0.2],
    [0.1, 0.25],
    [0.45, -0.1],
    [-0.15, -0.25]
  ];
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.4, 0.9, 0.05]} />
        <meshStandardMaterial color="#15803d" roughness={0.5} />
      </mesh>
      {chips.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.05]}>
          <boxGeometry args={[0.24, 0.18, 0.06]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, -0.5, 0.03]}>
        <boxGeometry args={[1.0, 0.1, 0.03]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function Sensores() {
  const points = [
    [-1.4, 0.5, 0.2],
    [1.4, 0.5, 0.2],
    [0, 0.6, 0.35]
  ];
  return (
    <group>
      {points.map((p) => (
        <mesh key={p.join(",")} position={p}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#2563eb" emissive="#3b82f6" emissiveIntensity={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function BandejaDrenagem() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[3.8, 0.08, 0.5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
      </mesh>
      {[-1.85, 1.85].map((x) => (
        <mesh key={x} position={[x, 0.08, 0]}>
          <boxGeometry args={[0.08, 0.18, 0.5]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 0.08, 0.23]}>
        <boxGeometry args={[3.8, 0.18, 0.06]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.08, -0.23]}>
        <boxGeometry args={[3.8, 0.18, 0.06]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
      </mesh>
    </group>
  );
}

function EstruturaTraseira() {
  return (
    <group>
      <RoundedBox args={[4.0, 1.3, 0.12]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[3.2, 0.08, 0.04]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
    </group>
  );
}

const PART_COMPONENTS = {
  tampa: TampaFrontal,
  filtros: Filtros,
  serpentina: Serpentina,
  turbina: Turbina,
  motor: Motor,
  placa: PlacaEletronica,
  sensores: Sensores,
  bandeja: BandejaDrenagem,
  estrutura: EstruturaTraseira
};

// Tamanho-alvo (maior dimensão, em unidades da cena) usado para normalizar
// os GLBs gerados — cada mesh chega com escala arbitrária do gerador.
const PART_TARGET_SIZE = {
  tampa: 4.2,
  filtros: 3.6,
  serpentina: 3.4,
  turbina: 1.9,
  motor: 1.0,
  placa: 1.4,
  sensores: 0.5,
  bandeja: 3.8,
  estrutura: 4.0
};

function GLBPart({ url, targetSize }) {
  const { scene } = useGLTF(url);
  const normalized = React.useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    clone.position.sub(center);
    return { clone, scale: targetSize / maxDim };
  }, [scene, targetSize]);
  return (
    <group scale={normalized.scale}>
      <primitive object={normalized.clone} />
    </group>
  );
}

// Se o download de um GLB falhar (CDN indisponível, CORS), a peça cai para a
// versão estilizada em vez de derrubar a cena inteira.
class PartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function PartModel({ partKey }) {
  const Fallback = PART_COMPONENTS[partKey];
  const url = AC_MODEL_URLS[partKey];
  if (!url) return <Fallback />;
  return (
    <PartErrorBoundary fallback={<Fallback />}>
      <React.Suspense fallback={<Fallback />}>
        <GLBPart url={url} targetSize={PART_TARGET_SIZE[partKey]} />
      </React.Suspense>
    </PartErrorBoundary>
  );
}

// Expõe o invalidate() do R3F para o ScrollTrigger (que vive fora do Canvas):
// com frameloop="demand", só renderizamos quando o scroll de fato muda.
function InvalidateBridge({ apiRef }) {
  const invalidate = useThree((state) => state.invalidate);
  React.useEffect(() => {
    apiRef.current = invalidate;
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, invalidate]);
  return null;
}

function AcUnitScene({ progressRef }) {
  const partRefs = React.useRef({});
  const assemblyRef = React.useRef(null);

  useFrame(() => {
    const raw = progressRef.current.raw;
    const explodedT = explodeGlobal(raw);

    PARTS.forEach((part, i) => {
      const start = i * PART_STAGGER;
      const end = Math.min(1, start + PART_WINDOW);
      const factor = smoothstep(start, end, explodedT);
      const group = partRefs.current[part.key];
      if (!group) return;
      group.position.set(
        part.dir[0] * part.distance * factor,
        part.dir[1] * part.distance * factor,
        part.z + part.dir[2] * part.distance * factor
      );
      group.rotation.y = factor * 0.18 * (i % 2 === 0 ? 1 : -1);
    });

    if (assemblyRef.current) {
      assemblyRef.current.rotation.y = THREE.MathUtils.lerp(-0.3, 0.3, raw);
      const scale = THREE.MathUtils.lerp(1, 0.8, explodedT);
      assemblyRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={assemblyRef}>
      {PARTS.map((part) => (
        <group key={part.key} ref={(el) => { partRefs.current[part.key] = el; }} position={[0, 0, part.z]}>
          <PartModel partKey={part.key} />
        </group>
      ))}
    </group>
  );
}

export default function ExplodedViewSection() {
  const sectionRef = React.useRef(null);
  const progressRef = React.useRef({ raw: 0 });
  const invalidateRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeIndexRef = React.useRef(0);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 4}`,
        pin: true,
        invalidateOnRefresh: true,
        scrub: 1,
        onUpdate: (self) => {
          progressRef.current.raw = self.progress;
          invalidateRef.current?.();
          const explodedT = explodeGlobal(self.progress);
          const newIndex = Math.min(PARTS.length - 1, Math.floor(explodedT * PARTS.length));
          if (newIndex !== activeIndexRef.current) {
            activeIndexRef.current = newIndex;
            setActiveIndex(newIndex);
          }
        }
      });
    });
    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-background to-muted/40">
      <div className="absolute inset-0 grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center">
        <div className="relative z-10 px-6 pt-20 sm:px-10 lg:pt-0 lg:pl-16 lg:pr-8 pointer-events-none">
          <p className="text-sm font-semibold text-blue-600 mb-3 tracking-wide uppercase">Como funciona por dentro</p>
          <div className="relative h-[200px] lg:h-[240px]">
            {PARTS.map((part, i) => (
              <div
                key={part.key}
                className="absolute inset-0 transition-opacity duration-500 ease-out"
                style={{ opacity: activeIndex === i ? 1 : 0 }}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold mb-4">
                  {i + 1}
                </span>
                <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{part.label}</h3>
                <p className="text-muted-foreground leading-relaxed">{part.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-6">
            {PARTS.map((part, i) => (
              <span
                key={part.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? "w-8 bg-blue-600" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative h-full w-full">
          <Canvas
            camera={{ position: [0, 0.3, 7.5], fov: 32 }}
            dpr={[1, 1.5]}
            frameloop="demand"
            gl={{ antialias: false, powerPreference: "high-performance" }}
          >
            <InvalidateBridge apiRef={invalidateRef} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[4, 5, 6]} intensity={1.1} />
            <directionalLight position={[-4, -2, -4]} intensity={0.35} color="#818cf8" />
            <pointLight position={[0, 3, 3]} intensity={0.4} color="#3b82f6" />
            <AcUnitScene progressRef={progressRef} />
          </Canvas>
        </div>
      </div>
    </section>
  );
}
