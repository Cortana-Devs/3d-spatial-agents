import { useFrame } from '@react-three/fiber';
import AIManager from './AIManager';

export default function YukaSystem() {
    const aiManager = AIManager.getInstance();

    useFrame((state, delta) => {
        // Update the global AI manager
        // Yuka handles its own internal time, but we pass delta for smooth updates
        aiManager.update(delta);
    });

    return null; // Logic only, no visuals
}
