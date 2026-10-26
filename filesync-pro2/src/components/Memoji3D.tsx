import React, { Suspense, useRef, useEffect, useLayoutEffect, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MEMOJI_GLB_URL = "/memoji.glb";

try {
  useGLTF.preload(MEMOJI_GLB_URL);
} catch {}

interface Memoji3DProps {
  analyserNode?: AnalyserNode | null;
  isSpeaking?: boolean;
  status?: string;
  className?: string;
}

interface ModelInnerProps {
  analyserNode?: AnalyserNode | null;
  isSpeaking?: boolean;
}

function MemojiModel({ analyserNode, isSpeaking = false }: ModelInnerProps) {
  // Step 1: Load the untextured model from /memoji.glb
  const { scene } = useGLTF(MEMOJI_GLB_URL);
  const modelRef = useRef<THREE.Group>(null);
  const targetMeshesRef = useRef<THREE.Mesh[]>([]);
  const jawOpenRef = useRef<number>(0);
  const audioDataRef = useRef<Uint8Array | null>(null);

  // Step 2: Programmatic Coloring with MeshStandardMaterial & Shemagh / Skin differentiation
  useLayoutEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry;

        if (!geom.attributes.normal) {
          geom.computeVertexNormals();
        }

        const posAttr = geom.attributes.position;
        if (posAttr && posAttr.count > 0) {
          const colors = new Float32Array(posAttr.count * 3);
          const colorSkin = new THREE.Color("#fce4d6");
          const colorShemaghRed = new THREE.Color("#a52a2a");
          const colorShemaghWhite = new THREE.Color("#ffffff");
          const colorEgal = new THREE.Color("#18181b");
          const colorBeard = new THREE.Color("#261512");

          for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);

            // Egal ring around forehead / crown
            if (y > 0.50 && y < 0.64 && (Math.abs(x) > 0.36 || z < 0.35 || y > 0.56)) {
              colors[i * 3] = colorEgal.r;
              colors[i * 3 + 1] = colorEgal.g;
              colors[i * 3 + 2] = colorEgal.b;
            }
            // Shemagh (top and draped sides/back cloth)
            else if (y >= 0.62 || (y > -0.15 && z < 0.08) || (Math.abs(x) > 0.46 && y > -0.6)) {
              const pattern = Math.sin(x * 32) * Math.sin(y * 32);
              const c = pattern > 0.15 ? colorShemaghRed : colorShemaghWhite;
              colors[i * 3] = c.r;
              colors[i * 3 + 1] = c.g;
              colors[i * 3 + 2] = c.b;
            }
            // Subtle natural beard definition
            else if (y < -0.35 && y > -0.46 && z > 0.48 && Math.abs(x) < 0.22) {
              const cBeard = new THREE.Color("#5a4542");
              colors[i * 3] = cBeard.r;
              colors[i * 3 + 1] = cBeard.g;
              colors[i * 3 + 2] = cBeard.b;
            }
            // Soft natural skin base
            else {
              colors[i * 3] = colorSkin.r;
              colors[i * 3 + 1] = colorSkin.g;
              colors[i * 3 + 2] = colorSkin.b;
            }
          }

          geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        }

        // Apply polished MeshStandardMaterial
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#ffffff"),
          vertexColors: true,
          roughness: 0.45,
          metalness: 0.08,
          flatShading: false,
        });

        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  // Collect any morph target meshes
  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          meshes.push(mesh);
        }
      }
    });
    targetMeshesRef.current = meshes;
  }, [scene]);

  useEffect(() => {
    if (analyserNode) {
      audioDataRef.current = new Uint8Array(analyserNode.fftSize);
    }
  }, [analyserNode]);

  useFrame(({ clock }) => {
    let volume = 0;

    if (analyserNode && audioDataRef.current) {
      analyserNode.getByteTimeDomainData(audioDataRef.current as any);
      let sum = 0;
      for (let i = 0; i < audioDataRef.current.length; i++) {
        const norm = (audioDataRef.current[i] - 128) / 128;
        sum += norm * norm;
      }
      const rms = Math.sqrt(sum / audioDataRef.current.length);
      volume = Math.min(1.0, rms * 3.8);
    } else if (isSpeaking) {
      volume = (Math.sin(clock.elapsedTime * 14) * 0.5 + 0.5) * 0.7;
    }

    // Step 4: Map volume to jawOpen blendshape (volume * 0.8) so mouth moves when Gemini speaks
    const targetJaw = isSpeaking ? Math.min(0.8, volume * 0.8) : 0;
    jawOpenRef.current = THREE.MathUtils.lerp(jawOpenRef.current, targetJaw, 0.35);

    // Apply morph targets if available
    targetMeshesRef.current.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;
      if (!dict || !influences) return;

      const jawIndex = dict["jawOpen"] ?? dict["viseme_aa"] ?? dict["mouthOpen"];
      if (jawIndex !== undefined) {
        influences[jawIndex] = jawOpenRef.current;
      }
    });

    if (modelRef.current) {
      // Step 4: Gentle head movement (rotations on Y and X)
      modelRef.current.rotation.y = Math.sin(clock.elapsedTime) * 0.05;
      modelRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.03;

      // Subtle reactive talking bounce
      const scaleBounce = 1.0 + (isSpeaking ? volume * 0.035 : Math.sin(clock.elapsedTime * 1.8) * 0.008);
      modelRef.current.scale.set(scaleBounce, scaleBounce, scaleBounce);
    }
  });

  return (
    <group ref={modelRef} position={[0, 0, 0]}>
      <Center position={[0, 0, 0]}>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

// Fallback preview while GLB loads
function MemojiFallback() {
  return (
    <div className="flex flex-col items-center justify-center size-full">
      <div className="relative size-52 sm:size-64 rounded-full overflow-hidden border-4 border-rose-500/40 shadow-[0_0_40px_rgba(251,113,133,0.3)] animate-pulse">
        <img
          src="/avatar.png"
          alt="الداهية Memoji"
          className="size-full object-cover object-top scale-110"
        />
      </div>
    </div>
  );
}

class MemojiErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn("Memoji3D error caught:", err);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export const Memoji3D: React.FC<Memoji3DProps> = ({
  analyserNode,
  isSpeaking = false,
  status = "idle",
  className = "w-full max-w-md h-72 sm:h-84",
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Al-Dahiya brand soft red glowing background */}
      <div
        className={`absolute size-56 sm:size-72 rounded-full blur-3xl transition-all duration-500 pointer-events-none ${
          isSpeaking
            ? "bg-rose-500/40 scale-110 opacity-100"
            : status === "listening"
            ? "bg-red-500/25 scale-100 opacity-80"
            : "bg-rose-900/20 scale-95 opacity-50"
        }`}
      />

      <MemojiErrorBoundary fallback={<MemojiFallback />}>
        {/* Step 3: Camera centered on head and shoulders */}
        <Canvas
          camera={{ position: [0, 0, 2.7], fov: 32 }}
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          {/* Step 3: Strong ambientLight + directionalLight + Al-Dahiya brand red rim light */}
          <ambientLight intensity={1.8} />
          <directionalLight position={[2, 5, 2]} intensity={1.8} />
          <directionalLight position={[-2, 3, 2]} intensity={1.0} color="#ffd4cc" />
          <pointLight position={[0, -0.8, 1.8]} intensity={1.5} color="#b82e24" />
          <pointLight position={[-2, 1, -1]} intensity={1.2} color="#e11d48" />
          <pointLight position={[2, 1, -1]} intensity={1.2} color="#e11d48" />

          <Suspense fallback={<MemojiFallback />}>
            <MemojiModel
              analyserNode={analyserNode}
              isSpeaking={isSpeaking}
            />
          </Suspense>
        </Canvas>
      </MemojiErrorBoundary>
    </div>
  );
};
