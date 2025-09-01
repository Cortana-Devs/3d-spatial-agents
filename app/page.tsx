export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-axiom-primary-50 to-axiom-primary-100 dark:from-axiom-neutral-900 dark:to-axiom-neutral-950 flex items-center justify-center p-8">
      <div className="floating-panel max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-axiom-primary bg-gradient-to-r from-axiom-primary-600 to-axiom-glow-purple bg-clip-text text-transparent">
          Descendants™
        </h1>
        <p className="text-lg text-axiom-neutral-700 dark:text-axiom-neutral-300">
          A Living Metaverse Editor
        </p>
        <div className="space-y-4">
          <div className="glow-effect-purple p-4 rounded-lg bg-axiom-primary-500/10 border border-axiom-primary-300/20">
            <h2 className="text-xl font-semibold text-axiom-primary-700 dark:text-axiom-primary-300 mb-2">
              Tailwind CSS 4.1 Setup Complete ✅
            </h2>
            <p className="text-axiom-neutral-600 dark:text-axiom-neutral-400">
              CSS-based configuration with Axiom Design System colors and animations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="interactive-hover p-4 rounded-lg bg-axiom-glow-cyan/10 border border-axiom-glow-cyan/20">
              <div className="w-8 h-8 bg-axiom-glow-cyan rounded-full mx-auto mb-2 animate-glow-pulse"></div>
              <p className="text-sm text-axiom-neutral-700 dark:text-axiom-neutral-300">Glow Effects</p>
            </div>
            <div className="interactive-hover p-4 rounded-lg bg-axiom-glow-green/10 border border-axiom-glow-green/20">
              <div className="w-8 h-8 bg-axiom-glow-green rounded-full mx-auto mb-2 animate-float"></div>
              <p className="text-sm text-axiom-neutral-700 dark:text-axiom-neutral-300">Float Animation</p>
            </div>
            <div className="interactive-hover p-4 rounded-lg bg-axiom-glow-amber/10 border border-axiom-glow-amber/20">
              <div className="w-8 h-8 bg-gradient-to-r from-axiom-glow-amber to-axiom-glow-pink rounded-full mx-auto mb-2 animate-shimmer bg-size-200"></div>
              <p className="text-sm text-axiom-neutral-700 dark:text-axiom-neutral-300">Shimmer Effect</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
