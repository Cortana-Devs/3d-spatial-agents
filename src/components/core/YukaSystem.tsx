import { useFrame } from '@react-three/fiber';
import { useGameStore } from "@/store/gameStore";
import AIManager from "@/systems/AIManager";
import { InterestMap } from '@/store/InterestMap';
import {
    perfBeginInterest,
    perfEndInterest,
    perfOnWorldFrame,
} from '@/debug/agentPerformanceProbe';

export default function YukaSystem() {
    const aiManager = AIManager.getInstance();

    useFrame((state, delta) => {
        // World simulation runs continuously — menus are overlays, not pause screens.
        aiManager.update(delta);
        const t0 = perfBeginInterest();
        InterestMap.getInstance().update(delta);
        perfEndInterest(t0);
        perfOnWorldFrame(delta);
    });

    return null; // Logic only, no visuals
}
