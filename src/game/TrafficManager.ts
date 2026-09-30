import * as THREE from 'three';
import { CityWorld, RoadSegment } from './CityWorld';

export interface TrafficCar {
  mesh: THREE.Group;
  segment: RoadSegment;
  progress: number; // 0 to 1 along segment
  speed: number;
  laneOffset: number;
  direction: 1 | -1;
  headlight: THREE.SpotLight | null;
}

export interface Pedestrian {
  mesh: THREE.Group;
  position: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  animTime: number;
}

export class TrafficManager {
  public scene: THREE.Scene;
  public cars: TrafficCar[] = [];
  public pedestrians: Pedestrian[] = [];
  private carGeo: THREE.BoxGeometry;
  private cabinGeo: THREE.BoxGeometry;
  private wheelGeo: THREE.CylinderGeometry;
  private colors: number[] = [0xffffff, 0x1e293b, 0xef4444, 0x3b82f6, 0x94a3b8, 0x10b981];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.carGeo = new THREE.BoxGeometry(1.9, 0.75, 4.2);
    this.cabinGeo = new THREE.BoxGeometry(1.6, 0.65, 2.2);
    this.wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8);
    this.wheelGeo.rotateZ(Math.PI / 2);
  }

  public initTraffic(world: CityWorld, carCount: number = 24, pedCount: number = 20) {
    // Clear existing
    this.cars.forEach(c => this.scene.remove(c.mesh));
    this.pedestrians.forEach(p => this.scene.remove(p.mesh));
    this.cars = [];
    this.pedestrians = [];

    const segments = world.roadSegments;
    if (segments.length === 0) return;

    // Spawn AI Traffic Cars
    for (let i = 0; i < carCount; i++) {
      const seg = segments[i % segments.length];
      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      const laneOffset = direction * (seg.width * 0.25);
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];

      const carGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 });
      const lower = new THREE.Mesh(this.carGeo, bodyMat);
      lower.position.y = 0.6;
      lower.castShadow = true;
      carGroup.add(lower);

      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const cabin = new THREE.Mesh(this.cabinGeo, cabinMat);
      cabin.position.set(0, 1.25, -0.2);
      carGroup.add(cabin);

      // Wheels
      const tireMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      [-0.95, 0.95].forEach(wx => {
        [-1.3, 1.3].forEach(wz => {
          const w = new THREE.Mesh(this.wheelGeo, tireMat);
          w.position.set(wx, 0.35, wz);
          carGroup.add(w);
        });
      });

      // Front headlights
      const hl = new THREE.SpotLight(0xfffaed, 1.2, 30, Math.PI / 6, 0.3);
      hl.position.set(0, 0.6, 2.0);
      hl.target.position.set(0, 0, 15);
      carGroup.add(hl);
      carGroup.add(hl.target);

      this.scene.add(carGroup);

      this.cars.push({
        mesh: carGroup,
        segment: seg,
        progress: Math.random(),
        speed: 10 + Math.random() * 8, // m/s (~36 to 65 km/h)
        laneOffset,
        direction,
        headlight: hl
      });
    }

    // Spawn Pedestrians on sidewalks
    for (let j = 0; j < pedCount; j++) {
      const seg = segments[j % segments.length];
      const ped = this.createPedestrian(seg);
      this.pedestrians.push(ped);
    }
  }

  private createPedestrian(seg: RoadSegment): Pedestrian {
    const pedGroup = new THREE.Group();
    const shirtColors = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6];
    const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];

    // Torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.6, 0.3),
      new THREE.MeshStandardMaterial({ color: shirtColor })
    );
    torso.position.y = 1.1;
    torso.castShadow = true;
    pedGroup.add(torso);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    head.position.y = 1.6;
    pedGroup.add(head);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const legGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.15, 0.45, 0);
    pedGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.15, 0.45, 0);
    pedGroup.add(legR);

    // Place on sidewalk
    const sidewalkOffset = (seg.width / 2 + 1.2) * (Math.random() > 0.5 ? 1 : -1);
    const startPos = new THREE.Vector3().lerpVectors(seg.start, seg.end, Math.random());
    const angle = Math.atan2(seg.end.x - seg.start.x, seg.end.z - seg.start.z);
    startPos.x += -Math.cos(angle) * sidewalkOffset;
    startPos.z += Math.sin(angle) * sidewalkOffset;
    startPos.y = 0.25;

    pedGroup.position.copy(startPos);
    this.scene.add(pedGroup);

    const targetPos = startPos.clone().add(
      new THREE.Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40)
    );

    return {
      mesh: pedGroup,
      position: startPos,
      targetPos,
      speed: 1.2 + Math.random() * 0.8,
      legL,
      legR,
      animTime: Math.random() * 10
    };
  }

  public update(delta: number, playerPos: THREE.Vector3, world: CityWorld) {
    // 1. Update Traffic Cars
    this.cars.forEach(car => {
      const seg = car.segment;
      const segLength = seg.start.distanceTo(seg.end);
      if (segLength < 1) return;

      // Distance check to player or other obstacles
      let currentSpeed = car.speed;
      const carPos = car.mesh.position;
      const distToPlayer = carPos.distanceTo(playerPos);

      // Slow down or stop if close to player
      if (distToPlayer < 7.0) {
        currentSpeed = 0;
      } else if (distToPlayer < 14.0) {
        currentSpeed *= 0.3;
      }

      // Progress along segment
      const progressDelta = ((currentSpeed * delta) / segLength) * car.direction;
      car.progress += progressDelta;

      // Turn around or jump to connected road when reaching segment ends
      if (car.progress > 1.0) {
        car.progress = 0;
        // Try pick connected segment
        const randomSeg = world.roadSegments[Math.floor(Math.random() * world.roadSegments.length)];
        car.segment = randomSeg;
      } else if (car.progress < 0) {
        car.progress = 1.0;
        const randomSeg = world.roadSegments[Math.floor(Math.random() * world.roadSegments.length)];
        car.segment = randomSeg;
      }

      // Compute world position on lane
      const roadPos = new THREE.Vector3().lerpVectors(car.segment.start, car.segment.end, car.progress);
      const angle = Math.atan2(car.segment.end.x - car.segment.start.x, car.segment.end.z - car.segment.start.z);

      const normalX = -Math.cos(angle);
      const normalZ = Math.sin(angle);

      car.mesh.position.set(
        roadPos.x + normalX * car.laneOffset,
        0.05,
        roadPos.z + normalZ * car.laneOffset
      );

      // Orientation (aligned with road or reversed)
      car.mesh.rotation.y = angle + (car.direction === 1 ? 0 : Math.PI);
    });

    // 2. Update Pedestrians
    this.pedestrians.forEach(ped => {
      ped.animTime += delta * 6;
      ped.legL.rotation.x = Math.sin(ped.animTime) * 0.45;
      ped.legR.rotation.x = -Math.sin(ped.animTime) * 0.45;

      const toTarget = new THREE.Vector3().subVectors(ped.targetPos, ped.position);
      toTarget.y = 0;
      const dist = toTarget.length();

      if (dist < 1.0) {
        // Pick new nearby target
        ped.targetPos.set(
          ped.position.x + (Math.random() - 0.5) * 30,
          0.25,
          ped.position.z + (Math.random() - 0.5) * 30
        );
      } else {
        toTarget.normalize();
        ped.position.addScaledVector(toTarget, ped.speed * delta);
        ped.mesh.position.copy(ped.position);
        ped.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
    });
  }

  public setHeadlights(enabled: boolean) {
    this.cars.forEach(car => {
      if (car.headlight) {
        car.headlight.visible = enabled;
      }
    });
  }
}
