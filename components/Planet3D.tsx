"use client";

import { Canvas, useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/* ----------------------------------------------------------------------------
 * Data
 * -------------------------------------------------------------------------- */

type Cuisine = {
  id: string;
  name: string;
  flag: string;
  lat: number;
  lon: number;
};

const CUISINES: ReadonlyArray<Cuisine> = [
  { id: "france", name: "France", flag: "🇫🇷", lat: 46.2, lon: 2.2 },
  { id: "italie", name: "Italie", flag: "🇮🇹", lat: 41.9, lon: 12.5 },
  { id: "espagne", name: "Espagne", flag: "🇪🇸", lat: 40.4, lon: -3.7 },
  { id: "grece", name: "Grèce", flag: "🇬🇷", lat: 39.0, lon: 22.0 },
  { id: "chine", name: "Chine", flag: "🇨🇳", lat: 35.0, lon: 104.0 },
  { id: "japon", name: "Japon", flag: "🇯🇵", lat: 36.2, lon: 138.0 },
  { id: "thailande", name: "Thaïlande", flag: "🇹🇭", lat: 13.7, lon: 100.5 },
  { id: "vietnam", name: "Vietnam", flag: "🇻🇳", lat: 14.0, lon: 108.0 },
  { id: "inde", name: "Inde", flag: "🇮🇳", lat: 20.5, lon: 78.9 },
  { id: "coree", name: "Corée", flag: "🇰🇷", lat: 35.9, lon: 127.7 },
  { id: "maroc", name: "Maroc", flag: "🇲🇦", lat: 31.7, lon: -7.0 },
  { id: "algerie", name: "Algérie", flag: "🇩🇿", lat: 28.0, lon: 3.0 },
  { id: "tunisie", name: "Tunisie", flag: "🇹🇳", lat: 33.8, lon: 9.5 },
  { id: "turquie", name: "Turquie", flag: "🇹🇷", lat: 38.9, lon: 35.2 },
  { id: "liban", name: "Liban", flag: "🇱🇧", lat: 33.8, lon: 35.8 },
  { id: "usa", name: "USA", flag: "🇺🇸", lat: 39.8, lon: -98.5 },
  { id: "mexique", name: "Mexique", flag: "🇲🇽", lat: 23.6, lon: -102.5 },
  { id: "kenya", name: "Kenya", flag: "🇰🇪", lat: -0.0, lon: 37.9 },
  { id: "egypte", name: "Égypte", flag: "🇪🇬", lat: 26.8, lon: 30.8 },
];

/* ----------------------------------------------------------------------------
 * Geometry helpers
 * -------------------------------------------------------------------------- */

function latLonToVec3(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ----------------------------------------------------------------------------
 * Globe — sphère terre avec landmask : continents crème / mers charcoal
 * -------------------------------------------------------------------------- */

function Globe() {
  // Texture earth specular (NASA via three.js examples) :
  // - continents = pixels sombres (r ≈ 0)
  // - océans     = pixels clairs (r ≈ 1)
  // On inverse dans le shader pour mapper continents → crème, mers → charcoal.
  const landmask = useLoader(THREE.TextureLoader, "/textures/earth-landmask.jpg");

  useEffect(() => {
    landmask.colorSpace = THREE.SRGBColorSpace;
    landmask.anisotropy = 8;
    landmask.needsUpdate = true;
  }, [landmask]);

  // Material custom : on garde MeshStandardMaterial pour profiter des lights,
  // mais on override le diffuseColor via onBeforeCompile pour mixer entre
  // crème (continents) et charcoal (mers) selon la luminance de la texture.
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.88,
      metalness: 0.05,
    });
    // `map` doit être défini pour que `vMapUv` soit injecté par three.
    mat.map = landmask;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLandmask = { value: landmask };
      // Continents = vert nature, mers = bleu ocean
      shader.uniforms.uLand = { value: new THREE.Color("#3F8B4F") };
      shader.uniforms.uSea = { value: new THREE.Color("#1E5DA8") };

      shader.fragmentShader = shader.fragmentShader.replace(
        "uniform float opacity;",
        `
          uniform float opacity;
          uniform sampler2D uLandmask;
          uniform vec3 uLand;
          uniform vec3 uSea;
        `,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
          vec4 sampledLandmask = texture2D(uLandmask, vMapUv);
          // Texture earth_specular : continents sombres (r≈0), mers claires (r≈1).
          // On inverse pour obtenir un facteur "land" (1 sur continents, 0 sur mers).
          float landFactor = 1.0 - sampledLandmask.r;
          // Léger smoothstep pour adoucir les côtes sans flouter les contours.
          landFactor = smoothstep(0.35, 0.7, landFactor);
          vec3 mixedColor = mix(uSea, uLand, landFactor);
          diffuseColor.rgb = mixedColor;
        `,
      );
    };
    return mat;
  }, [landmask]);

  // Cleanup material au démontage pour éviter les leaks GPU.
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh receiveShadow material={material}>
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  );
}

/* ----------------------------------------------------------------------------
 * Atmosphere — double halo translucide terracotta
 * -------------------------------------------------------------------------- */

function Atmosphere() {
  return (
    <>
      {/* Halo proche : magenta très ténu */}
      <mesh>
        <sphereGeometry args={[1.015, 64, 64]} />
        <meshBasicMaterial
          color="#8B3A6A"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Halo large : suggère l'atmosphère magenta */}
      <mesh>
        <sphereGeometry args={[1.08, 64, 64]} />
        <meshBasicMaterial
          color="#8B3A6A"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ----------------------------------------------------------------------------
 * CuisinePoint — point lumineux + glow + tooltip HTML
 * -------------------------------------------------------------------------- */

type CuisinePointProps = {
  cuisine: Cuisine;
  interactive: boolean;
  onHoverChange: (id: string | null) => void;
  onSelect?: (id: string) => void;
  isHovered: boolean;
};

function CuisinePoint({
  cuisine,
  interactive,
  onHoverChange,
  onSelect,
  isHovered,
}: CuisinePointProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  // Phase de pulse aléatoire par point pour éviter le clignotement synchrone
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  const position = useMemo(
    () => latLonToVec3(cuisine.lat, cuisine.lon, 1.02),
    [cuisine.lat, cuisine.lon],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // pulse sinusoïdal subtil 1 ↔ 1.1
    const pulse = 1 + Math.sin(t * 1.6 + phase) * 0.05;
    const hoverScale = isHovered ? 1.5 : 1;
    if (dotRef.current) {
      dotRef.current.scale.setScalar(pulse * hoverScale);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse * hoverScale * 1.05);
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    onHoverChange(cuisine.id);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    document.body.style.cursor = "default";
    onHoverChange(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelect?.(cuisine.id);
  };

  return (
    <group ref={groupRef} position={position}>
      {/* Glow translucide rose bright */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial
          color="#FF8A3D"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Point principal rose bright — porte les events */}
      <mesh
        ref={dotRef}
        onPointerOver={interactive ? handlePointerOver : undefined}
        onPointerOut={interactive ? handlePointerOut : undefined}
        onClick={interactive ? handleClick : undefined}
      >
        <sphereGeometry args={[0.025, 24, 24]} />
        <meshStandardMaterial
          color="#FF8A3D"
          emissive="#FF8A3D"
          emissiveIntensity={isHovered ? 1.4 : 0.75}
          roughness={0.4}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>

      {/* Tooltip — HTML overlay attaché au point en world space */}
      {isHovered && interactive && (
        <Html
          position={[0, 0.08, 0]}
          center
          distanceFactor={2.4}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              transform: "translateY(-100%)",
              background: "rgba(26, 10, 36, 0.92)",
              color: "#F8F2EA",
              padding: "12px 16px",
              borderRadius: 4,
              minWidth: 180,
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              whiteSpace: "nowrap",
              borderLeft: "2px solid #D4A574",
            }}
          >
            <div
              style={{
                fontSize: 22,
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {cuisine.flag}
            </div>
            <div
              style={{
                fontFamily:
                  "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontSize: 18,
                lineHeight: 1.1,
                marginBottom: 6,
              }}
            >
              {cuisine.name}
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#D4A574",
                fontWeight: 500,
              }}
            >
              Découvrir →
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ----------------------------------------------------------------------------
 * Scene wrapper — gère la rotation auto + hover global
 * -------------------------------------------------------------------------- */

type SceneProps = {
  paused: boolean;
  ambient: boolean;
  onCuisineSelect?: (id: string) => void;
};

function Scene({ paused, ambient, onCuisineSelect }: SceneProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const sceneRef = useRef<THREE.Group>(null);

  // Auto-rotation : mise en pause si paused, ralentie si ambient, stop au hover
  useFrame((_, dt) => {
    if (!sceneRef.current) return;
    if (paused) return;
    const baseSpeed = ambient ? 0.025 : 0.05;
    const speed = hoveredId && !ambient ? 0 : baseSpeed;
    sceneRef.current.rotation.y += dt * speed;
  });

  return (
    <group ref={sceneRef}>
      <Globe />
      <Atmosphere />
      {CUISINES.map((cuisine) => (
        <CuisinePoint
          key={cuisine.id}
          cuisine={cuisine}
          interactive={!ambient}
          isHovered={hoveredId === cuisine.id}
          onHoverChange={setHoveredId}
          onSelect={onCuisineSelect}
        />
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------------------
 * Public component
 * -------------------------------------------------------------------------- */

export interface Planet3DProps {
  /** Callback quand l'utilisateur clique sur un pays */
  onCuisineSelect?: (cuisineId: string) => void;
  /** Si true, désactive l'auto-rotation (utile en hero subtil) */
  paused?: boolean;
  /** Mode compact pour use as background (sans interactivité) */
  ambient?: boolean;
}

export default function Planet3D({
  onCuisineSelect,
  paused = false,
  ambient = false,
}: Planet3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{
        // En mode ambient on coupe les pointer events au niveau du canvas
        // pour laisser la page parent recevoir le scroll / clics.
        pointerEvents: ambient ? "none" : "auto",
      }}
    >
      <Suspense fallback={null}>
        {/* Lights — éclairent continents or, ambiance aubergine */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 2, 4]} intensity={0.95} color="#FFF4E8" />
        {/* Point rose pâle pour éclairer les continents or */}
        <pointLight position={[-2, -1, 3]} intensity={0.55} color="#FF8A3D" />
        {/* Subtle magenta rim light pour profondeur */}
        <pointLight position={[2, 1, -3]} intensity={0.3} color="#8B3A6A" />

        {/* Stars en arrière-plan, très subtiles */}
        <Stars
          radius={50}
          depth={50}
          count={1000}
          factor={4}
          saturation={0}
          fade
          speed={0.3}
        />

        <Scene
          paused={paused}
          ambient={ambient}
          onCuisineSelect={onCuisineSelect}
        />

        {/* Drag-to-rotate : désactivé en mode ambient */}
        {!ambient && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            rotateSpeed={0.5}
            // Ne pas laisser l'utilisateur passer en vue polaire extrême
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={(2 * Math.PI) / 3}
          />
        )}
      </Suspense>
    </Canvas>
  );
}
