import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";
import { useProceduralGait } from "./useProceduralGait";
import { InteractableRegistry } from "../Systems/InteractableRegistry";
import AIManager from "../Systems/AIManager";

export interface Joints {
  hips?: THREE.Group;
  torso?: THREE.Group;
  neck?: THREE.Group;
  leftArm?: { shoulder: THREE.Group; elbow: THREE.Group };
  rightArm?: { shoulder: THREE.Group; elbow: THREE.Group };
  leftHip?: THREE.Group;
  rightHip?: THREE.Group;
  leftKnee?: THREE.Group;
  rightKnee?: THREE.Group;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow dynamic access
}

export function useRobotController(
  groupRef: React.RefObject<THREE.Group | null>,
) {
  useEffect(() => {
    // console.log("useRobotController MOUNTED");
    // return () => console.log("useRobotController UNMOUNTED");
  }, []);

  const collidableMeshes = useGameStore((state) => state.collidableMeshes);
  const obstacles = useGameStore((state) => state.obstacles);
  // const setDebugText = useGameStore((state) => state.setDebugText);
  // const isLocked = useGameStore((state) => state.isLocked);
  const isMenuOpen = useGameStore((state) => state.isMenuOpen);
  const isMenuPanelOpen = useGameStore((state) => state.isMenuPanelOpen);

  const inputRef = useRef({
    f: false,
    b: false,
    l: false,
    r: false,
    jump: false,
    sneak: false,
    wave: false,
  });
  const state = useRef({
    isWaving: false,
    waveTimer: 0,
    velocity: new THREE.Vector3(),
    isGrounded: false,
    walkTime: 0,
    isSneaking: false,
    idleTime: 0,
  });

  const prevPlacingIds = useRef<string>("");
  const prevActivePlacingId = useRef<string | null>(null);

  const lastGridUpdatePos = useRef(new THREE.Vector3(0, 0, 0));
  const gridUpdateTimer = useRef(0);
  const lastPlayerPosLog = useRef(new THREE.Vector3(0, 0, 0));

  const keyBindings = useGameStore((state) => state.keyBindings);

  // Input Handling
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case keyBindings.forward:
          inputRef.current.f = true;
          break;
        case keyBindings.backward:
          inputRef.current.b = true;
          break;
        case keyBindings.left:
          inputRef.current.l = true;
          break;
        case keyBindings.right:
          inputRef.current.r = true;
          break;
        case keyBindings.jump:
          inputRef.current.jump = true;
          break;
        case keyBindings.sprint:
        case "ShiftRight":
        case "ShiftLeft":
          inputRef.current.sneak = true;
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case keyBindings.forward:
          inputRef.current.f = false;
          break;
        case keyBindings.backward:
          inputRef.current.b = false;
          break;
        case keyBindings.left:
          inputRef.current.l = false;
          break;
        case keyBindings.right:
          inputRef.current.r = false;
          break;
        case keyBindings.jump:
          inputRef.current.jump = false;
          break;
        case keyBindings.sprint:
        case "ShiftRight":
        case "ShiftLeft":
          inputRef.current.sneak = false;
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [keyBindings]);

  // Physics Constants
  const walkSpeed = 3.5;
  const runSpeed = 8.5; // Faster sprint for better contrast
  const sneakSpeed = 1.5;
  const jumpForce = 20.0;
  const gravity = -50.0;
  const radius = 0.6; // TUNED: 0.6 perfectly fits the robot model footprint (was 0.8)

  const joints = useRef<Joints>({});
  const rb = useRef<any>(null);

  // Gait Engine
  const gait = useProceduralGait(joints, {
    strideLength: 6.0,
    leanFactor: 0.1,
    bankFactor: 0.08,
  });

  const interactables = useGameStore((state) => state.interactables);
  const isSitting = useGameStore((state) => state.isSitting);
  const setSitting = useGameStore((state) => state.setSitting);
  const setDebugText = useGameStore((state) => state.setDebugText);
  const playerInventory = useGameStore((state) => state.playerInventory);
  const addToInventory = useGameStore((state) => state.addToInventory);
  const removeFromInventory = useGameStore(
    (state) => state.removeFromInventory,
  );
  const setInteractionNotification = useGameStore(
    (state) => state.setInteractionNotification,
  );
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const followingAgentId = useGameStore((state) => state.followingAgentId);
  const setFollowingAgentId = useGameStore(
    (state) => state.setFollowingAgentId,
  );

  // Sitting State
  const sitTargetPos = useRef<THREE.Vector3 | null>(null);
  const sitTargetRot = useRef<THREE.Quaternion | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIsSitting = useGameStore.getState().isSitting;
      const currentInteractables = useGameStore.getState().interactables;

      // ===== E KEY: SIT / STAND / DOOR / WAVE =====
      if (e.code === keyBindings.interact) {
        if (currentIsSitting) {
          // Stand up
          if (
            sitTargetPos.current &&
            sitTargetRot.current &&
            groupRef.current
          ) {
            const standOffset = new THREE.Vector3(0, 0, -4.0);
            standOffset.applyQuaternion(sitTargetRot.current);
            standOffset.add(sitTargetPos.current);
            groupRef.current.position.copy(standOffset);
            groupRef.current.position.y = 5.0;
          }
          setSitting(false);
          sitTargetPos.current = null;
          sitTargetRot.current = null;
          state.current.velocity.set(0, 0, 0);
          state.current.isGrounded = false;
          if (groupRef.current) {
            groupRef.current.rotation.x = 0;
            groupRef.current.rotation.z = 0;
          }
        } else {
          if (!groupRef.current) return;
          const robotPos = groupRef.current.position;
          let nearest: any = null;
          let minDist = 12.0;

          for (const item of currentInteractables) {
            const dist = robotPos.distanceTo(item.position);
            if (dist < minDist) {
              minDist = dist;
              nearest = item;
            }
          }

          if (nearest) {
            if (nearest.type === "sofa" || nearest.type === "chair") {
              setDebugText("Sitting...");
              setSitting(true);
              sitTargetPos.current = nearest.position.clone();
              sitTargetRot.current = nearest.rotation.clone();
            } else if (nearest.type === "door") {
              setDebugText("Toggling Door...");
              useGameStore.getState().setInteractionTarget(nearest.id);
            }
          } else {
            // Check for nearby AI Agents (Follow Logic)
            const agents = AIManager.getInstance().vehicles;
            let nearbyAgent: any = null;
            let agentDist = 999;
            const myPos = groupRef.current.position;

            for (const v of agents) {
              // @ts-ignore
              if (v.id) {
                const d = v.position.squaredDistanceTo(myPos as unknown as any);
              }
            }
          }
        }
      }

      // ===== P KEY: PICK UP (GRID) =====
      if (e.code === keyBindings.pickUp) {
        if (currentIsSitting || !groupRef.current) return;
        const grid = useGameStore.getState().interactionGrid;
        const sel = useGameStore.getState().gridSelection;

        if (grid.length > 0 && sel.row >= 0 && sel.row < grid.length) {
          const cell = grid[sel.row].cells[sel.col];
          if (cell && cell.type === "item") {
            const success = InteractableRegistry.getInstance().pickUp(
              cell.id,
              "player",
            );
            if (success) {
              const obj = InteractableRegistry.getInstance().getById(cell.id);
              if (obj) {
                addToInventory(obj);
                setInteractionNotification(`Picked up ${obj.name}`);
              }
            }
          }
        }
      }

      // ===== T KEY: PLACE (GRID) =====
      if (e.code === keyBindings.placeItem) {
        if (currentIsSitting || !groupRef.current) return;

        const inventory = useGameStore.getState().playerInventory;
        if (inventory.length === 0) {
          setInteractionNotification("Inventory is empty");
          return;
        }

        const grid = useGameStore.getState().interactionGrid;
        const sel = useGameStore.getState().gridSelection;

        if (grid.length > 0 && sel.row >= 0 && sel.row < grid.length) {
          const cell = grid[sel.row].cells[sel.col];

          // Get currently selected inventory item
          const invIdx = useGameStore.getState().selectedInventoryIndex;
          const clampedIdx = Math.min(invIdx, inventory.length - 1);
          const selectedItem = inventory[clampedIdx];

          if (cell && cell.type === "slot") {
            // Place in specific slot/area
            const areaId = cell.meta.areaId;
            const slotIdx = cell.meta.offset; // Now this is the absolute index

            const success = InteractableRegistry.getInstance().placeItemAt(
              selectedItem.id,
              areaId,
            );

            if (success) {
              removeFromInventory(selectedItem.id);
              setInteractionNotification(
                `Placed ${selectedItem.name} on ${cell.meta.areaName} (Slot ${slotIdx})`,
              );
            } else {
              setInteractionNotification(
                `Cannot place ${selectedItem.name} here (Full or Invalid Type)`,
              );
            }
          } else if (
            cell &&
            cell.type === "item" &&
            cell.meta &&
            cell.meta.type === "ground"
          ) {
            // Dropping on ground? Or replacing a ground item?
            // Tapping T on a ground item could swap?
            // For now, if "Floor" row is selected, allow dropping generic?
            // Or just fallback to ground drop if NO slot selected?
            // Let's implement explicit ground drop if "Floor Items" row is selected but NOT targeting an item?
            // Actually, "Empty Slot" logic handles areas. Ground doesn't have slots.
            // Maybe add an "Empty Ground" cell to Floor row?
          }
        } else {
          // Fallback: Drop on ground if no grid (shouldn't happen if items in inv)
          // But if grid is empty (no nearby items/areas), then just drop?
          const robotPos = groupRef.current.position;
          const invIdx = useGameStore.getState().selectedInventoryIndex;
          const clampedIdx = Math.min(invIdx, inventory.length - 1);
          const selectedItem = inventory[clampedIdx];

          InteractableRegistry.getInstance().putDown(
            selectedItem.id,
            robotPos.clone(),
          );
          removeFromInventory(selectedItem.id);
          setInteractionNotification(`Dropped ${selectedItem.name}`);
        }
      }

      // ===== ARROW KEYS: INVENTORY SELECTION (Scroll also works) =====
      // We keep ARROW keys for GRID only now. Inventory uses SCROLL only?
      // Or maybe shift+arrows?
      // User said: "placing areas select by up and down arrow keys".
      // So Arrow keys are for Grid.
      // We removed the old Arrow key block in previous step.

      // ===== ARROW KEYS: GRID NAVIGATION =====
      if (
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight"
      ) {
        const grid = useGameStore.getState().interactionGrid;
        const sel = useGameStore.getState().gridSelection;

        if (grid.length > 0) {
          let newRow = sel.row;
          let newCol = sel.col;

          if (e.code === "ArrowUp") newRow--;
          if (e.code === "ArrowDown") newRow++;

          // Clamp Row
          if (newRow < 0) newRow = grid.length - 1;
          if (newRow >= grid.length) newRow = 0;

          // If Row Changed, Clamp Col to new row's length
          const rowData = grid[newRow];
          if (newCol >= rowData.cells.length) newCol = rowData.cells.length - 1;

          if (e.code === "ArrowLeft") newCol--;
          if (e.code === "ArrowRight") newCol++;

          // Clamp Col
          if (newCol < 0) newCol = rowData.cells.length - 1;
          if (newCol >= rowData.cells.length) newCol = 0;

          useGameStore
            .getState()
            .setGridSelection({ row: newRow, col: newCol });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === keyBindings.interact) {
        inputRef.current.wave = false;
      }
    };

    // Scroll wheel for inventory selection
    const handleWheel = (e: WheelEvent) => {
      const inventory = useGameStore.getState().playerInventory;
      if (inventory.length <= 1) return;
      const currentIdx = useGameStore.getState().selectedInventoryIndex;
      const direction = e.deltaY > 0 ? 1 : -1;
      const newIdx =
        (currentIdx + direction + inventory.length) % inventory.length;
      useGameStore.getState().setSelectedInventoryIndex(newIdx);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheel);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [groupRef, keyBindings]);

  useFrame((stateRoot, delta) => {
    if (isMenuOpen || isMenuPanelOpen) return;
    if (!groupRef.current) return;
    const camera = stateRoot.camera;
    const mesh = groupRef.current;
    const input = inputRef.current;
    const s = state.current;

    // Interaction Prompts & Grid Construction
    gridUpdateTimer.current += delta;
    const distSinceGridUpdate = lastGridUpdatePos.current.distanceTo(
      mesh.position,
    );
    const shouldUpdateGrid =
      gridUpdateTimer.current > 0.25 || distSinceGridUpdate > 0.5;

    if (!isSitting) {
      if (shouldUpdateGrid) {
        gridUpdateTimer.current = 0;
        lastGridUpdatePos.current.copy(mesh.position);

        // Build interaction grid
        const robotPos = mesh.position;
        const nearbyInteractables = InteractableRegistry.getInstance()
          .getNearby(robotPos, 10)
          .filter((o) => o.pickable && !o.carriedBy);

        const nearbyPlacingAreas = InteractableRegistry.getInstance()
          .getNearbyPlacingAreas(robotPos, 10)
          .filter((a) => !a.currentItem);
        // Calculate Camera Forward for Directional Bias
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
          camera.quaternion,
        );
        camForward.y = 0;
        camForward.normalize();

        // Helper: Get distance to the empty slot
        const getMinSlotDist = (area: any) => {
          if (!area.currentItem) {
            const pos = InteractableRegistry.getInstance().getSlotPosition(
              area.id,
            );
            if (pos) {
              return pos.distanceToSquared(robotPos);
            }
          }
          return InteractableRegistry.getInstance().getDistanceToArea(
            area.id,
            robotPos,
          );
        };

        // Sort areas by distance to CLOSEST SLOT
        nearbyPlacingAreas.sort((a, b) => {
          return getMinSlotDist(a) - getMinSlotDist(b);
        });

        const grid: any[] = [];

        // Helper to add nearby items row
        const addNearbyItemsRow = () => {
          if (nearbyInteractables.length > 0) {
            // Sort items by distance
            nearbyInteractables.sort(
              (a, b) =>
                a.position.distanceToSquared(robotPos) -
                b.position.distanceToSquared(robotPos),
            );

            grid.push({
              id: "floor",
              label: "Pickup Items",
              cells: nearbyInteractables.map((item) => ({
                id: item.id,
                label: item.name,
                type: "item",
                icon: "🔹",
                meta: item,
                interactableId: item.id,
              })),
            });
          }
        };

        // Helper to add placing area rows
        const addPlacingAreaRows = () => {
          if (nearbyPlacingAreas.length > 0) {
            const areaGroups = new Map<string, any>();

            nearbyPlacingAreas.forEach((area) => {
              if (area.currentItem) return;

              const gId = area.groupId || area.id;
              const gName = area.groupName || area.name;

              if (!areaGroups.has(gId)) {
                areaGroups.set(gId, {
                  id: gId,
                  label: gName,
                  cells: [],
                });
              }

              areaGroups.get(gId).cells.push({
                id: `slot-${area.id}`,
                label: "Empty Slot",
                type: "slot",
                icon: "⬜",
                meta: {
                  areaId: area.id,
                  areaName: area.name,
                  offset: area.slotIndex || 0,
                },
              });
            });

            areaGroups.forEach((group) => {
              if (group.cells.length > 0) {
                group.cells.sort(
                  (a: any, b: any) => a.meta.offset - b.meta.offset,
                );
                grid.push(group);
              }
            });
          }
        };

        // Determine which group has the single CLOSEST entity
        let minItemDist = Infinity;
        if (nearbyInteractables.length > 0) {
          for (const item of nearbyInteractables) {
            const d = item.position.distanceToSquared(robotPos);
            if (d < minItemDist) minItemDist = d;
          }
        }

        let minAreaDist = Infinity;
        if (nearbyPlacingAreas.length > 0) {
          // Use Distance to Closest SLOT, not Area Volume
          minAreaDist = getMinSlotDist(nearbyPlacingAreas[0]);
        }

        // STRICT Nearest First Logic (Item vs Slot)
        if (minItemDist < minAreaDist) {
          // Closest thing is an Item
          addNearbyItemsRow();
          addPlacingAreaRows();
        } else {
          // Closest thing is a Slot
          addPlacingAreaRows();
          addNearbyItemsRow();
        }

        useGameStore.getState().setInteractionGrid(grid);

        // Update Placing Target Visualization
        const curSel = useGameStore.getState().gridSelection;
        let targetPos: THREE.Vector3 | null = null;
        let targetType: "item" | "slot" | null = null;
        let targetId: string | undefined;

        const interactableRegistry = InteractableRegistry.getInstance();

        if (grid.length > 0 && curSel.row >= 0 && curSel.row < grid.length) {
          const row = grid[curSel.row];
          const cell = row.cells[curSel.col];

          if (cell && cell.type === "slot") {
            targetType = "slot";
            targetId = cell.id;
            const areaId = cell.meta.areaId;
            const area = interactableRegistry.getPlacingAreaById(areaId);
            if (area) {
              targetPos = interactableRegistry.getSlotPosition(areaId);
            }
          } else if (cell && cell.type === "item") {
            targetType = "item";
            targetId = cell.id;
            const obj = interactableRegistry.getById(cell.id);
            if (obj) {
              targetPos = obj.position.clone();
              if (obj.meshRef) {
                const bbox = new THREE.Box3().setFromObject(obj.meshRef);
                targetPos.y = bbox.max.y + 0.2;
              } else {
                targetPos.y += 0.5;
              }
            }
          }
        }

        // Ensure specific type is compatible with store
        useGameStore
          .getState()
          .setPlacingTargetPos(targetPos, targetType || undefined, targetId);

        if (
          grid.length > 0 &&
          useGameStore.getState().gridSelection.row === -1
        ) {
          useGameStore.getState().setGridSelection({ row: 0, col: 0 });
        } else if (grid.length === 0) {
          useGameStore.getState().setGridSelection({ row: -1, col: -1 });
        }
      } // end if (shouldUpdateGrid)
    } else if (shouldUpdateGrid) {
      gridUpdateTimer.current = 0;
      useGameStore.getState().setInteractionGrid([]);
      useGameStore.getState().setGridSelection({ row: -1, col: -1 });
      useGameStore.getState().setPlacingTargetPos(null);
    }

    const dt = Math.min(delta, 0.1);

    // Input Processing
    const isSprinting = input.sneak;
    s.isSneaking = false;
    const currentSpeed = isSprinting ? runSpeed : walkSpeed;
    const moveDist = currentSpeed * dt;

    let inputZ = 0;
    let inputX = 0;
    if (input.f) inputZ = 1;
    if (input.b) inputZ = -1;
    if (input.l) inputX = 1;
    if (input.r) inputX = -1;

    if (inputX !== 0 || inputZ !== 0) {
      const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
      inputX /= len;
      inputZ /= len;
    }

    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion,
    );
    camForward.y = 0;
    camForward.normalize();
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
      camera.quaternion,
    );
    camRight.y = 0;
    camRight.normalize();

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(camForward, inputZ);
    moveDir.addScaledVector(camRight, -inputX);
    if (moveDir.lengthSq() > 0) moveDir.normalize();

    const worldDx = moveDir.x * moveDist;
    const worldDz = moveDir.z * moveDist;

    const isMoving = inputX !== 0 || inputZ !== 0;

    if (isSitting && sitTargetPos.current && sitTargetRot.current) {
      groupRef.current.position.lerp(sitTargetPos.current, 0.1);
      groupRef.current.quaternion.slerp(sitTargetRot.current, 0.1);
      s.velocity.set(0, 0, 0);
    } else {
      mesh.rotation.x = 0;
      mesh.rotation.z = 0;

      if (input.wave && !s.isWaving) {
        s.isWaving = true;
        s.waveTimer = 0;
      }

      if (isMoving) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetAngle - mesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        mesh.rotation.y += diff * 10 * dt;
      }

      const proposedX = mesh.position.x + worldDx;
      const proposedZ = mesh.position.z + worldDz;
      let canMove = true;

      const playerHeight = 4.0; // Estimated player height
      const bottomY = mesh.position.y;
      const topY = bottomY + playerHeight;

      for (const ob of obstacles) {
        // 1. Vertical (Y-axis) Check
        if (ob.halfExtents) {
          // Box Obstacle
          const boxBottom = ob.position.y - ob.halfExtents.y;
          const boxTop = ob.position.y + ob.halfExtents.y;
          // If no vertical overlap, skip this obstacle
          if (topY < boxBottom || bottomY > boxTop) continue;

          // 2. Horizontal (XZ) Check - Circle vs Rotated Box
          // Transform player pos to box local space
          const dx = proposedX - ob.position.x;
          const dz = proposedZ - ob.position.z;
          const localX =
            dx * Math.cos(-ob.rotation!) - dz * Math.sin(-ob.rotation!);
          const localZ =
            dx * Math.sin(-ob.rotation!) + dz * Math.cos(-ob.rotation!);

          // Find closest point on box to circle center
          const closestX = Math.max(
            -ob.halfExtents.x,
            Math.min(ob.halfExtents.x, localX),
          );
          const closestZ = Math.max(
            -ob.halfExtents.z,
            Math.min(ob.halfExtents.z, localZ),
          );

          // Check distance from closest point to circle center
          const distX = localX - closestX;
          const distZ = localZ - closestZ;
          const distSq = distX * distX + distZ * distZ;

          if (distSq < radius * radius) {
            canMove = false;
            break;
          }
        } else {
          // Sphere Obstacle - Default fallthrough
          const dx = proposedX - ob.position.x;
          const dz = proposedZ - ob.position.z;
          const distSq = dx * dx + dz * dz;
          const minDist = radius + ob.radius;

          // Note: Sphere obstacles currently ignore height (infinite cylinder)
          // We could add height check here too if needed, but keeping legacy behavior for walls
          if (distSq < minDist * minDist) {
            canMove = false;
            break;
          }
        }
      }

      if (canMove) {
        const vehicles = AIManager.getInstance().vehicles;
        for (const agent of vehicles) {
          const dx = proposedX - agent.position.x;
          const dz = proposedZ - agent.position.z;
          const distSq = dx * dx + dz * dz;
          const minDist = radius + agent.boundingRadius;
          if (distSq < minDist * minDist) {
            canMove = false;
            break;
          }
        }
      }
      if (canMove) {
        mesh.position.x = proposedX;
        mesh.position.z = proposedZ;
      }

      let groundHeight = -10;
      if (collidableMeshes.length > 0) {
        const raycaster = new THREE.Raycaster();
        const rayOrigin = mesh.position.clone();
        rayOrigin.y += 50;
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        const hits = raycaster.intersectObjects(collidableMeshes, true);
        if (hits.length > 0) {
          const validHits = hits.filter(
            (h) => !h.object.name.includes("Ceiling"),
          );
          if (validHits.length > 0) {
            groundHeight = validHits[0].point.y;
          }
        }
      }

      const groundMeshY = groundHeight;
      if (s.isGrounded) {
        if (input.jump) {
          s.velocity.y = jumpForce;
          s.isGrounded = false;
        } else {
          s.velocity.y = 0;
          mesh.position.y = groundMeshY;
        }
      } else {
        s.velocity.y += gravity * dt;
        mesh.position.y += s.velocity.y * dt;
        if (mesh.position.y <= groundMeshY) {
          mesh.position.y = groundMeshY;
          s.isGrounded = true;
          s.velocity.y = 0;
        }
      }
    }

    if (lastPlayerPosLog.current.distanceToSquared(mesh.position) > 0.01) {
      lastPlayerPosLog.current.copy(mesh.position);
      setPlayerPosition(mesh.position.clone());
    }

    const playerVel = isMoving
      ? new THREE.Vector3().copy(moveDir).multiplyScalar(currentSpeed)
      : new THREE.Vector3(0, 0, 0);
    const playerStride = isSprinting ? 7.5 : 6.0;

    gait.update(playerVel, dt, {
      strideLength: playerStride,
      leanFactor: 0.1,
      bankFactor: 0.08,
    });

    const j = joints.current;
    if (
      !j.hips ||
      !j.torso ||
      !j.leftArm ||
      !j.rightArm ||
      !j.leftHip ||
      !j.rightHip ||
      !j.leftKnee ||
      !j.rightKnee ||
      !j.neck
    )
      return;

    const targetHipY = s.isSneaking ? 2.8 : 3.5;
    j.hips.position.y = THREE.MathUtils.lerp(
      j.hips.position.y,
      targetHipY,
      0.15,
    );
    j.torso.rotation.x = THREE.MathUtils.lerp(
      j.torso.rotation.x,
      s.isSneaking ? 0.5 : 0,
      0.1,
    );

    const lerpFactor = 0.15;

    if (isSitting) {
      const t = stateRoot.clock.getElapsedTime();
      j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 1.9, 0.1);
      j.hips.position.z = THREE.MathUtils.lerp(j.hips.position.z, 0.0, 0.1);
      j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, -0.3, 0.1);
      j.neck.rotation.x = Math.sin(t * 8) * 0.05;
      j.neck.rotation.y = Math.sin(t * 2) * 0.1;

      j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        j.leftArm.shoulder.rotation.z,
        0.5,
        0.1,
      );
      j.leftArm.shoulder.rotation.y = THREE.MathUtils.lerp(
        j.leftArm.shoulder.rotation.y,
        -0.5,
        0.1,
      );
      j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        j.rightArm.shoulder.rotation.z,
        -0.5,
        0.1,
      );
      j.rightArm.shoulder.rotation.y = THREE.MathUtils.lerp(
        j.rightArm.shoulder.rotation.y,
        0.5,
        0.1,
      );

      j.leftHip.rotation.x = THREE.MathUtils.lerp(
        j.leftHip.rotation.x,
        -1.6,
        0.1,
      );
      j.rightHip.rotation.x = THREE.MathUtils.lerp(
        j.rightHip.rotation.x,
        -1.6,
        0.1,
      );
      j.leftKnee.rotation.x = THREE.MathUtils.lerp(
        j.leftKnee.rotation.x,
        1.6,
        0.1,
      );
      j.rightKnee.rotation.x = THREE.MathUtils.lerp(
        j.rightKnee.rotation.x,
        1.6,
        0.1,
      );
      j.leftHip.rotation.z = THREE.MathUtils.lerp(
        j.leftHip.rotation.z,
        -0.15,
        0.1,
      );
      j.rightHip.rotation.z = THREE.MathUtils.lerp(
        j.rightHip.rotation.z,
        0.15,
        0.1,
      );
      return;
    }

    if (s.isWaving) {
      s.waveTimer += dt;
      const waveSpeed = 12;
      const liftDuration = 0.4;
      const liftProgress = Math.min(s.waveTimer / liftDuration, 1);
      const targetShoulderZ = -2.8;
      const targetElbowZ = -0.8;
      const easedLift = 1 - Math.pow(1 - liftProgress, 3);

      const currentShoulderZ = THREE.MathUtils.lerp(
        j.rightArm.shoulder.rotation.z,
        targetShoulderZ,
        easedLift,
      );
      const currentElbowZ = THREE.MathUtils.lerp(
        j.rightArm.elbow.rotation.z,
        targetElbowZ,
        easedLift,
      );

      if (liftProgress >= 1) {
        const wave = Math.sin((s.waveTimer - liftDuration) * waveSpeed) * 0.4;
        j.rightArm.shoulder.rotation.z = targetShoulderZ + wave;
        j.rightArm.elbow.rotation.z = targetElbowZ + wave * 0.2;
      } else {
        j.rightArm.shoulder.rotation.z = currentShoulderZ;
        j.rightArm.elbow.rotation.z = currentElbowZ;
      }

      j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        j.leftArm.shoulder.rotation.x,
        0,
        lerpFactor,
      );
      j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        j.leftArm.shoulder.rotation.z,
        0.2,
        lerpFactor,
      );
      j.leftHip.rotation.x = THREE.MathUtils.lerp(
        j.leftHip.rotation.x,
        0,
        lerpFactor,
      );
      j.rightHip.rotation.x = THREE.MathUtils.lerp(
        j.rightHip.rotation.x,
        0,
        lerpFactor,
      );
      j.leftHip.rotation.z = THREE.MathUtils.lerp(
        j.leftHip.rotation.z,
        0,
        lerpFactor,
      );
      j.rightHip.rotation.z = THREE.MathUtils.lerp(
        j.rightHip.rotation.z,
        0,
        lerpFactor,
      );

      if (s.waveTimer > 2.5) s.isWaving = false;
    }
  });

  return { joints };
}
