"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Stats } from "@react-three/drei";
import { Object3D, Vector3 } from "three";
import { useActiveAvatarModel } from "../../src/hooks/useActiveAvatarModel";
import useAvatarAnimator from "../../hooks/useAvatarAnimator";
import { ANIMATION_REGISTRY } from "../../data/animationRegistry";
import { SemanticKeys, getAnimationsByCategory, getIdleVariants, getTalkingVariants, getDanceEmotes } from "../../types/animationRegistry";

/**
 * Comprehensive Animation Testing System
 * =====================================
 *
 * Advanced testing interface for systematically testing all avatar animations.
 * Features organized categories, batch testing, performance monitoring, and detailed controls.
 */

interface ComprehensiveAnimationTesterProps {
  className?: string;
  style?: React.CSSProperties;
}

interface AnimationTestResult {
  key: string;
  name: string;
  status: 'pending' | 'playing' | 'success' | 'error';
  duration?: number;
  error?: string;
  startTime?: number;
}

interface TestSuite {
  name: string;
  animations: string[];
  description: string;
}

/**
 * Avatar component with animation system - MUST be inside Canvas
 */
function AnimatedAvatarMesh({
  onAnimatorReady,
  currentAnimation
}: {
  onAnimatorReady: (animator: any) => void;
  currentAnimation: string | null;
}) {
  const { modelUrl, avatarId } = useActiveAvatarModel();
  const { scene } = useGLTF(modelUrl);
  const avatarRef = useRef<Object3D>(null);

  const animator = useAvatarAnimator(avatarRef.current, {
    autoPreload: true,
    enableIdleCycling: false, // Disable auto cycling for testing
    enableMicroExpressions: false,
    performanceMode: "balanced",
    enableLogging: false, // Reduce spam during testing
  });

  useEffect(() => {
    if (avatarRef.current && scene) {
      avatarRef.current.clear();
      avatarRef.current.add(scene.clone());
    }
  }, [scene, avatarId]);

  useEffect(() => {
    if (onAnimatorReady && animator) {
      onAnimatorReady(animator);
    }
  }, [onAnimatorReady, animator]);

  return <primitive ref={avatarRef} object={new Object3D()} />;
}

/**
 * Animation Test Results Panel
 */
