import { useFrame } from '@react-three/fiber';
import { useGameStore } from "@/store/gameStore";
import AIManager from './AIManager';
import { InterestMap } from '@/store/InterestMap';

export default function YukaSystem() {
    const aiManager = AIManager.getInstance();
    const isMenuOpen = useGameStore((state) => state.isMenuOpen);
    const isMenuPanelOpen = useGameStore((state) => state.isMenuPanelOpen);

    useFrame((state, delta) => {
        if (isMenuOpen || isMenuPanelOpen) return;
        // Update the global AI manager
        aiManager.update(delta);
        
        // Update the environmental interest heatmap
        InterestMap.getInstance().update(delta);
    });

    return null; // Logic only, no visuals
}
