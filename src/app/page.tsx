import Scene from '@/components/core/Scene';
import Overlay from '@/components/ui/hud/Overlay';
import CustomLoader from '@/components/ui/CustomLoader';

export default function Home() {
  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Scene />
      <CustomLoader />
      <Overlay />
    </main>
  );
}
