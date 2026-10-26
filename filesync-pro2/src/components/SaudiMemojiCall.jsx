import React, { useRef, useMemo, Suspense } from 'react';
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

    // 1. Exact Mouth Coordinates
    vec2 mouthCenter = vec2(0.50, 0.385);
    float mouthWidth = 0.050; // Calibrated width

    float dx = uv.x - mouthCenter.x;
    float smileCurve = (dx * dx) * 1.8;
    float lipLine = mouthCenter.y + smileCurve;
    
    // Natural horizontal fade for the mouth corners
    float horizMask = pow(smoothstep(mouthWidth, 0.0, abs(dx)), 1.2);
    float gap = clamp(uAudio * 0.045, 0.0, 0.045) * horizMask;

    // 2. Slice and Shift the Lower Jaw
    // Only pull pixels that are strictly below the lip line
    float dy = vUv.y - lipLine;
    if (dy < 0.0) {
      // Fade out the UV shift towards the bottom of the neck (-0.15)
      float jawWeight = smoothstep(-0.15, 0.0, dy);
      uv.y += gap * jawWeight;
    }

    // Sample the texture AFTER shifting the jaw
    vec4 finalColor = texture2D(uTexture, uv);

    // 3. Draw 100% Opaque Mouth Cavity OVER the gap
    // The gap exists strictly between (lipLine - gap) and (lipLine)
    float gapTop = lipLine;
    float gapBottom = lipLine - gap;

    if (gap > 0.001 && vUv.y < gapTop + 0.002 && vUv.y > gapBottom - 0.002) {
      // Normalize Y inside the mouth hole (0.0 at bottom lip, 1.0 at top lip)
      float normY = clamp((vUv.y - gapBottom) / max(0.0001, gap), 0.0, 1.0);
      
      // Strict masking to ensure it only renders horizontally within the mouth
      float cavityMask = smoothstep(mouthWidth, mouthWidth * 0.85, abs(dx));
      float verticalBlend = smoothstep(0.0, 0.15, normY) * smoothstep(1.0, 0.85, normY);
      float finalMouthAlpha = cavityMask * verticalBlend;

      if (finalMouthAlpha > 0.0) {
        vec3 cavityColor = vec3(0.12, 0.02, 0.03); // Deep dark red/black
        vec3 tongueColor = vec3(0.52, 0.20, 0.22);
        vec3 teethColor  = vec3(0.92, 0.90, 0.88);

        // Add Tongue at the bottom
        float tongueShape = smoothstep(0.45, 0.0, normY) * smoothstep(mouthWidth * 0.7, 0.0, abs(dx));
        cavityColor = mix(cavityColor, tongueColor, tongueShape);

        // Add Teeth at the top
        float teethShape = smoothstep(0.68, 0.85, normY);
        cavityColor = mix(cavityColor, teethColor, teethShape);

        // Overwrite the distorted pixels completely with the opaque mouth
        finalColor.rgb = mix(finalColor.rgb, cavityColor, finalMouthAlpha);
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

function MemojiScene({ imageUrl, audioLevel = 0, isSpeaking = false, analyserNode = null }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const timeRef = useRef(0);
  const smoothAudioRef = useRef(0);

  const texture = useLoader(THREE.TextureLoader, imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  const dataArray = useMemo(() => new Uint8Array(128), []);

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

    let targetVol = Number(audioLevel) || 0;

    if (analyserNode) {
      try {
        analyserNode.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128.0;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        if (rms > 0.01) targetVol = Math.min(1.0, rms * 8.0);
      } catch (e) {}
    } else if (isSpeaking) {
      const wave = (Math.sin(t * 16.0) * 0.5 + 0.5) * (Math.cos(t * 22.0) * 0.5 + 0.5);
      targetVol = (0.2 + 0.8 * wave) * (Math.sin(t * 5.5) > -0.6 ? 1.0 : 0.1);
    }

    smoothAudioRef.current = THREE.MathUtils.lerp(
      smoothAudioRef.current,
      targetVol,
      targetVol > 0.01 ? 0.38 : 0.3
    );
    if (smoothAudioRef.current < 0.003) smoothAudioRef.current = 0;

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
