import { useFrame } from '@react-three/fiber';
import { useGameStore } from "@/store/gameStore";
import AIManager from "@/systems/AIManager";
import { InterestMap } from '@/store/InterestMap';

export default function YukaSystem() {
    const aiManager = AIManager.getInstance();

    useFrame((state, delta) => {
        // World simulation runs continuously — menus are overlays, not pause screens.
        aiManager.update(delta);
        InterestMap.getInstance().update(delta);
    });

    return null; // Logic only, no visuals
}
