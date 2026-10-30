import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// «الداهية» as a realistic 2D Najdi grandfather for the live call (replaces the salt bag).
// Three pixel-aligned paintings of the same portrait: mouth closed / mouth open / eyes closed.
// The shader shows the base and blends in only the mouth area (with the voice level) and only
// the eye area (for blinks), so the rest of the picture never ghosts.
// Coordinates are pixels in the 1024×1024 images (y grows downwards).

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uBase;
  uniform sampler2D uMouth;
  uniform sampler2D uEyes;
  uniform float uOpen;
  uniform float uBlink;

  const float SIZE = 1024.0;
  // Mouth + beard region that moves when he talks
  const vec2 MOUTH_C = vec2(520.0, 572.0);
  const vec2 MOUTH_R = vec2(151.0, 151.0);
  // Eyes
  const vec2 EYE_L = vec2(434.0, 330.0);
  const vec2 EYE_R = vec2(601.0, 331.0);
  const vec2 EYE_RAD = vec2(56.0, 36.0);

  // 1 inside the ellipse, fading to 0 over a soft rim
  float ell(vec2 px, vec2 c, vec2 r) {
    float d = length((px - c) / r);
    return 1.0 - smoothstep(0.75, 1.25, d);
  }

  void main() {
    vec2 px = vec2(vUv.x, 1.0 - vUv.y) * SIZE;
    vec4 col = texture2D(uBase, vUv);
    float m = ell(px, MOUTH_C, MOUTH_R) * uOpen;
    if (m > 0.001) col.rgb = mix(col.rgb, texture2D(uMouth, vUv).rgb, m);
    float e = max(ell(px, EYE_L, EYE_RAD), ell(px, EYE_R, EYE_RAD)) * uBlink;
    if (e > 0.001) col.rgb = mix(col.rgb, texture2D(uEyes, vUv).rgb, e);
    gl_FragColor = vec4(col.rgb, 1.0);
  }
`;

const SILENCE_THRESHOLD = 0.02;
const ATTACK_TIME = 0.04;
const RELEASE_TIME = 0.09;
const CLOSED_EPSILON = 0.015;
// The face sits a bit above the picture's centre: show it larger and shifted down so the face fills the circle
const PLANE_SIZE = 2.6;
const PLANE_Y = -0.2;

const FRAMES = ['/images/shayeb/base.jpg', '/images/shayeb/mouth.jpg', '/images/shayeb/eyes.jpg'];

function GrandpaScene({ audioLevel = 0, isSpeaking = false, analyserNode = null }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const timeRef = useRef(0);
  const smoothAudioRef = useRef(0);
  const nextBlinkRef = useRef(2.5);
  const blinkStartRef = useRef(-10);

  const [base, mouth, eyes] = useLoader(THREE.TextureLoader, FRAMES);
  useMemo(() => {
    for (const t of [base, mouth, eyes]) {
      // Raw ShaderMaterial writes the colour straight out: keep the textures untagged
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
    }
  }, [base, mouth, eyes]);
  const dataArray = useMemo(() => new Uint8Array(analyserNode?.fftSize || 256), [analyserNode]);

  const uniforms = useMemo(
    () => ({
      uBase: { value: base },
      uMouth: { value: mouth },
      uEyes: { value: eyes },
      uOpen: { value: 0 },
      uBlink: { value: 0 },
    }),
    [base, mouth, eyes]
  );

  useEffect(() => {
    if (!isSpeaking) {
      smoothAudioRef.current = 0;
      if (materialRef.current) materialRef.current.uniforms.uOpen.value = 0;
    }
  }, [isSpeaking]);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Voice level → how open the mouth is
    let targetVol = 0;
    const externalLevel = Number(audioLevel) || 0;
    if (isSpeaking) {
      if (analyserNode) {
        try {
          analyserNode.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128.0;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          targetVol = rms > 0.01 ? Math.min(1.0, rms * 8.0) : 0;
        } catch (e) {
          targetVol = externalLevel;
        }
      } else if (externalLevel > SILENCE_THRESHOLD) {
        targetVol = externalLevel;
      } else {
        const wave = (Math.sin(t * 16.0) * 0.5 + 0.5) * (Math.cos(t * 22.0) * 0.5 + 0.5);
        targetVol = (0.2 + 0.8 * wave) * (Math.sin(t * 5.5) > -0.6 ? 1.0 : 0.1);
      }
    }
    if (!isSpeaking) {
      smoothAudioRef.current = 0;
    } else {
      if (targetVol <= SILENCE_THRESHOLD) targetVol = 0;
      const tau = targetVol > smoothAudioRef.current ? ATTACK_TIME : RELEASE_TIME;
      const k = 1 - Math.exp(-Math.min(delta, 0.1) / tau);
      smoothAudioRef.current = THREE.MathUtils.lerp(smoothAudioRef.current, targetVol, k);
      if (targetVol === 0 && smoothAudioRef.current < CLOSED_EPSILON) smoothAudioRef.current = 0;
    }
    // Spend little time half-blended: quiet sounds keep it closed, normal speech opens it
    const open = THREE.MathUtils.smoothstep(smoothAudioRef.current, 0.06, 0.55);

    // Natural blinks at irregular intervals (2.5–5.5 s), each ~0.2 s
    if (t >= nextBlinkRef.current) {
      blinkStartRef.current = t;
      nextBlinkRef.current = t + 2.5 + Math.random() * 3;
    }
    const bt = (t - blinkStartRef.current) / 0.2;
    const blink = bt >= 0 && bt <= 1 ? Math.sin(bt * Math.PI) : 0;

    if (materialRef.current) {
      materialRef.current.uniforms.uOpen.value = open;
      materialRef.current.uniforms.uBlink.value = blink;
    }

    if (meshRef.current) {
      // Gentle breathing, a slight nod while talking, a very small sway
      const breathe = Math.sin(t * 1.4) * 0.006;
      const s = 1 + breathe + open * 0.006;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, s, 0.2);
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, s, 0.2);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, PLANE_Y - open * 0.01, 0.2);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, Math.sin(t * 0.7) * 0.008, 0.08);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, PLANE_Y, 0]}>
      <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
      <shaderMaterial ref={materialRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}

export default function GrandpaCall({
  externalAudioLevel = 0,
  isSpeaking = false,
  analyserNode = null,
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        width: 'min(380px, 85vw)',
        height: 'min(380px, 85vw)',
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        // Shown while the paintings load
        background: 'url(/images/shayeb/base.jpg) center 22% / 112% no-repeat, #8a4a32',
        boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        ...style,
      }}
    >
      <Canvas camera={{ position: [0, 0, 2.75], fov: 46 }}>
        <Suspense fallback={null}>
          <GrandpaScene analyserNode={analyserNode} audioLevel={externalAudioLevel} isSpeaking={isSpeaking} />
        </Suspense>
      </Canvas>
    </div>
  );
}
