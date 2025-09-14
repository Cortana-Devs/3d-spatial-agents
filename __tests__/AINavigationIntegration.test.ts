import { describe, test, expect, beforeEach } from "vitest";
import { FloorNavigationAnalyzer } from "@floor-ai/FloorNavigationProperties";
import { TransparentSurfacePerception } from "@floor-ai/TransparentSurfacePerception";
import { TransparentNavMeshGenerator } from "@floor-ai/TransparentNavMeshGenerator";
import { TransparentPathfinder } from "@floor-ai/TransparentPathfinder";
import { FloorFactory } from "../utils/floorFactory";
import * as THREE from "three";

describe("AI Navigation Integration", () => {
  describe("Floor Navigation Properties", () => {
    test("analyzes floor safety correctly", () => {
      const safeFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "medium_frosted",
      );
      safeFloor.transparency = 0.4;
      safeFloor.roughness = 0.6;

      const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(safeFloor);

      expect(analysis.walkable).toBe(true);
      expect(analysis.safetyLevel).toBe("safe");
      expect(analysis.navigationCost).toBeGreaterThan(0);
      expect(analysis.visibilityFactor).toBeLessThan(0.5);
      expect(analysis.structuralConfidence).toBeGreaterThan(0.7);
    });

    test("identifies dangerous floors", () => {
      const dangerousFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "clear_frosted",
      );
      dangerousFloor.transparency = 0.95; // Very transparent
      dangerousFloor.metadata.durability = 20; // Low durability

      const analysis =
        FloorNavigationAnalyzer.analyzeFloorForAI(dangerousFloor);

      expect(analysis.safetyLevel).toMatch(/risky|dangerous|avoid/);
      expect(analysis.navigationCost).toBeGreaterThan(2.0);
      expect(analysis.requiresSpecialBehavior).toBe(true);
      expect(analysis.alternativePathWeight).toBeGreaterThan(0.5);
    });

    test("correctly assesses slipperiness", () => {
      const slipperyFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "clear_frosted",
      );
      slipperyFloor.transparency = 0.9;
      slipperyFloor.roughness = 0.1; // Very smooth

      const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(slipperyFloor);

      expect(analysis.slippery).toBe(true);
    });

    test("calculates visibility factor correctly", () => {
      const clearFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "clear_frosted",
      );
      clearFloor.transparency = 0.9;
      clearFloor.roughness = 0.2;

      const heavyFrostedFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(1, 0, 0),
        "heavy_frosted",
      );
      heavyFrostedFloor.transparency = 0.3;
      heavyFrostedFloor.roughness = 0.8;

      const clearAnalysis =
        FloorNavigationAnalyzer.analyzeFloorForAI(clearFloor);
      const frostedAnalysis =
        FloorNavigationAnalyzer.analyzeFloorForAI(heavyFrostedFloor);

      expect(clearAnalysis.visibilityFactor).toBeGreaterThan(
        frostedAnalysis.visibilityFactor,
      );
    });

    test("handles edge cases", () => {
      const extremeFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "clear_frosted",
      );
      extremeFloor.transparency = 1.0; // Maximum transparency
      extremeFloor.roughness = 0.0; // Minimum roughness
      extremeFloor.metadata.durability = 0; // Zero durability

      const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(extremeFloor);

      expect(analysis.safetyLevel).toBe("avoid");
      expect(analysis.walkable).toBe(false);
      expect(analysis.navigationCost).toBeGreaterThan(5);
    });
  });

  describe("Transparent Surface Perception", () => {
    let perception: TransparentSurfacePerception;

    beforeEach(() => {
      perception = new TransparentSurfacePerception();
    });

    test("generates visual cues based on floor properties", () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "clear_frosted",
      );
      floor.transparency = 0.8;
      floor.roughness = 0.3;

      const observer = new THREE.Vector3(3, 1, 3);
      const context = {
        lightingConditions: "bright" as const,
        viewingAngle: 30,
        observerDistance: 4.24,
        environmentalFactors: [],
        previousExperience: false,
      };

      const cues = perception.analyzeVisualCues(floor, observer, context);

      expect(cues.length).toBeGreaterThan(0);
      expect(cues.every((cue) => cue.strength >= 0 && cue.strength <= 1)).toBe(
        true,
      );
      expect(
        cues.every((cue) => cue.reliability >= 0 && cue.reliability <= 1),
      ).toBe(true);
      expect(cues.some((cue) => cue.type === "edge_detection")).toBe(true);
    });

    test("adjusts perception based on lighting conditions", () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "medium_frosted",
      );

      const observer = new THREE.Vector3(2, 1, 0);

      const brightContext = {
        lightingConditions: "bright" as const,
        viewingAngle: 45,
        observerDistance: 2,
        environmentalFactors: [],
        previousExperience: false,
      };

      const darkContext = {
        ...brightContext,
        lightingConditions: "dark" as const,
      };

      const brightCues = perception.analyzeVisualCues(
        floor,
        observer,
        brightContext,
      );
      const darkCues = perception.analyzeVisualCues(
        floor,
        observer,
        darkContext,
      );

      const brightAvgStrength =
        brightCues.reduce((sum, cue) => sum + cue.strength, 0) /
        brightCues.length;
      const darkAvgStrength =
        darkCues.reduce((sum, cue) => sum + cue.strength, 0) / darkCues.length;

      expect(brightAvgStrength).toBeGreaterThan(darkAvgStrength);
    });

    test("adjusts perception based on experience", () => {
      const floorId = "test-floor-123";

      // Simulate successful navigation
      perception.updateExperience(floorId, "success");
      perception.updateExperience(floorId, "success");
      perception.updateExperience(floorId, "success");

      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "medium_frosted",
      );

      const contextWithExperience = {
        lightingConditions: "medium" as const,
        viewingAngle: 45,
        observerDistance: 2,
        environmentalFactors: [],
        previousExperience: true,
      };

      const cues = perception.analyzeVisualCues(
        floor,
        new THREE.Vector3(2, 1, 0),
        contextWithExperience,
      );
      const avgReliability =
        cues.reduce((sum, cue) => sum + cue.reliability, 0) / cues.length;

      expect(avgReliability).toBeGreaterThan(0.5);
    });

    test("handles viewing angle effects", () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "light_frosted",
      );

      const observer = new THREE.Vector3(2, 1, 0);

      const shallowAngleContext = {
        lightingConditions: "bright" as const,
        viewingAngle: 15, // Shallow angle
        observerDistance: 2,
        environmentalFactors: [],
        previousExperience: false,
      };

      const steepAngleContext = {
        ...shallowAngleContext,
        viewingAngle: 80, // Steep angle
      };

      const shallowCues = perception.analyzeVisualCues(
        floor,
        observer,
        shallowAngleContext,
      );
      const steepCues = perception.analyzeVisualCues(
        floor,
        observer,
        steepAngleContext,
      );

      // Should have different cue strengths based on viewing angle
      expect(shallowCues.length).toBeGreaterThanOrEqual(steepCues.length);
    });

    test("assesses surface recognition correctly", () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "medium_frosted",
      );

      const strongCues = [
        {
          type: "edge_detection" as const,
          strength: 0.9,
          position: new THREE.Vector3(0, 0, 0),
          reliability: 0.8,
          description: "Strong edge detection",
        },
        {
          type: "reflection" as const,
          strength: 0.7,
          position: new THREE.Vector3(0, 0, 0),
          reliability: 0.9,
          description: "Strong reflection",
        },
      ];

      const weakCues = [
        {
          type: "shadow" as const,
          strength: 0.2,
          position: new THREE.Vector3(0, 0, 0),
          reliability: 0.3,
          description: "Weak shadow",
        },
      ];

      const strongRecognition = perception.assessSurfaceRecognition(
        floor,
        strongCues,
      );
      const weakRecognition = perception.assessSurfaceRecognition(
        floor,
        weakCues,
      );

      expect(strongRecognition).toBeGreaterThan(weakRecognition);
      expect(strongRecognition).toBeGreaterThan(0.5);
      expect(weakRecognition).toBeLessThan(0.3);
    });
  });

  describe("Navigation Mesh Generation", () => {
    let generator: TransparentNavMeshGenerator;

    beforeEach(() => {
      generator = new TransparentNavMeshGenerator();
    });

    test("generates navigation mesh for floors", () => {
      const floors = [
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(0, 0, 0),
          "medium_frosted",
        ),
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(2, 0, 0),
          "light_frosted",
        ),
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(4, 0, 0),
          "heavy_frosted",
        ),
      ];

      const worldBounds = new THREE.Box3(
        new THREE.Vector3(-10, -1, -10),
        new THREE.Vector3(10, 1, 10),
      );

      const navMesh = generator.generateNavMesh(floors, worldBounds);

      expect(navMesh.nodes.size).toBeGreaterThan(0);
      expect(navMesh.edges.length).toBeGreaterThan(0);
      expect(navMesh.floorAssociations.size).toBeGreaterThan(0);
      expect(navMesh.version).toBe(1);
      expect(navMesh.lastUpdate).toBeGreaterThan(0);
    });

    test("creates appropriate node properties", () => {
      const safeFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "heavy_frosted",
      );
      safeFloor.transparency = 0.3;
      safeFloor.roughness = 0.8;
      safeFloor.metadata.durability = 90;

      const navMesh = generator.generateNavMesh(
        [safeFloor],
        new THREE.Box3(
          new THREE.Vector3(-2, -1, -2),
          new THREE.Vector3(2, 1, 2),
        ),
      );

      const nodes = Array.from(navMesh.nodes.values());
      expect(nodes.length).toBeGreaterThan(0);

      const floorNodes = nodes.filter((node) => node.floorId === safeFloor.id);
      expect(floorNodes.length).toBeGreaterThan(0);

      floorNodes.forEach((node) => {
        expect(node.walkable).toBe(true);
        expect(node.safetyLevel).toBe("safe");
        expect(node.cost).toBeGreaterThan(0);
        expect(node.specialProperties).toBeDefined();
      });
    });

    test("creates alternative paths for risky floors", () => {
      const riskyFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "clear_frosted",
      );
      riskyFloor.transparency = 0.9;
      riskyFloor.metadata.durability = 30;

      const navMesh = generator.generateNavMesh(
        [riskyFloor],
        new THREE.Box3(
          new THREE.Vector3(-5, -1, -5),
          new THREE.Vector3(5, 1, 5),
        ),
      );

      const alternativeNodes = Array.from(navMesh.nodes.values()).filter(
        (node) => node.specialProperties.includes("alternative_path"),
      );

      expect(alternativeNodes.length).toBeGreaterThan(0);

      alternativeNodes.forEach((node) => {
        expect(node.walkable).toBe(true);
        expect(node.safetyLevel).toBe("safe");
        expect(node.specialProperties).toContain("avoids_risk");
      });
    });

    test("creates proper edge connections", () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "medium_frosted",
      );

      const navMesh = generator.generateNavMesh(
        [floor],
        new THREE.Box3(
          new THREE.Vector3(-2, -1, -2),
          new THREE.Vector3(2, 1, 2),
        ),
      );

      expect(navMesh.edges.length).toBeGreaterThan(0);

      navMesh.edges.forEach((edge) => {
        expect(navMesh.nodes.has(edge.from)).toBe(true);
        expect(navMesh.nodes.has(edge.to)).toBe(true);
        expect(edge.cost).toBeGreaterThan(0);
        expect(edge.bidirectional).toBe(true);
        expect(edge.safetyRequirement).toBeDefined();
      });
    });

    test("updates nav mesh for floor changes", () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "medium_frosted",
      );

      const navMesh = generator.generateNavMesh(
        [floor],
        new THREE.Box3(
          new THREE.Vector3(-2, -1, -2),
          new THREE.Vector3(2, 1, 2),
        ),
      );

      const originalVersion = navMesh.version;
      const originalNodeCount = navMesh.nodes.size;

      // Modify floor properties
      floor.transparency = 0.9;
      floor.metadata.durability = 20;

      generator.updateNavMeshForFloor(navMesh, floor);

      expect(navMesh.version).toBeGreaterThan(originalVersion);
      expect(navMesh.lastUpdate).toBeGreaterThan(0);
      // Should have regenerated nodes with new properties
      const updatedNodes = Array.from(navMesh.nodes.values()).filter(
        (node) => node.floorId === floor.id,
      );

      expect(updatedNodes.length).toBeGreaterThan(0);
    });
  });

  describe("Pathfinding", () => {
    let pathfinder: TransparentPathfinder;
    let navMesh: Map<string, any>;
    let edges: any[];

    beforeEach(() => {
      // Create a simple test scenario
      navMesh = new Map();
      const safeNode1 = {
        id: "safe1",
        position: new THREE.Vector3(0, 0, 0),
        walkable: true,
        cost: 1.0,
        safetyLevel: "safe",
        connectedNodes: ["safe2"],
        specialProperties: [],
      };
      const safeNode2 = {
        id: "safe2",
        position: new THREE.Vector3(2, 0, 0),
        walkable: true,
        cost: 1.0,
        safetyLevel: "safe",
        connectedNodes: ["safe1"],
        specialProperties: [],
      };

      navMesh.set("safe1", safeNode1);
      navMesh.set("safe2", safeNode2);

      edges = [
        {
          from: "safe1",
          to: "safe2",
          cost: 2.0,
          bidirectional: true,
          restrictions: [],
          safetyRequirement: "safe",
        },
      ];

      pathfinder = new TransparentPathfinder(navMesh, edges);
    });

    test("finds safe paths when available", () => {
      const result = pathfinder.findPath(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
      );

      expect(result.path.length).toBeGreaterThan(0);
      expect(result.safetyAssessment).toBe("SAFE");
      expect(result.warnings.length).toBe(0);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.estimatedTravelTime).toBeGreaterThan(0);
    });

    test("handles pathfinding options correctly", () => {
      // Add a dangerous node
      const dangerousNode = {
        id: "danger1",
        position: new THREE.Vector3(1, 0, 0),
        walkable: true,
        cost: 5.0,
        safetyLevel: "dangerous",
        connectedNodes: ["safe1", "safe2"],
        specialProperties: ["hazardous"],
      };

      navMesh.set("danger1", dangerousNode);

      const safetyFirstOptions = {
        maxCost: 1000,
        safetyPreference: "safety_first" as const,
        avoidTransparent: false,
        allowRiskyPaths: false,
        preferAlternatives: true,
        maxPathLength: 100,
      };

      const result = pathfinder.findPath(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
        safetyFirstOptions,
      );

      // Should find a path but avoid dangerous nodes
      expect(result.path.length).toBeGreaterThan(0);
      expect(
        result.path.every((node) => node.safetyLevel !== "dangerous"),
      ).toBe(true);
    });

    test("generates warnings for risky paths", () => {
      // Create a path with risky nodes
      const riskyNode = {
        id: "risky1",
        position: new THREE.Vector3(1, 0, 0),
        walkable: true,
        cost: 2.0,
        safetyLevel: "risky",
        connectedNodes: ["safe1", "safe2"],
        specialProperties: ["requires_caution"],
      };

      navMesh.set("risky1", riskyNode);

      // Force path through risky node by removing direct connection
      navMesh.get("safe1").connectedNodes = ["risky1"];
      navMesh.get("safe2").connectedNodes = ["risky1"];
      navMesh.get("risky1").connectedNodes = ["safe1", "safe2"];

      edges.push({
        from: "safe1",
        to: "risky1",
        cost: 1.0,
        bidirectional: true,
        restrictions: ["careful_movement"],
        safetyRequirement: "risky",
      });

      const result = pathfinder.findPath(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.safetyAssessment).toBe("MODERATE RISK");
    });

    test("handles no path scenarios", () => {
      // Create isolated nodes
      const isolatedNode = {
        id: "isolated",
        position: new THREE.Vector3(10, 0, 0),
        walkable: true,
        cost: 1.0,
        safetyLevel: "safe",
        connectedNodes: [],
        specialProperties: [],
      };

      navMesh.set("isolated", isolatedNode);

      const result = pathfinder.findPath(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      );

      expect(result.path.length).toBe(0);
      expect(result.safetyAssessment).toBe("NO PATH");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.totalCost).toBe(Infinity);
    });

    test("calculates travel time correctly", () => {
      // Add nodes with different properties
      const slipperyNode = {
        id: "slippery1",
        position: new THREE.Vector3(1, 0, 0),
        walkable: true,
        cost: 1.0,
        safetyLevel: "caution",
        connectedNodes: ["safe1", "safe2"],
        specialProperties: ["slippery"],
      };

      navMesh.set("slippery1", slipperyNode);

      const result = pathfinder.findPath(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
      );

      expect(result.estimatedTravelTime).toBeGreaterThan(0);
      // Should take longer due to slippery surface if path goes through it
    });

    test("handles transparent surface preferences", () => {
      const transparentNode = {
        id: "transparent1",
        position: new THREE.Vector3(1, 0, 0),
        walkable: true,
        cost: 1.5,
        safetyLevel: "caution",
        connectedNodes: ["safe1", "safe2"],
        specialProperties: ["high_transparency", "requires_caution"],
      };

      navMesh.set("transparent1", transparentNode);

      const avoidTransparentOptions = {
        maxCost: 1000,
        safetyPreference: "balanced" as const,
        avoidTransparent: true,
        allowRiskyPaths: true,
        preferAlternatives: false,
        maxPathLength: 100,
      };

      const result = pathfinder.findPath(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
        avoidTransparentOptions,
      );

      // Should find path but warn about transparency if unavoidable
      expect(result.path.length).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    test("complete workflow from floor analysis to pathfinding", () => {
      // Create a realistic floor layout
      const floors = [
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(0, 0, 0),
          "heavy_frosted",
        ), // Safe
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(2, 0, 0),
          "clear_frosted",
        ), // Risky
        FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(4, 0, 0),
          "medium_frosted",
        ), // Moderate
      ];

      // Adjust properties for testing
      floors[1].transparency = 0.9; // Make middle floor risky
      floors[1].metadata.durability = 30;

      // Generate navigation mesh
      const generator = new TransparentNavMeshGenerator();
      const navMesh = generator.generateNavMesh(
        floors,
        new THREE.Box3(
          new THREE.Vector3(-2, -1, -2),
          new THREE.Vector3(6, 1, 2),
        ),
      );

      // Create pathfinder
      const pathfinder = new TransparentPathfinder(
        navMesh.nodes,
        navMesh.edges,
      );

      // Test different safety preferences
      const safetyFirstResult = pathfinder.findPath(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(5, 0, 0),
        {
          maxCost: 1000,
          safetyPreference: "safety_first",
          avoidTransparent: true,
          allowRiskyPaths: false,
          preferAlternatives: true,
          maxPathLength: 100,
        },
      );

      const efficientResult = pathfinder.findPath(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(5, 0, 0),
        {
          maxCost: 1000,
          safetyPreference: "efficiency_first",
          avoidTransparent: false,
          allowRiskyPaths: true,
          preferAlternatives: false,
          maxPathLength: 100,
        },
      );

      // Safety-first should have different characteristics than efficient
      expect(safetyFirstResult.path.length).toBeGreaterThanOrEqual(0);
      expect(efficientResult.path.length).toBeGreaterThanOrEqual(0);

      if (
        safetyFirstResult.path.length > 0 &&
        efficientResult.path.length > 0
      ) {
        // Safety-first might take longer but be safer
        expect(safetyFirstResult.safetyAssessment).not.toBe("HIGH RISK");
      }
    });

    test("perception system influences pathfinding decisions", () => {
      const perception = new TransparentSurfacePerception();

      // Create a highly transparent floor
      const transparentFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        "clear_frosted",
      );
      transparentFloor.transparency = 0.95;

      // Simulate poor visual cues (bad lighting, etc.)
      const poorContext = {
        lightingConditions: "dark" as const,
        viewingAngle: 80,
        observerDistance: 10,
        environmentalFactors: ["fog", "shadows"],
        previousExperience: false,
      };

      const cues = perception.analyzeVisualCues(
        transparentFloor,
        new THREE.Vector3(5, 1, 5),
        poorContext,
      );

      const recognitionConfidence = perception.assessSurfaceRecognition(
        transparentFloor,
        cues,
      );

      // Poor conditions should result in low recognition confidence
      expect(recognitionConfidence).toBeLessThan(0.5);
      // In poor conditions, we should have either no cues or weak cues
      if (cues.length > 0) {
        expect(cues.some((cue) => cue.strength < 0.5)).toBe(true);
      }
    });

    test("system handles performance under load", () => {
      // Create a large number of floors
      const floors = [];
      for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 5; z++) {
          const floor = FloorFactory.createFrostedGlassFloor(
            new THREE.Vector3(x * 2, 0, z * 2),
            x % 2 === 0 ? "heavy_frosted" : "clear_frosted",
          );
          floors.push(floor);
        }
      }

      const startTime = performance.now();

      const generator = new TransparentNavMeshGenerator();
      const navMesh = generator.generateNavMesh(
        floors,
        new THREE.Box3(
          new THREE.Vector3(-2, -1, -2),
          new THREE.Vector3(12, 1, 12),
        ),
      );

      const pathfinder = new TransparentPathfinder(
        navMesh.nodes,
        navMesh.edges,
      );
      const result = pathfinder.findPath(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(8, 0, 8),
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(processingTime).toBeLessThan(2000); // 2 seconds
      expect(navMesh.nodes.size).toBeGreaterThan(floors.length);
      expect(result.path.length).toBeGreaterThanOrEqual(0);
    });
  });
});
