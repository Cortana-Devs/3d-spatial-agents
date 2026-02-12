'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics, useSphere, usePlane, useDistanceConstraint } from '@react-three/cannon'
import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

// Cloth configuration
const CLOTH_SIZE = 2
const CLOTH_SEGMENTS = 20
const MASS = 0.1
const PARTICLE_DISTANCE = CLOTH_SIZE / CLOTH_SEGMENTS

function Cloth() {
    const meshRef = useRef<THREE.Mesh>(null!)

    // Create particle grid
    const particles = useMemo(() => {
        const grid: any[][] = []
        for (let i = 0; i <= CLOTH_SEGMENTS; i++) {
            grid[i] = []
            for (let j = 0; j <= CLOTH_SEGMENTS; j++) {
                grid[i][j] = null
            }
        }
        return grid
    }, [])

    // Particle component
    // Particle component
    const Particle = forwardRef(({ position, fixed }: { position: [number, number, number], fixed?: boolean }, ref) => {
        const [sphereRef] = useSphere(() => ({
            mass: fixed ? 0 : MASS,
            position,
            args: [0.01], // Small invisible sphere
        }))

        // Forward the ref
        useImperativeHandle(ref, () => sphereRef.current)

        return <mesh ref={sphereRef} visible={false} />
    })
    Particle.displayName = 'Particle'

    // Create cloth geometry
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(CLOTH_SIZE, CLOTH_SIZE, CLOTH_SEGMENTS, CLOTH_SEGMENTS)
        geo.rotateX(-Math.PI / 2)
        return geo
    }, [])

    // Connect particles with distance constraints
    const Constraints = () => {
        const constraints: any[] = []

        for (let i = 0; i <= CLOTH_SEGMENTS; i++) {
            for (let j = 0; j <= CLOTH_SEGMENTS; j++) {
                // Connect to right neighbor
                if (j < CLOTH_SEGMENTS) {
                    constraints.push(
                        <DistanceLink
                            key={`h-${i}-${j}`}
                            bodyA={particles[i][j]}
                            bodyB={particles[i][j + 1]}
                            distance={PARTICLE_DISTANCE}
                        />
                    )
                }

                // Connect to bottom neighbor
                if (i < CLOTH_SEGMENTS) {
                    constraints.push(
                        <DistanceLink
                            key={`v-${i}-${j}`}
                            bodyA={particles[i][j]}
                            bodyB={particles[i + 1][j]}
                            distance={PARTICLE_DISTANCE}
                        />
                    )
                }
            }
        }
        return <>{constraints}</>
    }

    // Distance constraint wrapper
    function DistanceLink({ bodyA, bodyB, distance }: any) {
        useDistanceConstraint(bodyA, bodyB, { distance })
        return null
    }

    // Update mesh vertices from particle positions
    useFrame(() => {
        if (!meshRef.current) return

        const positions = meshRef.current.geometry.attributes.position
        let index = 0

        for (let i = 0; i <= CLOTH_SEGMENTS; i++) {
            for (let j = 0; j <= CLOTH_SEGMENTS; j++) {
                if (particles[i][j]?.current) {
                    const pos = particles[i][j].current.position
                    positions.setXYZ(index, pos.x, pos.y, pos.z)
                }
                index++
            }
        }

        positions.needsUpdate = true
        meshRef.current.geometry.computeVertexNormals()
    })

    return (
        <>
            {/* Render particles */}
            {Array.from({ length: CLOTH_SEGMENTS + 1 }).map((_, i) =>
                Array.from({ length: CLOTH_SEGMENTS + 1 }).map((_, j) => {
                    const x = (j / CLOTH_SEGMENTS - 0.5) * CLOTH_SIZE
                    const z = (i / CLOTH_SEGMENTS - 0.5) * CLOTH_SIZE
                    const y = 3

                    // Fix top row corners
                    const isFixed = i === 0 && (j === 0 || j === CLOTH_SEGMENTS)

                    return (
                        <Particle
                            key={`${i}-${j}`}
                            position={[x, y, z]}
                            fixed={isFixed}
                            ref={(ref) => { particles[i][j] = ref }}
                        />
                    )
                })
            )}

            {/* Constraints */}
            <Constraints />

            {/* Visual mesh */}
            <mesh ref={meshRef} geometry={geometry}>
                <meshStandardMaterial color="#8844ff" side={THREE.DoubleSide} />
            </mesh>
        </>
    )
}

// Ground plane
function Ground() {
    const [ref] = usePlane(() => ({
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, -2, 0],
    }))

    return (
        <mesh ref={ref} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#222" />
        </mesh>
    )
}

// Interactive Ball
function Ball() {
    const [ref, api] = useSphere(() => ({
        mass: 1,
        position: [0, 5, 0],
        args: [0.5],
    }))

    return (
        <mesh ref={ref} castShadow onClick={() => api.applyImpulse([0, 5, 0], [0, 0, 0])}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial color="#ff4444" />
        </mesh>
    )
}

// Main scene
export default function ClothScene() {
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Canvas
                shadows
                camera={{ position: [2, 2, 5], fov: 50 }}
            >
                <color attach="background" args={['#111']} />

                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[5, 5, 5]}
                    intensity={1}
                    castShadow
                />

                <Physics gravity={[0, -9.81, 0]} iterations={20}>
                    <Cloth />
                    <Ground />
                    <Ball />
                </Physics>

                <OrbitControls />
            </Canvas>
        </div>
    )
}
