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
  uniform sampler2D uMask;   // 1 = the man, 0 = the wall behind him
  uniform sampler2D uWall;   // the wall with the man painted out (already soft-focus)
  uniform float uOpen;
  uniform float uBlink;
  uniform float uHeadAngle;  // radians, head tilt around the neck
  uniform vec2 uHeadShift;   // px, head drift / nod
  uniform float uBrow;       // px, eyebrows raised on emphasis
  uniform float uBreath;     // px, shoulders rising with each breath
  uniform vec2 uBgShift;     // px, the wall drifts the other way (depth)
  uniform float uLight;      // -1..1, slow warm light moving across him

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

  const vec2 NECK = vec2(384.0, 520.0);   // the head turns around this point
  const vec2 HEAD_C = vec2(384.0, 250.0);
  const vec2 HEAD_R = vec2(250.0, 300.0);
  const vec2 BROW_C = vec2(384.0, 212.0);
  const vec2 BROW_R = vec2(150.0, 42.0);

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

  float mask(vec2 px) { return texture2D(uMask, vec2(px.x / SIZE, 1.0 - px.y / SIZE)).r; }

  // Where to read the painting for this screen pixel once the head and body have moved
  vec2 figure(vec2 px) {
    // Breathing: shoulders and chest rise a little, fading out towards the face
    vec2 q = px + vec2(0.0, uBreath * smoothstep(380.0, 600.0, px.y));
    // Head (shemagh, face, beard) tilts and drifts around the neck; the body stays
    float wHead = (1.0 - smoothstep(430.0, 560.0, px.y)) * (1.0 - smoothstep(0.85, 1.15, length((px - HEAD_C) / HEAD_R)));
    vec2 d = q - NECK - uHeadShift;
    float c = cos(-uHeadAngle), s = sin(-uHeadAngle);
    vec2 turned = vec2(c * d.x - s * d.y, s * d.x + c * d.y) + NECK;
    q = mix(q, turned, wHead);
    // Eyebrows lift on emphasis
    q.y += uBrow * (1.0 - smoothstep(0.6, 1.2, length((q - BROW_C) / BROW_R)));
    return q;
  }

  void main() {
    vec2 px = vec2(vUv.x, 1.0 - vUv.y) * SIZE;
    vec2 q = figure(px);

    // ----- the man -----
    vec3 man = tex(uBase, q);
    float area = ell(q, MOUTH_C, MOUTH_R);
    if (uOpen > 0.001 && area > 0.001) {
      float w = jaw(q);
      // Closed painting with its jaw pulled down to the current opening, and the open painting
      // with its jaw pushed up to the same opening: they line up, so the blend is one mouth
      vec3 closedNow = tex(uBase, q - vec2(0.0, uOpen * JAW_DROP * w));
      vec3 openNow = tex(uMouth, q + vec2(0.0, (1.0 - uOpen) * JAW_DROP * w));
      man = mix(man, mix(closedNow, openNow, smoothstep(0.15, 0.85, uOpen)), area);
    }
    float e = max(ell(q, EYE_L, EYE_RAD), ell(q, EYE_R, EYE_RAD)) * uBlink;
    if (e > 0.001) man = mix(man, tex(uEyes, q), e);
    // Soft warm key light drifting slowly across the face
    float side = (q.x - 384.0) / 384.0;
    man *= 1.0 + 0.045 * uLight * side + 0.02;

    // ----- the wall: out of focus, a touch darker, drifting the other way -----
    vec2 b = px + uBgShift;
    vec3 wall = tex(uWall, b) * 0.94;

    vec3 col = mix(wall, man, mask(q));
    // Gentle vignette pulls the eye to the face
    float v = length((px - vec2(384.0, 330.0)) / vec2(520.0, 560.0));
    col *= 1.0 - 0.22 * smoothstep(0.55, 1.1, v);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SILENCE_THRESHOLD = 0.02;
const ATTACK_TIME = 0.06;
const RELEASE_TIME = 0.13;
const CLOSED_EPSILON = 0.015;
// The painting covers the whole view (top edge included: nothing behind it may show), shifted down a
// little so the face sits in the middle of the circle. The CSS fallback below matches this framing.
const PLANE_SIZE = 2.64;
const PLANE_Y = -0.15;


function GrandpaScene({ audioLevel = 0, isSpeaking = false, analyserNode = null }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const timeRef = useRef(0);
  const smoothAudioRef = useRef(0);
  const nextBlinkRef = useRef(2.5);
  const blinkStartRef = useRef(-10);

  const [base, mouth, eyes, personMask, wallTex] = useLoader(THREE.TextureLoader, [...FRAMES, '/images/shayeb/person-mask.png', '/images/shayeb/wall.jpg']);
  useMemo(() => {
    for (const t of [base, mouth, eyes, personMask, wallTex]) {
      // Raw ShaderMaterial writes the colour straight out: keep the textures untagged
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
    }
  }, [base, mouth, eyes, personMask, wallTex]);
  const slowAudioRef = useRef(0);
  const motionRef = useRef({ angle: 0, sx: 0, sy: 0, brow: 0 });
  const dataArray = useMemo(() => new Uint8Array(analyserNode?.fftSize || 256), [analyserNode]);

  const uniforms = useMemo(
    () => ({
      uBase: { value: base },
      uMouth: { value: mouth },
      uEyes: { value: eyes },
      uMask: { value: personMask },
      uWall: { value: wallTex },
      uOpen: { value: 0 },
      uBlink: { value: 0 },
      uHeadAngle: { value: 0 },
      uHeadShift: { value: new THREE.Vector2() },
      uBrow: { value: 0 },
      uBreath: { value: 0 },
      uBgShift: { value: new THREE.Vector2() },
      uLight: { value: 0 },
    }),
    [base, mouth, eyes, personMask, wallTex]
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

    // Body language. Idle: slow drifting head, breathing. Talking: livelier tilts, small nods
    // on stressed syllables and eyebrows that lift on emphasis.
    const vol = smoothAudioRef.current;
    slowAudioRef.current = THREE.MathUtils.lerp(slowAudioRef.current, vol, 1 - Math.exp(-delta / 0.6));
    const emphasis = Math.max(0, vol - slowAudioRef.current - 0.04);
    const talk = Math.min(1, slowAudioRef.current * 2.5);
    const mo = motionRef.current;
    const ease = 1 - Math.exp(-delta / 0.18);
    const targetAngle =
      0.012 * Math.sin(t * 0.43) + 0.006 * Math.sin(t * 1.07 + 1.3) + talk * 0.014 * Math.sin(t * 2.1 + 0.5);
    const targetSx = 3.0 * Math.sin(t * 0.31) + talk * 2.0 * Math.sin(t * 1.7);
    const targetSy = 1.2 * Math.sin(t * 0.52 + 2.0) + emphasis * 22 + talk * 1.5;
    mo.angle += (targetAngle - mo.angle) * ease;
    mo.sx += (targetSx - mo.sx) * ease;
    mo.sy += (targetSy - mo.sy) * ease;
    mo.brow += (Math.min(4, emphasis * 30) - mo.brow) * (1 - Math.exp(-delta / 0.12));

    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      u.uOpen.value = open;
      u.uBlink.value = blink;
      u.uHeadAngle.value = mo.angle;
      u.uHeadShift.value.set(mo.sx, mo.sy);
      u.uBrow.value = mo.brow;
      u.uBreath.value = 2.2 * Math.sin(t * 1.25);
      u.uBgShift.value.set(-mo.sx * 0.6, -mo.sy * 0.3);
      u.uLight.value = Math.sin(t * 0.21);
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
        background: 'url(/images/shayeb/base.jpg) center 2% / 113% no-repeat, #8a4a32',
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
