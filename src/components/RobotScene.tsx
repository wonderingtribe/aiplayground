import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '../utils';

interface RobotSceneProps {
  isThinking: boolean;
  isSpeaking: boolean;
}

function RobotModel({ isThinking, isSpeaking }: RobotSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);

  // Simple procedural robot for now - user can replace with their GLB
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (meshRef.current) {
      // Gentle floating
      meshRef.current.position.y = Math.sin(time) * 0.1;
      
      // Thinking animation: faster distortion or rotation
      if (isThinking) {
        meshRef.current.rotation.y += 0.05;
      } else {
        meshRef.current.rotation.y += 0.005;
      }
    }

    if (headRef.current && isSpeaking) {
      // Speaking animation: subtle head bobbing
      headRef.current.position.y = Math.sin(time * 10) * 0.02;
    }
  });

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        {/* Main Body */}
        <mesh ref={meshRef}>
          <boxGeometry args={[1, 1.2, 0.8]} />
          <meshStandardMaterial color="#E4E3E0" metalness={0.8} roughness={0.2} />
          
          {/* Eyes/Screen */}
          <mesh position={[0, 0.2, 0.41]}>
            <planeGeometry args={[0.7, 0.3]} />
            <meshStandardMaterial 
              color={isThinking ? "#00FF00" : "#00AAFF"} 
              emissive={isThinking ? "#00FF00" : "#00AAFF"} 
              emissiveIntensity={2} 
            />
          </mesh>
        </mesh>

        {/* Head */}
        <group ref={headRef} position={[0, 0.8, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 0.5, 0.5]} />
            <meshStandardMaterial color="#E4E3E0" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Antenna */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <sphereGeometry args={[0.05]} />
            <meshStandardMaterial 
              color={isThinking ? "#FF0000" : "#888"} 
              emissive={isThinking ? "#FF0000" : "#000"} 
              emissiveIntensity={1} 
            />
          </mesh>
        </group>
      </Float>

      {/* Ground Shadow */}
      <ContactShadows 
        position={[0, -1, 0]} 
        opacity={0.4} 
        scale={10} 
        blur={2} 
        far={1} 
      />
    </group>
  );
}

export function RobotScene({ isThinking, isSpeaking }: RobotSceneProps) {
  return (
    <div className="w-full h-full min-h-[300px] relative bg-gradient-to-b from-[#0a0a0a] to-[#141414]">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <Environment preset="city" />
        
        <RobotModel isThinking={isThinking} isSpeaking={isSpeaking} />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          minPolarAngle={Math.PI / 2.5} 
          maxPolarAngle={Math.PI / 1.5} 
        />
      </Canvas>
      
      {/* Overlay Status */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isThinking ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
          )} />
          <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">
            {isThinking ? 'Neural Processing' : 'System Idle'}
          </span>
        </div>
      </div>
    </div>
  );
}
