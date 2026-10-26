import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// Cartoon salt-bag character for the live call. Drop-in replacement for
// SaudiMemojiCall (same props). All face coordinates below are pixels in
// /salt-bag.png (673x857), measured on the image: y grows downwards.

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uAudio;
  uniform float uBlink;

  const vec2 SIZE = vec2(673.0, 857.0);
  const vec3 LINE = vec3(0.235, 0.157, 0.137); // the drawing's dark brown line colour

  // Smile: midline y = 556 - 0.0044 * dx^2 around x = 337, ~8px thick, half-width 53px
  const float SMILE_X = 337.0;
  const float SMILE_Y = 556.0;
  const float SMILE_K = 0.0044;
  const float SMILE_HW = 53.0;
  const float LINE_HALF = 4.0;

  // Eyes: dark ovals ~52x66px
  const vec2 EYE_L = vec2(244.9, 489.0);
  const vec2 EYE_R = vec2(431.6, 489.0);
  const vec2 EYE_R_SIZE = vec2(31.0, 38.0); // radii incl. a margin over the anti-aliased outline

  vec4 tex(vec2 px) { return texture2D(uTexture, vec2(px.x / SIZE.x, 1.0 - px.y / SIZE.y)); }

  // 1 inside a band of half-width w around 0, soft over ~1px
  float band(float d, float w) { return 1.0 - smoothstep(w - 0.75, w + 0.75, abs(d)); }

  void main() {
    vec2 px = vec2(vUv.x * SIZE.x, (1.0 - vUv.y) * SIZE.y);
    vec4 col = tex(px);
    if (col.a < 0.01) discard;

    // ---------- Blink ----------
    if (uBlink > 0.01) {
      bool left = abs(px.x - EYE_L.x) < abs(px.x - EYE_R.x);
      vec2 c = left ? EYE_L : EYE_R;
      vec2 q = (px - c) / EYE_R_SIZE;
      float inEye = 1.0 - smoothstep(0.95, 1.05, length(q));
      if (inEye > 0.0) {
        float nx = clamp(q.x, -1.0, 1.0);
        // Closed eye rests on a gentle "◡" curve just below the eye center
        float restY = c.y + 4.0 + 9.0 * (1.0 - nx * nx);
        // The upper lid does the travelling; the lower lid only rises at the very end
        float upper = mix(c.y - EYE_R_SIZE.y - 2.0, restY, uBlink);
        float lower = mix(c.y + EYE_R_SIZE.y + 2.0, restY + 1.0, smoothstep(0.65, 1.0, uBlink));
        float cover = max(smoothstep(upper + 0.8, upper - 0.8, px.y), smoothstep(lower - 0.8, lower + 0.8, px.y));

        // Lid = the bag fabric, filled in from just left and right of the eye
        float x0 = c.x - EYE_R_SIZE.x - 6.0, x1 = c.x + EYE_R_SIZE.x + 6.0;
        vec3 fabric = mix(tex(vec2(x0, px.y)).rgb, tex(vec2(x1, px.y)).rgb, clamp((px.x - x0) / (x1 - x0), 0.0, 1.0));
        col.rgb = mix(col.rgb, fabric, cover * inEye);

        // Lid line, drawn like the rest of the face
        float line = band(px.y - upper, LINE_HALF) * smoothstep(0.1, 0.3, uBlink) * (1.0 - smoothstep(0.92, 1.0, abs(nx)));
        col.rgb = mix(col.rgb, LINE, line * inEye);
      }
    }

    // ---------- Mouth ----------
    float open = clamp(uAudio, 0.0, 1.0);
    float dx = px.x - SMILE_X;
    if (open > 0.002 && abs(dx) < SMILE_HW + 2.0) {
      float sx = clamp(dx / SMILE_HW, -1.0, 1.0);
      float topY = SMILE_Y - SMILE_K * dx * dx;                  // the smile itself is the upper lip
      float depth = open * 34.0 * pow(1.0 - sx * sx, 0.6);       // rounded "D" opening
      float botY = topY + depth;

      float inside = smoothstep(topY - 0.5, topY + 0.5, px.y) * smoothstep(botY + 0.5, botY - 0.5, px.y)
                   * (1.0 - smoothstep(SMILE_HW - 1.0, SMILE_HW + 1.0, abs(dx)));
      if (inside > 0.0) {
        float ny = clamp((px.y - topY) / max(depth, 0.001), 0.0, 1.0);
        vec3 cavity = mix(vec3(0.30, 0.07, 0.08), vec3(0.42, 0.10, 0.12), ny);
        // Tongue: a soft pink mound along the bottom
        float tongue = smoothstep(0.45, 0.8, ny + 0.25 * (1.0 - sx * sx)) * (1.0 - smoothstep(0.55, 0.85, abs(sx)));
        cavity = mix(cavity, vec3(0.93, 0.46, 0.50), tongue * smoothstep(8.0, 16.0, depth));
        col.rgb = mix(col.rgb, cavity, inside);
      }
      // Lower lip line, same weight as the smile; it fades in as the mouth opens
      float lowerLine = band(px.y - botY, LINE_HALF) * (1.0 - smoothstep(SMILE_HW - 1.0, SMILE_HW + 1.0, abs(dx)));
      col.rgb = mix(col.rgb, LINE, lowerLine * smoothstep(0.0, 3.0, depth));
      // Keep the upper lip crisp over the cavity
      col.rgb = mix(col.rgb, LINE, band(px.y - topY, LINE_HALF) * (1.0 - smoothstep(SMILE_HW - 1.0, SMILE_HW + 1.0, abs(dx))));
    }

    gl_FragColor = col;
  }
