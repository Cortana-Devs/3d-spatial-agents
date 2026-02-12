import { useFrame } from '@react-three/fiber';
import { useGameStore } from "@/store/gameStore";
import AIManager from './AIManager';

export default function YukaSystem() {
    const aiManager = AIManager.getInstance();
    const isMenuOpen = useGameStore((state) => state.isMenuOpen);
    const isMenuPanelOpen = useGameStore((state) => state.isMenuPanelOpen);

    useFrame((state, delta) => {
        if (isMenuOpen || isMenuPanelOpen) return;
        // Update the global AI manager
        // Yuka handles its own internal time, but we pass delta for smooth updates
        aiManager.update(delta);
    });

    return null; // Logic only, no visuals
}