function TestResultsPanel({
  results,
  currentTest,
  onClearResults
}: {
  results: AnimationTestResult[];
  currentTest: string | null;
  onClearResults: () => void;
}) {
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const pendingCount = results.filter(r => r.status === 'pending').length;

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: '300px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '12px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 1000,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{ margin: 0, color: '#4CAF50' }}>Test Results</h3>
        <button
          onClick={onClearResults}
          style={{
            background: '#757575',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
        <div>✅ Success: {successCount}</div>
        <div>❌ Errors: {errorCount}</div>
        <div>⏳ Pending: {pendingCount}</div>
        <div>📊 Total: {results.length}</div>
      </div>

      {/* Current Test */}
      {currentTest && (
        <div style={{
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(33, 150, 243, 0.2)',
          borderRadius: '4px',
          border: '1px solid #2196F3'
        }}>
          <div style={{ fontWeight: 'bold', color: '#2196F3' }}>Currently Testing:</div>
          <div style={{ fontSize: '11px' }}>{currentTest}</div>
        </div>
      )}

      {/* Results List */}
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {results.map((result, index) => (
          <div
            key={index}
            style={{
              padding: '6px',
              margin: '4px 0',
              borderRadius: '4px',
              background: result.status === 'success' ? 'rgba(76, 175, 80, 0.2)' :
                         result.status === 'error' ? 'rgba(244, 67, 54, 0.2)' :
                         result.status === 'playing' ? 'rgba(33, 150, 243, 0.2)' :
                         'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${
                result.status === 'success' ? '#4CAF50' :
                result.status === 'error' ? '#f44336' :
                result.status === 'playing' ? '#2196F3' :
                '#666'
              }`
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
              {result.status === 'success' ? '✅' :
               result.status === 'error' ? '❌' :
               result.status === 'playing' ? '▶️' : '⏳'} {result.name}
            </div>
            {result.duration && (
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                Duration: {result.duration.toFixed(2)}s
              </div>
            )}
            {result.error && (
              <div style={{ fontSize: '10px', color: '#ff6b6b' }}>
                Error: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Animation Control Panel
 */
function AnimationControlPanel({
  animator,
  onTestAnimation,
  onRunTestSuite,
  onStopTest,
  isTestRunning
}: {
  animator: any;
  onTestAnimation: (key: string) => void;
  onRunTestSuite: (suite: TestSuite) => void;
  onStopTest: () => void;
  isTestRunning: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('locomotion');
  const [searchTerm, setSearchTerm] = useState('');

  if (!animator) {
    return (
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '12px',
      }}>
        Loading animator...
      </div>
    );
  }

  // Define test suites
  const testSuites: TestSuite[] = [
    {
      name: "Essential Locomotion",
      description: "Core movement animations",
      animations: [
        SemanticKeys.LOCOMOTION_IDLE_PRIMARY,
        SemanticKeys.LOCOMOTION_WALK_FORWARD_NORMAL,
        SemanticKeys.LOCOMOTION_JOG_FORWARD,
        SemanticKeys.LOCOMOTION_RUN_FORWARD,
        SemanticKeys.LOCOMOTION_CROUCH_IDLE,
      ]
    },
    {
      name: "All Idle Variants",
      description: "All idle animation variations",
      animations: getIdleVariants(ANIMATION_REGISTRY)
    },
    {
      name: "Walking Variations",
      description: "All walking animations",
      animations: [
        SemanticKeys.LOCOMOTION_WALK_FORWARD_NORMAL,
        SemanticKeys.LOCOMOTION_WALK_FORWARD_ALT,
        SemanticKeys.LOCOMOTION_WALK_BACKWARD,
        SemanticKeys.LOCOMOTION_WALK_STRAFE_LEFT,
        SemanticKeys.LOCOMOTION_WALK_STRAFE_RIGHT,
      ]
    },
    {
      name: "Running & Jogging",
      description: "All running and jogging animations",
      animations: [
        SemanticKeys.LOCOMOTION_JOG_FORWARD,
        SemanticKeys.LOCOMOTION_JOG_FORWARD_ALT,
        SemanticKeys.LOCOMOTION_JOG_BACKWARD,
        SemanticKeys.LOCOMOTION_RUN_FORWARD,
        SemanticKeys.LOCOMOTION_RUN_BACKWARD,
      ]
    },
    {
      name: "Expressions & Talking",
      description: "All facial expressions and talking animations",
      animations: [
        ...getTalkingVariants(ANIMATION_REGISTRY),
        SemanticKeys.EXPRESSION_FACE_NEUTRAL,
        SemanticKeys.EXPRESSION_FACE_HAPPY,
        SemanticKeys.EXPRESSION_FACE_SURPRISED,
        SemanticKeys.EXPRESSION_FACE_THINKING,
        SemanticKeys.EXPRESSION_FACE_CONFUSED,
        SemanticKeys.EXPRESSION_FACE_EXCITED,
      ]
    },
    {
      name: "Dance Emotes",
      description: "All dance and emote animations",
      animations: getDanceEmotes(ANIMATION_REGISTRY)
    },
    {
      name: "Complete Test Suite",
      description: "Test ALL animations in the registry",
      animations: Object.keys(ANIMATION_REGISTRY)
    }
  ];

  // Get animations by category
  const getAnimationsBySelectedCategory = () => {
    if (selectedCategory === 'all') {
      return Object.keys(ANIMATION_REGISTRY);
    }
    return getAnimationsByCategory(ANIMATION_REGISTRY, selectedCategory as any);
  };

  // Filter animations by search term
  const filteredAnimations = getAnimationsBySelectedCategory().filter(key =>
    key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.replace(/\./g, ' ').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      width: '350px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '12px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 1000,
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#4CAF50' }}>🧪 Animation Tester</h3>

      {/* Test Control */}
      <div style={{ marginBottom: '16px', padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
        {isTestRunning ? (
          <button
            onClick={onStopTest}
            style={{
              width: '100%',
              padding: '8px',
              background: '#f44336',
              border: 'none',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🛑 Stop Testing
          </button>
        ) : (
          <div style={{ color: '#4CAF50', fontSize: '11px' }}>
            ✅ Ready to test animations
          </div>
        )}
      </div>

      {/* Test Suites */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#FF9800' }}>Quick Test Suites:</h4>
        {testSuites.map((suite, index) => (
          <button
            key={index}
            onClick={() => onRunTestSuite(suite)}
            disabled={isTestRunning}
            style={{
              width: '100%',
              padding: '6px 8px',
              margin: '2px 0',
              background: isTestRunning ? '#666' : '#2196F3',
              border: 'none',
              color: 'white',
              borderRadius: '4px',
              cursor: isTestRunning ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              textAlign: 'left',
            }}
            title={suite.description}
          >
            🎯 {suite.name} ({suite.animations.length} animations)
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Category:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            background: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
          }}
        >
          <option value="locomotion">Locomotion</option>
          <option value="expression">Expressions</option>
          <option value="emote">Emotes</option>
          <option value="base">Base Poses</option>
          <option value="all">All Categories</option>
        </select>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Search:
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type to filter animations..."
          style={{
            width: '100%',
            padding: '4px',
            background: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Individual Animations */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#2196F3' }}>
          Individual Tests ({filteredAnimations.length} found):
        </h4>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {filteredAnimations.map((key) => (
            <button
              key={key}
              onClick={() => onTestAnimation(key)}
              disabled={isTestRunning}
              style={{
                width: '100%',
                padding: '4px 6px',
                margin: '1px 0',
                background: isTestRunning ? '#666' : '#4CAF50',
                border: 'none',
                color: 'white',
                borderRadius: '3px',
                cursor: isTestRunning ? 'not-allowed' : 'pointer',
                fontSize: '10px',
                textAlign: 'left',
              }}
              title={`Test ${key}`}
            >
              ▶️ {key.replace(/\./g, ' → ')}
            </button>
          ))}
        </div>
      </div>

      {/* Current State Info */}
      <div style={{
        padding: '8px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '4px',
        fontSize: '10px'
      }}>
        <div><strong>Current State:</strong></div>
        <div>Locomotion: {animator.state?.locomotion || 'unknown'}</div>
        <div>Expression: {animator.state?.expression || 'unknown'}</div>
        <div>Speed: {animator.state?.speed?.toFixed(2) || '0.00'}</div>
        <div>Ready: {animator.state?.isReady ? '✅' : '❌'}</div>
      </div>
    </div>
  );
}

/**
 * Main Scene Component
 */
function TestScene({ onAnimatorReady }: { onAnimatorReady: (animator: any) => void }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, 5, 5]} intensity={0.3} />

      {/* Environment */}
      <Environment preset="studio" />

      {/* Avatar */}
      <AnimatedAvatarMesh
        onAnimatorReady={onAnimatorReady}
        currentAnimation={null}
      />

      {/* Performance Stats */}
      <Stats />
    </>
  );
}

/**
 * Main Component
 */
export default function ComprehensiveAnimationTester({
  className,
  style = { width: "100%", height: "100vh" },
}: ComprehensiveAnimationTesterProps) {
  const [animator, setAnimator] = useState<any>(null);
  const [testResults, setTestResults] = useState<AnimationTestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [currentSuite, setCurrentSuite] = useState<TestSuite | null>(null);
  const [currentSuiteIndex, setCurrentSuiteIndex] = useState(0);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAnimatorReady = (animatorInstance: any) => {
    setAnimator(animatorInstance);
  };

  const addTestResult = (result: AnimationTestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const updateTestResult = (key: string, updates: Partial<AnimationTestResult>) => {
    setTestResults(prev =>
      prev.map(result =>
        result.key === key ? { ...result, ...updates } : result
      )
    );
  };

  const testSingleAnimation = async (key: string): Promise<boolean> => {
    if (!animator) return false;

    const animationName = key.replace(/\./g, ' → ');
    const startTime = performance.now();

    // Add pending result
    addTestResult({
      key,
      name: animationName,
      status: 'pending',
      startTime,
    });

    try {
      // Update to playing
      updateTestResult(key, { status: 'playing' });
      setCurrentTest(animationName);

      // Try to play the animation
      await new Promise<void>((resolve, reject) => {
        try {
          // Attempt different animation methods based on the animation type
          if (key.includes('locomotion.idle')) {
            animator.setLocomotionState('idle');
          } else if (key.includes('locomotion.walk')) {
            animator.setLocomotionState('walking');
          } else if (key.includes('locomotion.jog')) {
            animator.setLocomotionState('jogging');
          } else if (key.includes('locomotion.run')) {
            animator.setLocomotionState('running');
          } else if (key.includes('locomotion.crouch')) {
            animator.setLocomotionState('crouching');
          } else if (key.includes('expression.talk')) {
            animator.startTalking(0.5);
          } else if (key.includes('expression.face')) {
            const emotion = key.split('.').pop();
            animator.setExpressionState(emotion);
          } else if (key.includes('emote.dance')) {
            const danceType = key.includes('casual') ? 'dance-casual' :
                             key.includes('energetic') ? 'dance-energetic' :
                             key.includes('rhythmic') ? 'dance-rhythmic' :
                             'dance-freestyle';
            animator.setEmoteState(danceType);
          } else {
            // Try direct animation play
            animator.playAnimation(key, 'fullbody', 0.3);
          }

          // Wait for animation to start (simulate testing duration)
          setTimeout(() => resolve(), 2000);
        } catch (error) {
          reject(error);
        }
      });

      const duration = (performance.now() - startTime) / 1000;
      updateTestResult(key, {
        status: 'success',
        duration,
      });

      return true;
    } catch (error) {
      const duration = (performance.now() - startTime) / 1000;
      updateTestResult(key, {
        status: 'error',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  };

  const runTestSuite = async (suite: TestSuite) => {
    if (!animator || isTestRunning) return;

    setIsTestRunning(true);
    setCurrentSuite(suite);
    setCurrentSuiteIndex(0);

    for (let i = 0; i < suite.animations.length; i++) {
      if (!isTestRunning) break; // Check if test was stopped

      setCurrentSuiteIndex(i);
      const key = suite.animations[i];

      await testSingleAnimation(key);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsTestRunning(false);
    setCurrentTest(null);
    setCurrentSuite(null);
  };

  const handleTestAnimation = async (key: string) => {
    if (isTestRunning) return;

    setIsTestRunning(true);
    await testSingleAnimation(key);
    setIsTestRunning(false);
    setCurrentTest(null);
  };

  const handleStopTest = () => {
    setIsTestRunning(false);
    setCurrentTest(null);
    setCurrentSuite(null);
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }
  };

  const handleClearResults = () => {
    setTestResults([]);
  };

  return (
    <div className={className} style={{ ...style, position: "relative", background: '#000' }}>
      {/* Control Panel */}
      <AnimationControlPanel
        animator={animator}
        onTestAnimation={handleTestAnimation}
        onRunTestSuite={runTestSuite}
        onStopTest={handleStopTest}
        isTestRunning={isTestRunning}
      />

      {/* Results Panel */}
      <TestResultsPanel
        results={testResults}
        currentTest={currentTest}
        onClearResults={handleClearResults}
      />

      {/* Progress Indicator */}
      {currentSuite && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          zIndex: 1000,
        }}>
          Testing {currentSuite.name}: {currentSuiteIndex + 1} / {currentSuite.animations.length}
          <div style={{
            width: '200px',
            height: '4px',
            background: '#333',
            borderRadius: '2px',
            marginTop: '4px',
          }}>
            <div style={{
              width: `${((currentSuiteIndex + 1) / currentSuite.animations.length) * 100}%`,
              height: '100%',
              background: '#4CAF50',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 1.6, 4], fov: 50 }}
      >
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 1, 0]}
        />

        <TestScene onAnimatorReady={handleAnimatorReady} />
      </Canvas>
    </div>
  );
}