`;

const SILENCE_THRESHOLD = 0.02;
const ATTACK_TIME = 0.035; // seconds for the mouth to open towards the voice level
const RELEASE_TIME = 0.09; // seconds for the mouth to ease closed between syllables
const CLOSED_EPSILON = 0.015;
const BAG_HEIGHT = 1.9;
const BAG_ASPECT = 673 / 857;

function SaltBagScene({ imageUrl, audioLevel = 0, isSpeaking = false, analyserNode = null }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const timeRef = useRef(0);
  const smoothAudioRef = useRef(0);

  const texture = useLoader(THREE.TextureLoader, imageUrl);
  // Leave the texture untagged: this raw ShaderMaterial writes its colour straight
  // out, so tagging it sRGB would linearise it once and darken the whole bag.
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  // Read the analyser's whole window: 128 samples (~5 ms) gives a jittery level
  const dataArray = useMemo(() => new Uint8Array(analyserNode?.fftSize || 256), [analyserNode]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uAudio: { value: 0 },
      uBlink: { value: 0 },
    }),
    [texture]
  );

  // Close the mouth the instant speech ends, even before the next frame
  useEffect(() => {
    if (!isSpeaking) {
      smoothAudioRef.current = 0;
      if (materialRef.current) materialRef.current.uniforms.uAudio.value = 0;
    }
  }, [isSpeaking]);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Mouth is closed unless the AI is speaking AND audio is actually audible
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
          // Silence from the analyser means 0, never a stale external level
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
      // Speech is over: snap strictly closed, no tail that leaves the mouth half open
      smoothAudioRef.current = 0;
    } else {
      // During speech: quick attack, smooth release between syllables (frame-rate independent)
      if (targetVol <= SILENCE_THRESHOLD) targetVol = 0;
      const tau = targetVol > smoothAudioRef.current ? ATTACK_TIME : RELEASE_TIME;
      const k = 1 - Math.exp(-Math.min(delta, 0.1) / tau);
      smoothAudioRef.current = THREE.MathUtils.lerp(smoothAudioRef.current, targetVol, k);
      // Finish the close exactly at 0 instead of creeping towards it forever
      if (targetVol === 0 && smoothAudioRef.current < CLOSED_EPSILON) smoothAudioRef.current = 0;
    }

    // Blink every ~3.6 s, lasting 0.22 s
    const blinkCycle = t % 3.6;
    const blink = blinkCycle > 3.38 ? Math.sin(((blinkCycle - 3.38) / 0.22) * Math.PI) : 0;

    if (materialRef.current) {
      materialRef.current.uniforms.uAudio.value = smoothAudioRef.current;
      materialRef.current.uniforms.uBlink.value = Math.max(0, blink);
    }

    if (meshRef.current) {
      const vol = smoothAudioRef.current;
      // Breathing at rest; a little squash-and-stretch while talking
      const breathe = Math.sin(t * 1.6) * 0.012;
      const sy = 1 + breathe + vol * 0.035;
      const sx = 1 - breathe * 0.6 - vol * 0.02;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, sx, 0.25);
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, sy, 0.25);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, -0.02 + vol * 0.03, 0.25);

      const targetRotZ = Math.sin(t * 0.8) * 0.025;
      const targetRotY = Math.sin(t * 0.6) * 0.06 + state.pointer.x * 0.12;
      const targetRotX = -state.pointer.y * 0.08;
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotZ, 0.08);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.08);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.08);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.02, 0]}>
      <planeGeometry args={[BAG_HEIGHT * BAG_ASPECT, BAG_HEIGHT]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

export default function SaltBagCall({
  imageUrl = '/salt-bag.png',
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
        background: 'radial-gradient(circle at 50% 38%, #4a2a2a 0%, #2b1d1d 70%)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        ...style,
      }}
    >
      <Canvas camera={{ position: [0, 0, 2.75], fov: 46 }}>
        <Suspense fallback={null}>
          <SaltBagScene
            analyserNode={analyserNode}
            audioLevel={externalAudioLevel}
            imageUrl={imageUrl}
            isSpeaking={isSpeaking}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
