/**
 * Quick Gender Resolution Test
 * ============================
 *
 * This script tests if the animation registry is properly resolving
 * feminine vs masculine animation paths for critical animations.
 */

const { ANIMATION_REGISTRY } = require('../data/animationRegistry.ts');
const { SemanticKeys, resolveAnimationPath } = require('../types/animationRegistry.ts');

console.log('🔍 Testing Animation Gender Resolution...\n');

// Critical animations to test
const criticalAnimations = [
  'locomotion.idle.primary',
  'locomotion.walk.forward.normal',
  'locomotion.run.forward',
  'expression.talk.variant.1',
  'emote.dance.casual.1'
];

console.log('📋 Testing Critical Animations:\n');

criticalAnimations.forEach(semanticKey => {
  console.log(`🎭 ${semanticKey}:`);

  const registryEntry = ANIMATION_REGISTRY[semanticKey];

  if (!registryEntry) {
    console.log(`  ❌ NOT FOUND IN REGISTRY`);
    return;
  }

  console.log(`  Registry Entry:`, {
    feminine: registryEntry.feminine || '❌ MISSING',
    masculine: registryEntry.masculine || '❌ MISSING',
    category: registryEntry.meta.category,
    priority: registryEntry.meta.priority
  });

  // Test resolution for both genders
  const femininePath = resolveAnimationPath(ANIMATION_REGISTRY, semanticKey, 'feminine');
  const masculinePath = resolveAnimationPath(ANIMATION_REGISTRY, semanticKey, 'masculine');

  console.log(`  Resolution:`);
  console.log(`    Feminine: ${femininePath || '❌ NO PATH'}`);
  console.log(`    Masculine: ${masculinePath || '❌ NO PATH'}`);

  // Check if files should exist
  if (femininePath && !femininePath.includes('feminine/glb/')) {
    console.log(`    ⚠️  Feminine path doesn't contain 'feminine/glb/'`);
  }
  if (masculinePath && !masculinePath.includes('masculine/glb/')) {
    console.log(`    ⚠️  Masculine path doesn't contain 'masculine/glb/'`);
  }

  console.log('');
});

// Test overall registry structure
console.log('📊 Registry Analysis:');
const totalEntries = Object.keys(ANIMATION_REGISTRY).length;
let femininePaths = 0;
let masculinePaths = 0;
let bothPaths = 0;
let neitherPaths = 0;

Object.values(ANIMATION_REGISTRY).forEach(entry => {
  const hasFeminine = !!entry.feminine;
  const hasMasculine = !!entry.masculine;

  if (hasFeminine) femininePaths++;
  if (hasMasculine) masculinePaths++;
  if (hasFeminine && hasMasculine) bothPaths++;
  if (!hasFeminine && !hasMasculine) neitherPaths++;
});

console.log(`  Total registry entries: ${totalEntries}`);
console.log(`  Entries with feminine paths: ${femininePaths}`);
console.log(`  Entries with masculine paths: ${masculinePaths}`);
console.log(`  Entries with both paths: ${bothPaths}`);
console.log(`  Entries with neither path: ${neitherPaths}`);

if (neitherPaths > 0) {
  console.log(`  ⚠️  ${neitherPaths} entries have no animation paths!`);
}

console.log('\n✅ Gender resolution test complete.');
