import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GRANDPA_FRAMES as FRAMES } from './grandpaFrames';

// «الداهية» as a realistic 2D Najdi grandfather for the live call (replaces the salt bag).
// Three pixel-aligned paintings of the same portrait: mouth closed / mouth open / eyes closed.
// The shader shows the base and blends in only the mouth area (with the voice level) and only
// the eye area (for blinks), so the rest of the picture never ghosts.
// Coordinates are pixels in the 768×768 images (y grows downwards).

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

  const float SIZE = 768.0;
  // Mouth + beard region that moves when he talks
  const vec2 MOUTH_C = vec2(390.0, 429.0);
  const vec2 MOUTH_R = vec2(113.2, 113.2);
  // Jaw: the upper lip stays, everything from the lower lip to the beard's tip drops by JAW_DROP
  // px between the closed and the open painting (measured on the two images)
  const float UPPER_LIP_Y = 372.0;
  const float LOWER_LIP_Y = 408.0;
  const float BEARD_END_Y = 485.0;
  const float NECK_Y = 515.0;
  const float JAW_DROP = 28.0;
  const float JAW_HALF_W = 92.0;
  // Eyes
  const vec2 EYE_L = vec2(325.5, 247.5);
  const vec2 EYE_R = vec2(450.8, 248.2);
  const vec2 EYE_RAD = vec2(42.0, 27.0);

  float ell(vec2 px, vec2 c, vec2 r) {
    float d = length((px - c) / r);
    return 1.0 - smoothstep(0.75, 1.25, d);
  }
  vec3 tex(sampler2D t, vec2 px) { return texture2D(t, vec2(px.x / SIZE, 1.0 - px.y / SIZE)).rgb; }

  // How much of the jaw movement applies at this pixel (0 above the lip and outside the chin)
  float jaw(vec2 px) {
    float v = smoothstep(UPPER_LIP_Y, LOWER_LIP_Y, px.y) * (1.0 - smoothstep(BEARD_END_Y, NECK_Y, px.y));
    float h = 1.0 - smoothstep(JAW_HALF_W * 0.6, JAW_HALF_W * 1.25, abs(px.x - MOUTH_C.x));
    return v * h;
  }

  void main() {
    vec2 px = vec2(vUv.x, 1.0 - vUv.y) * SIZE;
    vec3 col = tex(uBase, px);

    float area = ell(px, MOUTH_C, MOUTH_R);
    if (uOpen > 0.001 && area > 0.001) {
      float w = jaw(px);
      // Closed painting with its jaw pulled down to the current opening…
      vec3 closedNow = tex(uBase, px - vec2(0.0, uOpen * JAW_DROP * w));
      // …and the open painting with its jaw pushed up to the same opening
      vec3 openNow = tex(uMouth, px + vec2(0.0, (1.0 - uOpen) * JAW_DROP * w));
      // Both now line up, so blending them never shows two mouths
      vec3 talking = mix(closedNow, openNow, smoothstep(0.15, 0.85, uOpen));
      col = mix(col, talking, area);
    }

    float e = max(ell(px, EYE_L, EYE_RAD), ell(px, EYE_R, EYE_RAD)) * uBlink;
    if (e > 0.001) col = mix(col, tex(uEyes, px), e);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SILENCE_THRESHOLD = 0.02;
const ATTACK_TIME = 0.06;
const RELEASE_TIME = 0.13;
const CLOSED_EPSILON = 0.015;
// The face sits a bit above the picture's centre: show it larger and shifted down so the face fills the circle
const PLANE_SIZE = 2.6;
const PLANE_Y = -0.2;


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
    {
      // Speech over or a pause: ease the jaw closed instead of snapping shut
      if (!isSpeaking || targetVol <= SILENCE_THRESHOLD) targetVol = 0;
      const tau = targetVol > smoothAudioRef.current ? ATTACK_TIME : RELEASE_TIME;
      const k = 1 - Math.exp(-Math.min(delta, 0.1) / tau);
      smoothAudioRef.current = THREE.MathUtils.lerp(smoothAudioRef.current, targetVol, k);
      if (targetVol === 0 && smoothAudioRef.current < CLOSED_EPSILON) smoothAudioRef.current = 0;
    }
    // The jaw moves continuously now, so a gentle curve: soft sounds open it a little
    const open = Math.min(1, Math.pow(Math.max(0, smoothAudioRef.current - 0.03) / 0.6, 0.8));

    // Natural blinks at irregular intervals (2.5–5.5 s), each ~0.2 s
    if (t >= nextBlinkRef.current) {
      blinkStartRef.current = t;
      nextBlinkRef.current = t + 2.5 + Math.random() * 3;
    }
    const bt = (t - blinkStartRef.current) / 0.26;
    // Eyelids close quickly and open a little slower, like a real blink
    const blink = bt >= 0 && bt <= 1 ? (bt < 0.4 ? THREE.MathUtils.smoothstep(bt, 0, 0.4) : 1 - THREE.MathUtils.smoothstep(bt, 0.4, 1)) : 0;

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
