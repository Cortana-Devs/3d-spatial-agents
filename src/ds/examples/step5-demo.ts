/**
 * Step 5 Vector Index Demo
 * Demonstrates vector similarity search capabilities
 */

import {
  createVectorManager,
  createLinearVectorIndex,
  VectorUtils,
  VectorItem
} from '../vector';

export function demonstrateVectorSearch() {
  console.log('\n🎯 Step 5: Vector Index Demonstration');
  console.log('='.repeat(50));

  // Create a vector manager for 128-dimensional vectors
  const vectorManager = createVectorManager(128, {
    preferredStrategy: 'linear',
    autoOptimize: true,
    optimizationThreshold: 1000
  });

  // Generate some example vectors (simulating embeddings)
  const documents: VectorItem[] = [
    {
      id: 'doc_tech_1',
      vector: VectorUtils.normalize(Array.from({length: 128}, () => Math.random() + 0.5)), // Tech-heavy
      metadata: { type: 'technical', topic: 'algorithms', importance: 0.9 }
    },
    {
      id: 'doc_tech_2', 
      vector: VectorUtils.normalize(Array.from({length: 128}, () => Math.random() + 0.4)), // Similar to tech_1
      metadata: { type: 'technical', topic: 'data_structures', importance: 0.8 }
    },
    {
      id: 'doc_story_1',
      vector: VectorUtils.normalize(Array.from({length: 128}, () => Math.random() - 0.2)), // Different pattern
      metadata: { type: 'narrative', topic: 'adventure', importance: 0.7 }
    },
    {
      id: 'doc_story_2',
      vector: VectorUtils.normalize(Array.from({length: 128}, () => Math.random() - 0.1)), // Similar to story_1
      metadata: { type: 'narrative', topic: 'quest', importance: 0.6 }
    },
    {
      id: 'doc_memory_1',
      vector: VectorUtils.normalize(Array.from({length: 128}, () => Math.random() * 0.3)), // Neutral
      metadata: { type: 'episodic', topic: 'location', importance: 0.5 }
    }
  ];

  // Add all documents
  console.log('Adding documents to vector index...');
  documents.forEach(doc => vectorManager.add(doc));
  
  console.log(`Added ${vectorManager.size()} documents`);
  console.log('Debug info:', vectorManager.debug());

  // Perform similarity searches
  console.log('\n🔍 Similarity Search Examples:');
  
  // Search for technical content
  const techQuery = documents[0].vector; // Use first tech doc as query
  const techResults = vectorManager.search({
    vector: techQuery,
    k: 3,
    threshold: 0.1,
    filter: (item) => item.metadata?.type === 'technical'
  });

  console.log('\nTechnical content search:');
  techResults.forEach(result => {
    console.log(`  ${result.item.id}: ${result.similarity.toFixed(3)} similarity`);
  });

  // Search for all content with high similarity
  const generalResults = vectorManager.search({
    vector: techQuery,
    k: 5,
    threshold: 0.0
  });

  console.log('\nGeneral similarity search:');
  generalResults.forEach(result => {
    console.log(`  ${result.item.id}: ${result.similarity.toFixed(3)} similarity`);
  });

  // Demonstrate vector utilities
  console.log('\n📐 Vector Utilities:');
  const vec1 = [1, 0, 0];
  const vec2 = [0, 1, 0];
  const vec3 = [1, 1, 0];

  console.log(`Cosine similarity [1,0,0] vs [0,1,0]: ${VectorUtils.cosineSimilarity(vec1, vec2).toFixed(3)}`);
  console.log(`Cosine similarity [1,0,0] vs [1,1,0]: ${VectorUtils.cosineSimilarity(vec1, vec3).toFixed(3)}`);
  console.log(`Euclidean distance [1,0,0] vs [0,1,0]: ${VectorUtils.euclideanDistance(vec1, vec2).toFixed(3)}`);
  console.log(`Vector magnitude [1,1,0]: ${VectorUtils.magnitude(vec3).toFixed(3)}`);

  // Test performance with batch operations
  console.log('\n⚡ Performance Testing:');
  const batchSize = 1000;
  const batchVectors: VectorItem[] = [];
  
  for (let i = 0; i < batchSize; i++) {
    batchVectors.push({
      id: `batch_${i}`,
      vector: VectorUtils.random(128, true),
      metadata: { batch: true, index: i }
    });
  }

  const batchStart = performance.now();
  vectorManager.addBatch(batchVectors);
  const batchTime = performance.now() - batchStart;

  console.log(`Added ${batchSize} vectors in ${batchTime.toFixed(2)}ms`);
  console.log(`Final index size: ${vectorManager.size()}`);

  // Test search performance
  const searchStart = performance.now();
  const searchResults = vectorManager.search({
    vector: VectorUtils.random(128, true),
    k: 10,
    threshold: 0.5
  });
  const searchTime = performance.now() - searchStart;

  console.log(`Search in ${vectorManager.size()} vectors took ${searchTime.toFixed(2)}ms`);
  console.log(`Found ${searchResults.length} results above threshold 0.5`);

  // Performance recommendation
  const recommendation = vectorManager.getPerformanceRecommendation();
  console.log('\n💡 Performance Recommendation:');
  console.log(`  Strategy: ${recommendation.recommendedStrategy}`);
  console.log(`  Reason: ${recommendation.reason}`);

  return {
    vectorManager,
    documents,
    batchVectors,
    performanceData: {
      batchTime,
      searchTime,
      itemCount: vectorManager.size()
    }
  };
}

// Export for use in other modules
export { demonstrateVectorSearch };
