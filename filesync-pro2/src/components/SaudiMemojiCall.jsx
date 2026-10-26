import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// Silence THREE.Clock deprecation notice triggered internally by React Three Fiber v9
if (typeof window !== 'undefined') {
  const origWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
      return;
    }
    origWarn.apply(console, args);
  };
}

const vertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAudio;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float distFace = distance(uv, vec2(0.5, 0.5));
    pos.z += smoothstep(0.4, 0.0, distFace) * 0.25;

    if (uv.y < 0.28) {
      pos.y += sin(uTime * 2.2) * 0.012 * (1.0 - uv.y * 3.5);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uAudio;
  uniform float uBlink;

  void main() {
    vec2 uv = vUv;

    // 1. Mouth coordinates, measured on /memoji.jpg: the lip seam (where the
    // upper and lower lips meet) is at y=0.369 in the center and curves up
    // to ~0.39 at dx=0.05. Slicing anywhere else drags a lip along with the jaw.
    vec2 mouthCenter = vec2(0.50, 0.369);
    float mouthWidth = 0.060;

    float dx = uv.x - mouthCenter.x;
    float smileCurve = (dx * dx) * 8.5;
    float lipLine = mouthCenter.y + smileCurve;

    // Natural horizontal fade for the mouth corners
    float horizMask = pow(smoothstep(mouthWidth, 0.0, abs(dx)), 1.4);
    float gap = clamp(uAudio * 0.034, 0.0, 0.034) * horizMask;

    // 2. Slice: the upper face never moves, only the lower jaw shifts down
    // The gap exists strictly between (lipLine - gap) and (lipLine)
    float gapTop = lipLine;
    float gapBottom = lipLine - gap;

    if (vUv.y < gapBottom) {
      // Fade out the UV shift towards the bottom of the neck (-0.15)
      float jawWeight = smoothstep(-0.15, 0.0, vUv.y - gapBottom);
      uv.y += gap * jawWeight;
      // Never let the jaw sample pixels from above the lip (nose / eyes)
      uv.y = min(uv.y, lipLine - 0.0005);
    }
    // Pixels inside the gap keep vUv: they are fully covered below

    vec4 finalColor = vec4(texture2D(uTexture, uv).rgb, 1.0);

    // 3. Cover: 100% opaque mouth cavity over the whole gap
    if (gap > 0.0005) {
      // Anti-alias only outside the gap, never inside it
      float aa = 0.0015;
      float cover = smoothstep(gapBottom - aa, gapBottom, vUv.y)
                  * (1.0 - smoothstep(gapTop, gapTop + aa, vUv.y));

      if (cover > 0.0) {
        // Normalize Y inside the mouth hole (0.0 at bottom lip, 1.0 at top lip)
        float normY = clamp((vUv.y - gapBottom) / gap, 0.0, 1.0);
        float normX = clamp(abs(dx) / mouthWidth, 0.0, 1.0);

        // Dark red cavity, lighter towards the corners
        vec3 cavityColor = mix(vec3(0.16, 0.035, 0.04), vec3(0.24, 0.07, 0.07), normX);
        vec3 tongueColor = vec3(0.60, 0.27, 0.27);
        // Warm off-white so the teeth sit in the skin palette instead of glowing
        vec3 teethColor  = vec3(0.86, 0.80, 0.74);

        // Tongue at the bottom
        float tongueShape = smoothstep(0.55, 0.05, normY) * smoothstep(0.75, 0.1, normX);
        cavityColor = mix(cavityColor, tongueColor, tongueShape * 0.85);

        // Upper teeth: a narrow band under the upper lip, fading out before the
        // corners, shaded towards their lower edge, only once the mouth is open enough
        float teethShape = smoothstep(0.72, 0.86, normY)
                         * smoothstep(0.85, 0.45, normX)
                         * smoothstep(0.010, 0.020, gap);
        vec3 teethShaded = teethColor * mix(0.82, 1.0, smoothstep(0.72, 0.95, normY));
        cavityColor = mix(cavityColor, teethShaded, teethShape);

        // Soft shadow along both lip edges so the opening blends into the lips
        float lipShadow = smoothstep(0.0, 0.18, normY) * smoothstep(1.0, 0.9, normY);
        cavityColor *= mix(0.65, 1.0, lipShadow);

        finalColor.rgb = mix(finalColor.rgb, cavityColor, cover);
      }
    }

    // 4. Perfect Eye Blink (Samples clean skin from the forehead)
    vec2 leftEye = vec2(0.445, 0.545);
    vec2 rightEye = vec2(0.555, 0.545);
    vec2 eyeSize = vec2(0.030, 0.035);

    float dL = length((vUv - leftEye) / eyeSize);
    float dR = length((vUv - rightEye) / eyeSize);

    if ((dL < 1.0 || dR < 1.0) && uBlink > 0.01) {
      float activeD = min(dL, dR);
      float eyeMask = smoothstep(1.0, 0.75, activeD);
      float lidPos = 1.0 - uBlink * 2.0;

      // Determine which eye we are in
      bool isLeft = dL < 1.0;
      float eyeNormY = (vUv.y - (isLeft ? leftEye.y : rightEye.y)) / eyeSize.y;

      if (eyeNormY > lidPos) {
        // Sample clean forehead skin (safely high above the eye)
        vec2 skinSample = isLeft ? vec2(0.445, 0.60) : vec2(0.555, 0.60);
        vec3 eyelidSkin = texture2D(uTexture, skinSample).rgb * 0.95;
        
        float lidCover = smoothstep(lidPos - 0.1, lidPos + 0.05, eyeNormY);
        finalColor.rgb = mix(finalColor.rgb, eyelidSkin, lidCover * eyeMask);
      }
    }

    gl_FragColor = finalColor;
  }
`;

const SILENCE_THRESHOLD = 0.02;

function MemojiScene({ imageUrl, audioLevel = 0, isSpeaking = false, analyserNode = null }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const timeRef = useRef(0);
  const smoothAudioRef = useRef(0);

  const texture = useLoader(THREE.TextureLoader, imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  const dataArray = useMemo(() => new Uint8Array(128), []);

  // Close the mouth the instant speech ends, even before the next frame
  useEffect(() => {
    if (!isSpeaking) {
      smoothAudioRef.current = 0;
      if (materialRef.current) materialRef.current.uniforms.uAudio.value = 0;
    }
  }, [isSpeaking]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uAudio: { value: 0 },
      uTime: { value: 0 },
      uBlink: { value: 0 },
    }),
    [texture]
  );

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

    if (targetVol <= SILENCE_THRESHOLD) {
      // Snap strictly closed: no lerp tail that leaves the mouth half open
      smoothAudioRef.current = 0;
    } else {
      smoothAudioRef.current = THREE.MathUtils.lerp(smoothAudioRef.current, targetVol, 0.38);
    }

    const blinkCycle = t % 3.6;
    let blink = 0;
    if (blinkCycle > 3.35) {
      blink = Math.sin(((blinkCycle - 3.35) / 0.25) * Math.PI);
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
      materialRef.current.uniforms.uAudio.value = smoothAudioRef.current;
      materialRef.current.uniforms.uBlink.value = Math.max(0, blink);
    }

    if (meshRef.current) {
      const vol = smoothAudioRef.current;
      const targetRotY = Math.sin(t * 0.85) * 0.045 + state.pointer.x * 0.1;
      const targetRotX = Math.cos(t * 0.65) * 0.02 - state.pointer.y * 0.07 + (vol > 0.03 ? Math.sin(t * 10.0) * 0.03 * vol : 0);

      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.09);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.09);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.05, 0]} scale={[1.12, 1.12, 1]}>
      <planeGeometry args={[5.33, 3, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function SaudiMemojiCall({
  imageUrl = '/memoji.jpg',
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
        backgroundColor: '#2b2b2b',
        boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        ...style,
      }}
    >
      <Canvas camera={{ position: [0, 0, 2.75], fov: 46 }}>
        <Suspense fallback={null}>
          <MemojiScene
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
