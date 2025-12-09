declare module 'yuka' {
    export class EntityManager {
        update(delta: number): void;
        add(entity: any): void;
        remove(entity: any): void;
    }
    export class Time {
        update(): number;
        getDelta(): number;
    }
    export class GameEntity {
        position: Vector3;
        rotation: Quaternion;
        boundingRadius: number;
        velocity: Vector3;
    }
    export class Vehicle extends GameEntity {
        maxSpeed: number;
        maxForce: number;
        mass: number;
        steering: SteeringManager;
        setRenderComponent(component: any, callback: (entity: any, renderComponent: any) => void): void;
    }
    export class SteeringManager {
        behaviors: SteeringBehavior[];
        add(behavior: SteeringBehavior): void;
    }
    export class SteeringBehavior {
        active: boolean;
        weight: number;
    }
    export class ObstacleAvoidanceBehavior extends SteeringBehavior {
        constructor(obstacles: GameEntity[]);
    }
    export class SeparationBehavior extends SteeringBehavior {
        constructor(entities: GameEntity[]);
        weight: number;
    }
    export class WanderBehavior extends SteeringBehavior { }
    export class SeekBehavior extends SteeringBehavior {
        constructor(target: Vector3);
        target: Vector3;
    }
    export class Vector3 {
        x: number;
        y: number;
        z: number;
        constructor(x?: number, y?: number, z?: number);
        copy(v: any): this;
        clone(): Vector3;
        add(v: any): this;
        sub(v: any): this;
        multiplyScalar(s: number): this;
        normalize(): this;
        distanceTo(v: any): number;
        squaredDistanceTo(v: any): number;
        length(): number;
        set(x: number, y: number, z: number): this;
        fromArray(array: number[], offset?: number): this;
        toArray(array: number[], offset?: number): number[];
    }
    export class Quaternion {
        copy(q: any): this;
        setFromEuler(x: number, y: number, z: number): this;
        fromEuler(x: number, y: number, z: number): this;
        slerp(q: any, t: number): this;
        multiply(q: any): this;
        rotateByAngularVelocity(omega: any, dt: number): this;
    }
}
