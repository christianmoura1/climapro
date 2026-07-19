import React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import { RoomEnvironment } from "three-stdlib";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AC_MODEL_URLS } from "./acModelConfig";

gsap.registerPlugin(ScrollTrigger);

// Desfile horizontal com foco: as peças ficam lado a lado e o scroll desliza
// a fila, passando cada uma pelo centro da tela — a peça em foco cresce e
// avança, as vizinhas recuam e diminuem. Nenhuma peça esconde a outra e cada
// uma tem seu momento em destaque, sincronizado com o texto à esquerda.
const PARTS = [
  {
    key: "tampa",
    label: "Tampa frontal",
    desc: "A carcaça externa protege os componentes internos e direciona o fluxo de ar para o ambiente."
  },
  {
    key: "filtros",
    label: "Filtros",
    desc: "Filtros removíveis retêm poeira e partículas, mantendo o ar limpo e o desempenho do equipamento."
  },
  {
    key: "serpentina",
    label: "Serpentina",
    desc: "A serpentina troca calor com o ar ambiente — é o coração do processo de refrigeração."
  },
  {
    key: "turbina",
    label: "Turbina",
    desc: "A turbina força a circulação do ar através da serpentina para dentro do ambiente."
  },
  {
    key: "motor",
    label: "Motor",
    desc: "O motor elétrico aciona a turbina com eficiência energética e baixo nível de ruído."
  },
  {
    key: "placa",
    label: "Placa eletrônica",
    desc: "A placa controla temperatura, velocidade e todos os modos de operação do aparelho."
  },
  {
    key: "sensores",
    label: "Sensores",
    desc: "Sensores de temperatura monitoram o ambiente em tempo real para ajustes automáticos."
  },
  {
    key: "bandeja",
    label: "Bandeja de drenagem",
    desc: "A bandeja coleta a água condensada e a direciona para o dreno, evitando vazamentos."
  },
  {
    key: "estrutura",
    label: "Estrutura traseira",
    desc: "A estrutura traseira sustenta o conjunto e direciona a instalação na parede."
  }
];

// Distância horizontal entre peças vizinhas (unidades da cena).
const PART_SPACING = 3.6;

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
  turbina: 2.4,
  motor: 1.6,
  placa: 2.0,
  sensores: 0.8,
  bandeja: 3.8,
  estrutura: 4.0
};

function GLBPart({ url, targetSize }) {
  const { scene } = useGLTF(url);
  const normalized = React.useMemo(() => {
    const clone = scene.clone(true);
    // Sem mapa de metalness, materiais PBR com metalness alto renderizam
    // pretos; garante também colorspace correto das texturas.
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.metalness !== undefined && !mat.metalnessMap) {
          mat.metalness = Math.min(mat.metalness, 0.35);
        }
        if (mat.roughness !== undefined) {
          mat.roughness = Math.max(mat.roughness, 0.35);
        }
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      });
    });
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

// Iluminação de ambiente gerada localmente (sem baixar HDR): sem ela, os
// materiais PBR dos GLBs aparecem escuros/pretos.
function SceneEnvironment() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  React.useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    return () => {
      scene.environment = null;
      envTexture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
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
    // "focus" percorre 0..N-1 conforme o scroll; a peça mais próxima dele
    // é a que está no centro da tela.
    const focus = raw * (PARTS.length - 1);

    PARTS.forEach((part, i) => {
      const group = partRefs.current[part.key];
      if (!group) return;

      const d = i - focus;
      const ad = Math.abs(d);
      group.position.set(
        d * PART_SPACING,
        Math.max(0, 1 - ad) * 0.3,
        2.0 - Math.min(ad, 3) * 1.1
      );
      // Peças "viram" suavemente enquanto atravessam o centro.
      group.rotation.y = -0.35 + d * 0.12;
      group.scale.setScalar(THREE.MathUtils.clamp(1.2 - ad * 0.4, 0.6, 1.2));
    });

    if (assemblyRef.current) {
      assemblyRef.current.rotation.x = 0.06;
      assemblyRef.current.rotation.y = -0.05;
    }
  });

  return (
    <group ref={assemblyRef} scale={0.72} position={[0, 0.1, 0]}>
      {PARTS.map((part, i) => (
        <group
          key={part.key}
          ref={(el) => { partRefs.current[part.key] = el; }}
          position={[i * PART_SPACING, 0, 2.0 - Math.min(i, 3) * 1.1]}
        >
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
          const newIndex = THREE.MathUtils.clamp(
            Math.round(self.progress * (PARTS.length - 1)),
            0,
            PARTS.length - 1
          );
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
            camera={{ position: [0, 0.7, 11], fov: 36 }}
            dpr={[1, 1.5]}
            frameloop="demand"
            gl={{ antialias: false, powerPreference: "high-performance" }}
          >
            <InvalidateBridge apiRef={invalidateRef} />
            <SceneEnvironment />
            <ambientLight intensity={0.35} />
            <directionalLight position={[4, 5, 6]} intensity={0.9} />
            <directionalLight position={[-4, -2, -4]} intensity={0.3} color="#818cf8" />
            <AcUnitScene progressRef={progressRef} />
          </Canvas>
        </div>
      </div>
    </section>
  );
}
