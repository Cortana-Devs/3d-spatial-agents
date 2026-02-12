import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";
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
    console.log("useRobotController MOUNTED");
    return () => console.log("useRobotController UNMOUNTED");
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
          inputRef.current.sneak = true;
          break; // Sprint maps to 'sneak' internally for now? Or vice versa?
        // Note: Original code mapped Shift to 'sneak'. If user wants 'Sprint', we should clarify.
        // Assuming 'sneak' in state is actually used for sprinting based on speed constants (12 vs 5).
        // Wait, walkSpeed=12, sneakSpeed=5. So Shift makes you SLOWER?
        // "case 'ShiftLeft': case 'ShiftRight': inputRef.current.sneak = true; break;"
        // And "const currentSpeed = s.isSneaking ? sneakSpeed : walkSpeed;"
        // So holding Shift makes you sneak (slower).
        // The prompt asked for "Sprint", but the code implements Sneak.
        // I will map 'sprint' binding to 'sneak' input for now to preserve behavior, but label it as 'Sneak' in UI if possible, or just keep it as is.
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
  const walkSpeed = 12.0;
  const runSpeed = 20.0; // Faster than walk
  const sneakSpeed = 5.0; // Optional, maybe Ctrl?
  const jumpForce = 20.0;
  const gravity = -50.0;
  const radius = 0.8;

  const joints = useRef<Joints>({});
  const rb = useRef<any>(null);

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
  const followingAgentId = useGameStore((state) => state.followingAgentId);
  const setFollowingAgentId = useGameStore((state) => state.setFollowingAgentId);

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
                if (d < 9.0) { // < 3m squared
                  agentDist = d;
                  nearbyAgent = v;
                  break;
                }
              }
            }

            if (nearbyAgent) {
              // Toggle Follow
              // @ts-ignore
              const targetId = nearbyAgent.id;
              if (followingAgentId === targetId) {
                setFollowingAgentId(null);
                setInteractionNotification(`Agent Stopped Following`);
              } else {
                setFollowingAgentId(targetId);
                setInteractionNotification(`Agent ${targetId} Following!`);
              }
            } else {
              // Wave
              state.current.isWaving = true;
              state.current.waveTimer = 0;
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
            // Note: placeItemAt currently just pushes to the end.
            // We assume selecting *any* empty slot in the area means "Add to this area".
            const success = InteractableRegistry.getInstance().placeItemAt(
              selectedItem.id,
              areaId,
            );

            if (success) {
              removeFromInventory(selectedItem.id);
              setInteractionNotification(
                `Placed ${selectedItem.name} on ${cell.meta.areaName}`,
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
    if (!isSitting) {
      // Build interaction grid
      const robotPos = mesh.position;
      const nearbyInteractables = InteractableRegistry.getInstance()
        .getNearby(robotPos, 6)
        .filter((o) => o.pickable && !o.carriedBy);

      const nearbyPlacingAreas = InteractableRegistry.getInstance()
        .getNearbyPlacingAreas(robotPos, 6)
        .filter((a) => a.currentItems.length < a.capacity);

      const grid: any[] = [];

      if (nearbyInteractables.length > 0) {
        grid.push({
          id: "floor",
          label: "Nearby Items",
          cells: nearbyInteractables.map((item) => ({
            id: item.id,
            label: item.name,
            type: "item",
            icon: "🔹", // Simplified
            meta: item,
            interactableId: item.id,
          })),
        });
      }

      if (nearbyPlacingAreas.length > 0) {
        nearbyPlacingAreas.forEach((area) => {
          const cells: any[] = [];
          // Items on desk (if we want to pick them?)
          // For now, let's just show EMPTY slots
          const remaining = area.capacity - area.currentItems.length;
          for (let i = 0; i < remaining; i++) {
            cells.push({
              id: `slot-${area.id}-${i}`,
              label: "Empty Slot",
              type: "slot",
              icon: "⬜",
              meta: { areaId: area.id, areaName: area.name, offset: i },
            });
          }
          if (cells.length > 0) {
            grid.push({
              id: area.id,
              label: area.name,
              cells: cells,
            });
          }
        });
      }

      useGameStore.getState().setInteractionGrid(grid);

      // Update Placing Target Visualization
      const curSel = useGameStore.getState().gridSelection;
      let targetPos: THREE.Vector3 | null = null;

      if (grid.length > 0 && curSel.row >= 0 && curSel.row < grid.length) {
        const row = grid[curSel.row];
        const cell = row.cells[curSel.col];
        if (cell && cell.type === "slot") {
          const areaId = cell.meta.areaId;
          // We target the next available slot for the area
          const area =
            InteractableRegistry.getInstance().getPlacingAreaById(areaId);
          if (area) {
            const nextSlotIdx = area.currentItems.length;
            targetPos = InteractableRegistry.getInstance().getSlotPosition(
              areaId,
              nextSlotIdx,
            );
          }
        }
      }
      useGameStore.getState().setPlacingTargetPos(targetPos);

      if (grid.length > 0 && useGameStore.getState().gridSelection.row === -1) {
        useGameStore.getState().setGridSelection({ row: 0, col: 0 });
      } else if (grid.length === 0) {
        useGameStore.getState().setGridSelection({ row: -1, col: -1 });
      }
    } else {
      useGameStore.getState().setInteractionGrid([]);
      useGameStore.getState().setGridSelection({ row: -1, col: -1 });
      useGameStore.getState().setPlacingTargetPos(null);
    }

    const dt = Math.min(delta, 0.1);

    // Input Processing
    // Shift now triggers RUN (isSneaking flag reused for 'modifier' key)
    const isSprinting = input.sneak;
    s.isSneaking = false; // Disable sneak logic generally
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

    // Camera-relative movement
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
      // Smoothly move to sit target
      groupRef.current.position.lerp(sitTargetPos.current, 0.1);
      groupRef.current.quaternion.slerp(sitTargetRot.current, 0.1);
      s.velocity.set(0, 0, 0);
    } else {
      // Enforce upright orientation (Fix for "messed up controls" after sitting)
      // If the robot was tilted by the sit animation (via quaternion), we must reset X/Z rotation.
      mesh.rotation.x = 0;
      mesh.rotation.z = 0;

      // Actions
      if (input.wave && !s.isWaving) {
        s.isWaving = true;
        s.waveTimer = 0;
      }

      // Rotation
      if (isMoving) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetAngle - mesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        mesh.rotation.y += diff * 10 * dt;
      }

      // Collision
      const proposedX = mesh.position.x + worldDx;
      const proposedZ = mesh.position.z + worldDz;
      let canMove = true;

      for (const ob of obstacles) {
        const distSq =
          (proposedX - ob.position.x) ** 2 + (proposedZ - ob.position.z) ** 2;
        const minDist = radius + ob.radius;
        if (distSq < minDist * minDist) {
          canMove = false;
          break;
        }
      }

      // Check against AI Agents
      if (canMove) {
        const agents = AIManager.getInstance().vehicles;
        for (const agent of agents) {
          const dx = proposedX - agent.position.x;
          const dz = proposedZ - agent.position.z;
          const distSq = dx * dx + dz * dz;
          const minDist = radius + agent.boundingRadius; // Player radius + Agent radius
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

      // Gravity / Ground
      let groundHeight = -10;
      if (collidableMeshes.length > 0) {
        const raycaster = new THREE.Raycaster();
        const rayOrigin = mesh.position.clone();
        rayOrigin.y += 50;
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        const hits = raycaster.intersectObjects(collidableMeshes, true);
        if (hits.length > 0) {
          // Filter out ceilings
          const validHits = hits.filter(h => !h.object.name.includes("Ceiling"));
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

    // --- Animation Logic ---
    const j = joints.current;
    // Check if joints are populated
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
    ) {
      // console.warn("Joints not ready");
      return;
    }

    const sneakHipHeight = 2.8;
    const standHipHeight = 3.5;
    const targetHipY = s.isSneaking ? sneakHipHeight : standHipHeight;
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
      // Vibing Pose
      const t = stateRoot.clock.getElapsedTime();

      // Lower Hips to Seat Height
      // Seat height is 2.2.
      // Target Hip Y = 1.9 (Lowered "10% down" to sink in)
      j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, 1.9, 0.1);

      // Move hips BACK to reach backrest
      // We moved the root forward to 2.0.
      // Hips should stay relative to root (0.0) or slightly back (-0.2).
      // Let's try 0.0 to be safe and avoid clipping.
      j.hips.position.z = THREE.MathUtils.lerp(j.hips.position.z, 0.0, 0.1);

      // Lean back
      j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, -0.3, 0.1);

      // Head bobbing to music
      j.neck.rotation.x = Math.sin(t * 8) * 0.05;
      j.neck.rotation.y = Math.sin(t * 2) * 0.1;

      // Arms spread out on sofa back
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

      // Legs - Perfect Sit (90 degree bends)
      // Hips bent -90 degrees (legs forward)
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

      // Knees bent 90 degrees (legs down)
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

      // Slight spread
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

      return; // Skip other animations
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
      // Reset spread
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

      if (s.waveTimer > 2.5) {
        s.isWaving = false;
      }
    } else if (isMoving && s.isGrounded) {
      const isSprinting = input.sneak;
      s.walkTime += dt * (isSprinting ? 18 : 12);
      const legAmp = isSprinting ? 0.8 : 0.6;
      const baseKneeBend = isSprinting ? 0.3 : 0.2;
      const kneeAmp = isSprinting ? 0.5 : 0.3;

      j.leftHip.rotation.x =
        Math.sin(s.walkTime) * legAmp; // Removed sneak offset
      j.leftKnee.rotation.x =
        Math.abs(Math.cos(s.walkTime)) * kneeAmp + baseKneeBend;
      j.rightHip.rotation.x =
        Math.sin(s.walkTime + Math.PI) * legAmp;
      j.rightKnee.rotation.x =
        Math.abs(Math.cos(s.walkTime + Math.PI)) * kneeAmp + baseKneeBend;

      // Arms
      j.leftArm.shoulder.rotation.x =
        Math.sin(s.walkTime + Math.PI) * legAmp;
      j.rightArm.shoulder.rotation.x =
        Math.sin(s.walkTime) * legAmp;

      // Torso Bob
      j.torso.position.y = Math.sin(s.walkTime * 2) * (isSprinting ? 0.1 : 0.05);
      j.torso.rotation.x = THREE.MathUtils.lerp(
        j.torso.rotation.x,
        isSprinting ? 0.3 : 0, // Lean forward when running
        0.1
      );

      // Reset spread
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

      if (s.isSneaking) {
        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.x,
          -0.5,
          lerpFactor,
        );
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          -0.5,
          lerpFactor,
        );
        j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.z,
          0.8,
          lerpFactor,
        );
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.z,
          -0.8,
          lerpFactor,
        );
      } else {
        j.leftArm.shoulder.rotation.x = Math.sin(s.walkTime + Math.PI) * 0.6;
        j.rightArm.shoulder.rotation.x = Math.sin(s.walkTime) * 0.6;
        j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.z,
          0.2,
          lerpFactor,
        );
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.z,
          -0.2,
          lerpFactor,
        );
      }
      j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
        j.rightArm.elbow.rotation.z,
        0,
        lerpFactor,
      );
    } else if (!s.isGrounded) {
      j.leftHip.rotation.x = THREE.MathUtils.lerp(
        j.leftHip.rotation.x,
        0.5,
        lerpFactor,
      );
      j.rightHip.rotation.x = THREE.MathUtils.lerp(
        j.rightHip.rotation.x,
        0.2,
        lerpFactor,
      );
      j.leftKnee.rotation.x = THREE.MathUtils.lerp(
        j.leftKnee.rotation.x,
        0.8,
        lerpFactor,
      );
      j.rightKnee.rotation.x = THREE.MathUtils.lerp(
        j.rightKnee.rotation.x,
        0.1,
        lerpFactor,
      );
      j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
        j.rightArm.elbow.rotation.z,
        0,
        lerpFactor,
      );

      // Reset spread
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
    } else {
      s.idleTime += dt;
      const breath = Math.sin(s.idleTime * 1.5);
      const microMovement = Math.cos(s.idleTime * 0.8);

      const baseKneeBend = s.isSneaking ? 0.9 : 0.1 + breath * 0.02;
      const baseHipBend = s.isSneaking ? -0.6 : -0.1 - breath * 0.02;

      j.leftHip.rotation.x = THREE.MathUtils.lerp(
        j.leftHip.rotation.x,
        baseHipBend,
        lerpFactor,
      );
      j.rightHip.rotation.x = THREE.MathUtils.lerp(
        j.rightHip.rotation.x,
        baseHipBend + microMovement * 0.02,
        lerpFactor,
      );
      j.leftKnee.rotation.x = THREE.MathUtils.lerp(
        j.leftKnee.rotation.x,
        baseKneeBend,
        lerpFactor,
      );
      j.rightKnee.rotation.x = THREE.MathUtils.lerp(
        j.rightKnee.rotation.x,
        baseKneeBend - microMovement * 0.02,
        lerpFactor,
      );

      // Reset spread
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

      j.torso.rotation.x = THREE.MathUtils.lerp(
        j.torso.rotation.x,
        (s.isSneaking ? 0.5 : 0) + breath * 0.03,
        lerpFactor,
      );
      j.neck.rotation.x = THREE.MathUtils.lerp(
        j.neck.rotation.x,
        -breath * 0.03 + microMovement * 0.02,
        lerpFactor,
      );

      if (s.isSneaking) {
        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.x,
          -0.4 + breath * 0.05,
          lerpFactor,
        );
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          -0.4 + breath * 0.05,
          lerpFactor,
        );
        j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.z,
          0.5,
          lerpFactor,
        );
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.z,
          -0.5,
          lerpFactor,
        );
      } else {
        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.x,
          breath * 0.05,
          lerpFactor,
        );
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          -breath * 0.05,
          lerpFactor,
        );
        j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.z,
          0.2 + microMovement * 0.03,
          lerpFactor,
        );
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.z,
          -0.2 - microMovement * 0.03,
          lerpFactor,
        );
      }
      j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
        j.rightArm.elbow.rotation.z,
        0,
        lerpFactor,
      );
    }
  });

  return { joints };
}
