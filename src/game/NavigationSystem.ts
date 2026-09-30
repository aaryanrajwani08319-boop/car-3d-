import * as THREE from 'three';
import { CityWorld, RoadNode } from './CityWorld';

export class NavigationSystem {
  public scene: THREE.Scene;
  public routeLine: THREE.Line | null = null;
  public chevronGroup: THREE.Group = new THREE.Group();
  public beaconMesh: THREE.Group = new THREE.Group();
  public beaconRings: THREE.Mesh[] = [];

  private lineMat: THREE.LineBasicMaterial;
  private currentTarget: THREE.Vector3 | null = null;
  private targetType: 'pickup' | 'destination' | 'gas' | null = null;
  private animTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.chevronGroup);
    this.scene.add(this.beaconMesh);

    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 4
    });

    this.buildBeaconStructure();
  }

  private buildBeaconStructure() {
    // Vertical light beam
    const beamGeo = new THREE.CylinderGeometry(1.2, 1.2, 40, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 20;
    this.beaconMesh.add(beam);

    // Ground target circle
    const circleGeo = new THREE.RingGeometry(0.2, 4.5, 32);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const groundCircle = new THREE.Mesh(circleGeo, circleMat);
    groundCircle.rotation.x = -Math.PI / 2;
    groundCircle.position.y = 0.15;
    this.beaconMesh.add(groundCircle);

    // Floating pulsing rings
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.TorusGeometry(3.5 - r * 0.8, 0.12, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.0 + r * 1.5;
      this.beaconMesh.add(ring);
      this.beaconRings.push(ring);
    }

    this.beaconMesh.visible = false;
  }

  public setTarget(pos: [number, number, number] | null, type: 'pickup' | 'destination' | 'gas') {
    if (!pos) {
      this.currentTarget = null;
      this.targetType = null;
      this.beaconMesh.visible = false;
      this.clearRoute();
      return;
    }

    this.currentTarget = new THREE.Vector3(pos[0], pos[1], pos[2]);
    this.targetType = type;
    this.beaconMesh.position.set(pos[0], 0, pos[2]);
    this.beaconMesh.visible = true;

    // Set beacon color
    const colorHex = type === 'pickup' ? 0x10b981 : type === 'destination' ? 0xef4444 : 0xf59e0b;
    this.beaconMesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.color.setHex(colorHex);
      }
    });
  }

  public update(delta: number, playerPos: THREE.Vector3, world: CityWorld) {
    this.animTimer += delta;

    // Pulse beacon rings
    if (this.beaconMesh.visible) {
      this.beaconRings.forEach((ring, idx) => {
        const t = this.animTimer * 2.5 + idx * 0.8;
        ring.position.y = 1.0 + ((t % 3) * 1.5);
        const scale = 1 + (t % 3) * 0.2;
        ring.scale.set(scale, scale, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - (t % 3) * 0.3);
      });
    }

    if (!this.currentTarget) {
      this.clearRoute();
      return;
    }

    // Recalculate route waypoints every ~0.4s or when distance changes
    this.updateRouteVisuals(playerPos, world);
  }

  private updateRouteVisuals(playerPos: THREE.Vector3, world: CityWorld) {
    if (!this.currentTarget) return;

    // 1. Find nearest road node to player
    const startNode = this.findNearestRoadNode(playerPos, world);
    const endNode = this.findNearestRoadNode(this.currentTarget, world);

    const waypoints: THREE.Vector3[] = [];
    waypoints.push(new THREE.Vector3(playerPos.x, 0.2, playerPos.z));

    if (startNode && endNode && startNode.id !== endNode.id) {
      // Find path on road graph (Breadth-first search / shortest path on grid)
      const pathNodes = this.findShortestPath(startNode.id, endNode.id, world);
      pathNodes.forEach(node => {
        waypoints.push(new THREE.Vector3(node.position.x, 0.2, node.position.z));
      });
    }

    waypoints.push(new THREE.Vector3(this.currentTarget.x, 0.2, this.currentTarget.z));

    // Render continuous navigation path
    if (this.routeLine) {
      this.scene.remove(this.routeLine);
      this.routeLine.geometry.dispose();
    }

    const geo = new THREE.BufferGeometry().setFromPoints(waypoints);
    const routeColor = this.targetType === 'pickup' ? 0x10b981 : 0x06b6d4;
    this.lineMat.color.setHex(routeColor);

    this.routeLine = new THREE.Line(geo, this.lineMat);
    this.scene.add(this.routeLine);

    // Draw glowing animated chevrons on road
    this.rebuildChevrons(waypoints);
  }

  private rebuildChevrons(waypoints: THREE.Vector3[]) {
    // Clear old chevrons
    while (this.chevronGroup.children.length > 0) {
      const obj = this.chevronGroup.children[0];
      this.chevronGroup.remove(obj);
    }

    if (waypoints.length < 2) return;

    const chevMat = new THREE.MeshBasicMaterial({
      color: this.targetType === 'pickup' ? 0x10b981 : 0x06b6d4,
      transparent: true,
      opacity: 0.65
    });

    const chevGeo = new THREE.ConeGeometry(0.8, 1.6, 3);
    chevGeo.rotateX(Math.PI / 2);

    // Place spaced arrows along path
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const dist = p1.distanceTo(p2);
      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

      const step = 20; // arrow every 20 meters
      const count = Math.floor(dist / step);

      for (let k = 1; k <= count; k++) {
        const alpha = k / (count + 1);
        const pos = new THREE.Vector3().lerpVectors(p1, p2, alpha);

        const arrow = new THREE.Mesh(chevGeo, chevMat);
        arrow.position.set(pos.x, 0.25, pos.z);
        arrow.rotation.y = angle;
        this.chevronGroup.add(arrow);
      }
    }
  }

  private findNearestRoadNode(pos: THREE.Vector3, world: CityWorld): RoadNode | null {
    let nearest: RoadNode | null = null;
    let minDist = Infinity;

    world.roadNodes.forEach(node => {
      const d = pos.distanceTo(node.position);
      if (d < minDist) {
        minDist = d;
        nearest = node;
      }
    });

    return nearest;
  }

  private findShortestPath(startId: string, endId: string, world: CityWorld): RoadNode[] {
    const queue: string[] = [startId];
    const visited = new Set<string>([startId]);
    const parent = new Map<string, string>();

    let found = false;
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === endId) {
        found = true;
        break;
      }

      const node = world.roadNodes.get(current);
      if (!node) continue;

      for (const neighborId of node.connections) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parent.set(neighborId, current);
          queue.push(neighborId);
        }
      }
    }

    if (!found) return [];

    const path: RoadNode[] = [];
    let curr: string | undefined = endId;
    while (curr) {
      const n = world.roadNodes.get(curr);
      if (n) path.unshift(n);
      curr = parent.get(curr);
    }
    return path;
  }

  public getDistanceToTarget(playerPos: THREE.Vector3): number {
    if (!this.currentTarget) return 0;
    const dx = this.currentTarget.x - playerPos.x;
    const dz = this.currentTarget.z - playerPos.z;
    const distWorld = Math.sqrt(dx * dx + dz * dz);
    return Number((distWorld * 0.024).toFixed(1)); // Convert to km
  }

  public clearRoute() {
    if (this.routeLine) {
      this.scene.remove(this.routeLine);
      this.routeLine = null;
    }
    while (this.chevronGroup.children.length > 0) {
      this.chevronGroup.remove(this.chevronGroup.children[0]);
    }
  }
}
