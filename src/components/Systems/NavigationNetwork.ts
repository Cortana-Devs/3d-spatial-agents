// @ts-nocheck
import * as YUKA from "yuka";
import * as THREE from "three";

/**
 * Singleton to manage the navigation graph for the Office Hub.
 * Pre-configured with waypoints based on wall_layout.md
 */
class NavigationNetwork {
    private static instance: NavigationNetwork;
    public graph: YUKA.Graph;
    public navMesh: YUKA.NavMesh | null = null; // Future proofing

    private constructor() {
        this.graph = new YUKA.Graph();
        this.initGraph();
    }

    public static getInstance(): NavigationNetwork {
        if (!NavigationNetwork.instance) {
            NavigationNetwork.instance = new NavigationNetwork();
        }
        return NavigationNetwork.instance;
    }

    private initGraph() {
        // Defines nodes (Positions based on wall_layout.md)
        // Y (Height) is 0 for NavGraph usually, vehicle handles height, but we use 3.5 (hip height) or 0.
        // Let's use 0 and let vehicle logic handle Y.

        // 0: Lobby Center
        const nLobby = this.addNode(0, 0, 60);
        // 1: Lobby Door (approx)
        const nLobbyDoor = this.addNode(0, 0, 40);

        // 2: Open Office Center
        const nOfficeCenter = this.addNode(0, 0, 10);
        // 3: Open Office Left Wing
        const nOfficeLeft = this.addNode(-50, 0, 10);
        // 4: Open Office Right Wing
        const nOfficeRight = this.addNode(50, 0, 10);

        // 5: Corridor (Approach to back rooms)
        const nCorridor = this.addNode(0, 0, -10);

        // 6: Storage Doorway
        const nStorageDoor = this.addNode(-50, 0, -20);
        // 7: Conference Doorway
        const nConfDoor = this.addNode(50, 0, -20);

        // 8: Storage Room Center
        const nStorageCenter = this.addNode(-50, 0, -50);
        // 9: Conference Room Center
        const nConfCenter = this.addNode(50, 0, -50);

        // Edges (Connections)
        // Lobby <-> Lobby Door
        this.connect(nLobby, nLobbyDoor);

        // Lobby Door <-> Office Center
        this.connect(nLobbyDoor, nOfficeCenter);

        // Office Center <-> Wings
        this.connect(nOfficeCenter, nOfficeLeft);
        this.connect(nOfficeCenter, nOfficeRight);

        // Office Center <-> Corridor
        this.connect(nOfficeCenter, nCorridor);

        // Corridor <-> Storage/Conf Doors
        // NOTE: We need diagonal paths or intermediate nodes if walls block direct line.
        // From (0,0,-10) to (-50,0,-20) might clip the wall corner at (-15/15).
        // Let's check: (0 to -50 X) vs (-10 to -20 Z). The wall is at Z=-20.
        // The doors are at -50 and +50.
        // So we need to move along Z=-10 to X=-50 first?
        // Let's add intermediate nodes for safer travel.

        const nPreStorage = this.addNode(-50, 0, -10);
        const nPreConf = this.addNode(50, 0, -10);

        this.connect(nCorridor, nPreStorage);
        this.connect(nCorridor, nPreConf);

        this.connect(nOfficeLeft, nPreStorage);
        this.connect(nOfficeRight, nPreConf);

        this.connect(nPreStorage, nStorageDoor);
        this.connect(nPreConf, nConfDoor);

        // Into Rooms
        this.connect(nStorageDoor, nStorageCenter);
        this.connect(nConfDoor, nConfCenter);
    }

    private addNode(x: number, y: number, z: number): number {
        const node = new YUKA.NavNode();
        node.position.set(x, y, z);
        return this.graph.addNode(node);
    }

    private connect(index1: number, index2: number) {
        this.graph.addEdge(index1, index2);
        this.graph.addEdge(index2, index1); // Bidirectional
    }

    public findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
        // 1. Find nearest nodes
        const fromNode = this.getClosestNode(from);
        const toNode = this.getClosestNode(to);

        if (!fromNode || !toNode) return [to];

        // 2. A* Search
        const search = new YUKA.AStar(this.graph, fromNode.index, toNode.index);
        search.search();

        if (!search.found) return [to];

        const pathIds = search.getPath();

        // 3. Convert IDs to Vectors
        const path: THREE.Vector3[] = [];

        // Add start position first? No, we move access closest node.
        // But we should likely move directly to first node if visible, or...
        // For simplicity: Path = [ClosestNode1, NextNode..., ClosestNodeEnd, Target]

        pathIds.forEach(id => {
            const node = this.graph.getNode(id);
            path.push(new THREE.Vector3(node.position.x, node.position.y, node.position.z));
        });

        // Add final target
        path.push(to.clone());

        return path;
    }

    private getClosestNode(position: THREE.Vector3): YUKA.NavNode | null {
        let bestDistSq = Infinity;
        let bestNode: YUKA.NavNode | null = null;

        // Iterate all nodes (small graph, generic iteration likely not exposed efficiently, 
        // but graph.nodes is a map usually)
        // Yuka graph nodes are in a Map called 'nodes'

        for (const node of this.graph.nodes.values()) {
            const distSq = position.distanceToSquared(node.position as unknown as THREE.Vector3);
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestNode = node;
            }
        }
        return bestNode;
    }
}

export default NavigationNetwork;
