import * as THREE from 'three';
import { VehicleConfig, VehicleUpgrades, VehicleTelemetry } from '../types/game';
import { CityWorld } from './CityWorld';
import { soundManager } from '../audio/SoundManager';

export interface VehicleInputs {
  throttle: number; // -1 (reverse/brake) to 1 (accelerate)
  steering: number; // -1 (left) to 1 (right)
  handbrake: boolean;
  horn: boolean;
  headlights: boolean;
}

export class VehiclePhysics {
  public mesh: THREE.Group;
  public chassisMesh!: THREE.Mesh;
  public frontSteerPivots: THREE.Group[] = [];
  public wheelSpinMeshes: THREE.Mesh[] = [];
  public headlightGroup: THREE.Group = new THREE.Group();
  public taillightMeshes: THREE.Mesh[] = [];
  public reverseLightMeshes: THREE.Mesh[] = [];
  public turnSignalsLeft: THREE.Mesh[] = [];
  public turnSignalsRight: THREE.Mesh[] = [];
  public taxiSignMesh: THREE.Mesh | null = null;
  public underglowMesh: THREE.Mesh | null = null;
  public shadowPlane: THREE.Mesh | null = null;

  // Transform and kinematic state
  public position: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public heading: number = 0; // Yaw angle in radians (around Y)
  public steeringAngle: number = 0; // Current front wheel angle in radians
  public speedKmh: number = 0;

  // Suspension tilt
  public rollAngle: number = 0;
  public pitchAngle: number = 0;

  // Upgraded stats
  public maxSpeedKmh: number = 140;
  public accelerationPower: number = 34;
  public handlingPower: number = 38;
  public brakingPower: number = 42;
  public maxDurability: number = 100;
  public maxFuel: number = 60;

  // Dynamic consumables
  public currentFuel: number = 60;
  public currentHealth: number = 100;

  public isDrifting: boolean = false;
  public isColliding: boolean = false;
  public headlightsOn: boolean = false;

  // Blinker timer
  private blinkTimer: number = 0;
  private blinkState: boolean = false;

  private config: VehicleConfig;
  private upgrades: VehicleUpgrades;

  // Exhaust particles
  public exhaustGroup: THREE.Group = new THREE.Group();
  private exhaustPuffs: { mesh: THREE.Mesh; life: number; maxLife: number; vel: THREE.Vector3 }[] = [];

  constructor(config: VehicleConfig, upgrades: VehicleUpgrades, customColor?: string) {
    this.config = config;
    this.upgrades = upgrades;
    this.mesh = new THREE.Group();

    this.applyUpgrades();
    this.currentFuel = this.maxFuel;
    this.currentHealth = this.maxDurability;

    this.build3DCar(customColor || config.color);
  }

  public applyUpgrades() {
    const engMult = 1 + (this.upgrades.engine * 0.15);
    const brkMult = 1 + (this.upgrades.brakes * 0.15);
    const tirMult = 1 + (this.upgrades.tires * 0.16);
    const flMult = 1 + (this.upgrades.fuelTank * 0.20);
    const durMult = 1 + (this.upgrades.durability * 0.20);

    this.maxSpeedKmh = this.config.baseMaxSpeed * engMult;
    this.accelerationPower = this.config.baseAcceleration * engMult;
    this.handlingPower = this.config.baseHandling * tirMult;
    this.brakingPower = this.config.baseBraking * brkMult;
    this.maxFuel = Math.round(this.config.baseFuelTank * flMult);
    this.maxDurability = Math.round(this.config.baseDurability * durMult);
  }

  private build3DCar(colorHex: string) {
    const isSuv = this.config.id === 'grand_navigator';
    const isCyber = this.config.id === 'cyber_cruiser';

    const width = isSuv ? 2.2 : 2.0;
    const length = isSuv ? 4.8 : 4.4;
    const lowerHeight = isSuv ? 0.95 : 0.78;
    const cabinHeight = isSuv ? 0.9 : 0.68;

    // Body paint material with metallic sheen
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      metalness: 0.65,
      roughness: 0.28,
      envMapIntensity: 1.2
    });

    // Dark trim material for bumpers and skirts
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.3,
      roughness: 0.8
    });

    // Chrome material for grille, mirrors, handles
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.12
    });

    // Glass material
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });

    // 1. Lower main chassis
    const lowerGeo = new THREE.BoxGeometry(width, lowerHeight, length);
    const lowerMesh = new THREE.Mesh(lowerGeo, bodyMat);
    lowerMesh.position.y = lowerHeight / 2 + 0.36;
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;
    this.mesh.add(lowerMesh);
    this.chassisMesh = lowerMesh;

    // Front Bumper
    const fbGeo = new THREE.BoxGeometry(width * 1.02, lowerHeight * 0.45, 0.3);
    const frontBumper = new THREE.Mesh(fbGeo, trimMat);
    frontBumper.position.set(0, lowerHeight * 0.25 + 0.36, length / 2 + 0.12);
    frontBumper.castShadow = true;
    this.mesh.add(frontBumper);

    // Rear Bumper
    const rbGeo = new THREE.BoxGeometry(width * 1.02, lowerHeight * 0.45, 0.3);
    const rearBumper = new THREE.Mesh(rbGeo, trimMat);
    rearBumper.position.set(0, lowerHeight * 0.25 + 0.36, -length / 2 - 0.12);
    rearBumper.castShadow = true;
    this.mesh.add(rearBumper);

    // Front Chrome Grille
    const grilleGeo = new THREE.BoxGeometry(width * 0.55, lowerHeight * 0.35, 0.08);
    const grilleMesh = new THREE.Mesh(grilleGeo, chromeMat);
    grilleMesh.position.set(0, lowerHeight * 0.5 + 0.36, length / 2 + 0.03);
    this.mesh.add(grilleMesh);

    // Side Door Mirrors
    [-width / 2 - 0.12, width / 2 + 0.12].forEach(mx => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.22), chromeMat);
      mirror.position.set(mx, lowerHeight + 0.38, 0.4);
      this.mesh.add(mirror);
    });

    // 2. Cabin / Passenger Compartment
    const cabinLength = isCyber ? length * 0.52 : length * 0.58;
    const cabinWidth = width * 0.86;
    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabinMesh = new THREE.Mesh(cabinGeo, bodyMat);
    const cabinZ = isCyber ? 0.15 : -0.15;
    cabinMesh.position.set(0, lowerHeight + cabinHeight / 2 + 0.36, cabinZ);
    cabinMesh.castShadow = true;
    this.mesh.add(cabinMesh);

    // Windshield (Front)
    const frontGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(cabinWidth * 0.92, cabinHeight * 0.9),
      glassMat
    );
    frontGlass.position.set(0, lowerHeight + cabinHeight / 2 + 0.36, cabinZ + cabinLength / 2 + 0.02);
    frontGlass.rotation.x = -0.28;
    this.mesh.add(frontGlass);

    // Rear Windshield
    const rearGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(cabinWidth * 0.92, cabinHeight * 0.85),
      glassMat
    );
    rearGlass.position.set(0, lowerHeight + cabinHeight / 2 + 0.36, cabinZ - cabinLength / 2 - 0.02);
    rearGlass.rotation.x = Math.PI + 0.28;
    this.mesh.add(rearGlass);

    // Side Windows
    [-cabinWidth / 2 - 0.01, cabinWidth / 2 + 0.01].forEach(gx => {
      const sideGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(cabinLength * 0.88, cabinHeight * 0.72),
        glassMat
      );
      sideGlass.position.set(gx, lowerHeight + cabinHeight / 2 + 0.36, cabinZ);
      sideGlass.rotation.y = gx > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.mesh.add(sideGlass);
    });

    // 3. Iconic Taxi Roof Light Sign
    if (this.config.roofSign) {
      const signBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.08, 0.4),
        trimMat
      );
      signBase.position.set(0, lowerHeight + cabinHeight + 0.38, cabinZ);
      this.mesh.add(signBase);

      const signHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.24, 0.36),
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 0.9,
          roughness: 0.2
        })
      );
      signHousing.position.set(0, lowerHeight + cabinHeight + 0.52, cabinZ);
      this.mesh.add(signHousing);
      this.taxiSignMesh = signHousing;

      // "TAXI" Black Decal Stripes on sign
      const decalMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
      const stripeF = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.14), decalMat);
      stripeF.position.set(0, lowerHeight + cabinHeight + 0.52, cabinZ + 0.185);
      this.mesh.add(stripeF);

      const stripeB = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.14), decalMat);
      stripeB.position.set(0, lowerHeight + cabinHeight + 0.52, cabinZ - 0.185);
      stripeB.rotation.y = Math.PI;
      this.mesh.add(stripeB);
    }

    // 4. Wheels & Steer Pivots
    // CRITICAL: We separate SteerPivot (rotates Y) from WheelMesh (rolls X)
    const wheelRadius = isSuv ? 0.45 : 0.39;
    const wheelWidth = 0.28;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
    wheelGeo.rotateZ(Math.PI / 2);

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      metalness: 0.1
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.9,
      roughness: 0.18
    });

    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red Brembo-style brake caliper
      metalness: 0.5,
      roughness: 0.3
    });

    const wheelPlacements = [
      { x: -width / 2 - wheelWidth / 3, z: length * 0.31, isFront: true },  // Front Left
      { x: width / 2 + wheelWidth / 3, z: length * 0.31, isFront: true },   // Front Right
      { x: -width / 2 - wheelWidth / 3, z: -length * 0.31, isFront: false },// Rear Left
      { x: width / 2 + wheelWidth / 3, z: -length * 0.31, isFront: false } // Rear Right
    ];

    this.frontSteerPivots = [];
    this.wheelSpinMeshes = [];

    wheelPlacements.forEach(pos => {
      // 1. Pivot group located at wheel axle position
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, wheelRadius, pos.z);

      // 2. Rolling wheel group that spins around X
      const rollGroup = new THREE.Group();

      // Tire
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;
      rollGroup.add(tire);

      // Alloy Rim
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.01, 16),
        rimMat
      );
      rim.rotateZ(Math.PI / 2);
      rollGroup.add(rim);

      // Spokes
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, wheelRadius * 0.6, 0.04), rimMat);
        spoke.rotation.x = (s * Math.PI) / 2.5;
        rollGroup.add(spoke);
      }

      pivot.add(rollGroup);

      // Fixed brake caliper (doesn't roll with wheel)
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.12), caliperMat);
      caliper.position.set(pos.x > 0 ? -0.06 : 0.06, 0.12, 0);
      pivot.add(caliper);

      this.mesh.add(pivot);

      if (pos.isFront) {
        this.frontSteerPivots.push(pivot);
      }
      this.wheelSpinMeshes.push(rollGroup as unknown as THREE.Mesh);
    });

    // 5. Headlights & Turn Indicators (Front)
    const hlHousing = new THREE.BoxGeometry(0.38, 0.16, 0.12);
    const hlGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.95
    });

    // Amber Turn Indicator Material
    const turnMatL = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.1
    });
    const turnMatR = turnMatL.clone();

    [-width * 0.36, width * 0.36].forEach((x, idx) => {
      // Main beam lens
      const hlMesh = new THREE.Mesh(hlHousing, hlGlassMat);
      hlMesh.position.set(x, lowerHeight * 0.65 + 0.36, length / 2 + 0.02);
      this.mesh.add(hlMesh);

      // Front spotlight cone
      const spot = new THREE.SpotLight(0xfffaed, 2.8, 55, Math.PI / 5.5, 0.35, 1.2);
      spot.position.set(x, lowerHeight * 0.65 + 0.36, length / 2 + 0.2);
      spot.target.position.set(x, 0, length / 2 + 30);
      this.mesh.add(spot.target);
      this.headlightGroup.add(spot);

      // Front Turn Indicator on outer edge of headlight
      const indX = x > 0 ? x + 0.24 : x - 0.24;
      const indMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.14, 0.1),
        idx === 0 ? turnMatL : turnMatR
      );
      indMesh.position.set(indX, lowerHeight * 0.65 + 0.36, length / 2 + 0.02);
      this.mesh.add(indMesh);

      if (idx === 0) {
        this.turnSignalsLeft.push(indMesh);
      } else {
        this.turnSignalsRight.push(indMesh);
      }
    });

    this.mesh.add(this.headlightGroup);
    this.headlightGroup.visible = false;

    // 6. Taillights, Reverse Lights & Rear Turn Indicators
    const tlHousing = new THREE.BoxGeometry(0.38, 0.16, 0.12);
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xdc2626,
      emissiveIntensity: 0.3
    });

    const revMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.0
    });

    [-width * 0.36, width * 0.36].forEach((x, idx) => {
      // Taillight
      const tlMesh = new THREE.Mesh(tlHousing, tlMat.clone());
      tlMesh.position.set(x, lowerHeight * 0.65 + 0.36, -length / 2 - 0.02);
      this.mesh.add(tlMesh);
      this.taillightMeshes.push(tlMesh);

      // Reverse Light
      const revMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.1),
        revMat.clone()
      );
      revMesh.position.set(x > 0 ? x - 0.18 : x + 0.18, lowerHeight * 0.65 + 0.36, -length / 2 - 0.02);
      this.mesh.add(revMesh);
      this.reverseLightMeshes.push(revMesh);

      // Rear Turn Indicator
      const indMeshR = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.14, 0.1),
        idx === 0 ? turnMatL : turnMatR
      );
      indMeshR.position.set(x > 0 ? x + 0.24 : x - 0.24, lowerHeight * 0.65 + 0.36, -length / 2 - 0.02);
      this.mesh.add(indMeshR);

      if (idx === 0) {
        this.turnSignalsLeft.push(indMeshR);
      } else {
        this.turnSignalsRight.push(indMeshR);
      }
    });

    // 7. Dual Chrome Exhaust Pipes at Rear
    [-0.45, 0.45].forEach(ex => {
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.35, 12),
        chromeMat
      );
      exhaust.rotateX(Math.PI / 2);
      exhaust.position.set(ex, 0.28, -length / 2 - 0.1);
      this.mesh.add(exhaust);
    });

    // 8. Ground Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(width * 1.25, length * 1.15);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = 0.02;
    this.mesh.add(this.shadowPlane);

    // 9. Underglow Neon (if configured)
    if (this.config.neonColor) {
      const underMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.config.neonColor),
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      });
      this.underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.2, length * 0.95), underMat);
      this.underglowMesh.rotation.x = -Math.PI / 2;
      this.underglowMesh.position.set(0, 0.04, 0);
      this.mesh.add(this.underglowMesh);
    }
  }

  public update(delta: number, inputs: VehicleInputs, world: CityWorld) {
    // 1. High-precision steering computation
    // Max steering angle decreases at high speeds for realistic stability
    const speedRatio = Math.min(1, Math.abs(this.speedKmh) / 110);
    const maxSteerRad = (40 - speedRatio * 18) * (Math.PI / 180); // 40 deg at low speed, 22 deg at top speed

    // Target steering angle based on raw input: -1 (Left), +1 (Right)
    // Inverted so pressing Left steers Left, and Right steers Right
    const steerTarget = -inputs.steering * maxSteerRad;

    // Steering speed: Faster when returning to center, crisp when turning
    const steerSpeed = inputs.steering === 0 ? 24.0 : 16.0 + (this.handlingPower / 40) * 8.0;
    this.steeringAngle += (steerTarget - this.steeringAngle) * Math.min(1, delta * steerSpeed);

    // Physically turn front wheel pivots accurately around Y axis
    this.frontSteerPivots.forEach(pivot => {
      pivot.rotation.y = this.steeringAngle;
    });

    // 2. Throttle & Velocity
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    let forwardSpeed = this.velocity.dot(forward);

    // Fuel check
    const hasFuel = this.currentFuel > 0;
    const effectiveThrottle = hasFuel ? inputs.throttle : (inputs.throttle > 0 ? 0.06 : inputs.throttle);

    if (effectiveThrottle > 0) {
      // Forward acceleration
      if (forwardSpeed < -0.5) {
        // Active braking while moving in reverse
        forwardSpeed += this.brakingPower * 1.8 * delta;
      } else {
        const speedFactor = 1 - Math.max(0, forwardSpeed) / (this.maxSpeedKmh / 3.6);
        const accel = this.accelerationPower * Math.max(0.12, speedFactor);
        forwardSpeed += effectiveThrottle * accel * delta;
      }
      this.currentFuel = Math.max(0, this.currentFuel - delta * 0.05 * effectiveThrottle);
    } else if (effectiveThrottle < 0) {
      // Brake or Reverse
      if (forwardSpeed > 0.6) {
        // Forward braking
        forwardSpeed -= this.brakingPower * 2.0 * delta;
      } else {
        // Reverse acceleration
        const maxRevSpeed = -(this.maxSpeedKmh * 0.38) / 3.6;
        if (forwardSpeed > maxRevSpeed) {
          forwardSpeed += effectiveThrottle * (this.accelerationPower * 0.72) * delta;
        }
      }
    } else {
      // Natural rolling friction & aerodynamic drag
      const drag = 2.8;
      forwardSpeed *= Math.max(0, 1 - drag * delta);
    }

    // 3. Handbrake & Drift mechanics
    this.isDrifting = inputs.handbrake && Math.abs(forwardSpeed) > 4.5;
    if (inputs.handbrake) {
      forwardSpeed *= Math.max(0, 1 - 7.0 * delta);
    }

    // 4. PRECISE VEHICLE TURNING PHYSICS (Ackermann Bicycle Kinematics)
    // Low-speed maneuver assist allows turning out of tight spots / parking curbs
    const isMoving = Math.abs(forwardSpeed) > 0.08 || (inputs.throttle !== 0 && Math.abs(inputs.steering) > 0.1);
    if (isMoving) {
      // Effective maneuver speed guarantees agile low-speed steering
      const maneuverBoost = (inputs.throttle !== 0 && Math.abs(forwardSpeed) < 3.2) ? Math.sign(forwardSpeed || inputs.throttle) * 3.0 : forwardSpeed;
      const wheelbase = 2.65;
      const driftMultiplier = this.isDrifting ? 1.75 : 1.0;

      // In reverse, turning the wheel left steers the rear left (heading changes inversely)
      const turnRate = (maneuverBoost / wheelbase) * Math.sin(this.steeringAngle) * driftMultiplier;
      this.heading += turnRate * delta;
    }

    // Recalculate forward & right vectors immediately after heading turn
    forward.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    right.set(forward.z, 0, -forward.x);

    // Reconstruct velocity with lateral grip vs drift slip
    const lateralSpeed = this.velocity.dot(right);
    const lateralGrip = this.isDrifting ? 0.35 : 0.92;
    const newLateralSpeed = lateralSpeed * (1 - lateralGrip);

    this.velocity.copy(forward).multiplyScalar(forwardSpeed).addScaledVector(right, newLateralSpeed);
    this.speedKmh = forwardSpeed * 3.6;

    // 5. Update position & resolve collisions with world obstacles
    const nextPos = this.position.clone().addScaledVector(this.velocity, delta);
    this.resolveCollisions(nextPos, world);
    this.position.copy(nextPos);

    // 6. Realistic Suspension & Weight Transfer (Pitch & Roll)
    // Pitch: nose dives on braking, squats on acceleration
    const targetPitch = (effectiveThrottle * 0.045) - (forwardSpeed * 0.0018);
    // Roll: centrifugal force rolls chassis outward (opposite to steering turn)
    const targetRoll = -inputs.steering * Math.min(1, Math.abs(forwardSpeed) / 16) * 0.065;

    this.pitchAngle += (targetPitch - this.pitchAngle) * Math.min(1, delta * 9);
    this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1, delta * 9);

    // 7. Apply transform to Three.js Mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.x = this.pitchAngle;
    this.mesh.rotation.z = this.rollAngle;

    // Spin wheels along X axis based on distance rolled
    const wheelSpin = (forwardSpeed * delta) / 0.39;
    this.wheelSpinMeshes.forEach(w => {
      w.rotation.x += wheelSpin;
    });

    // 8. Turn Indicators Blinking (Amber Flashes when steering Left or Right)
    this.blinkTimer += delta;
    if (this.blinkTimer > 0.32) {
      this.blinkTimer = 0;
      this.blinkState = !this.blinkState;
    }

    const isLeftTurn = inputs.steering < -0.15;
    const isRightTurn = inputs.steering > 0.15;

    this.turnSignalsLeft.forEach(mesh => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (isLeftTurn && this.blinkState) ? 1.6 : 0.05;
    });

    this.turnSignalsRight.forEach(mesh => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (isRightTurn && this.blinkState) ? 1.6 : 0.05;
    });

    // 9. Brake Lights and Reverse Lights
    const isBraking = (inputs.throttle < 0 && forwardSpeed > 0.5) || inputs.handbrake;
    this.taillightMeshes.forEach(tl => {
      (tl.material as THREE.MeshStandardMaterial).emissiveIntensity = isBraking ? 1.8 : 0.35;
    });

    const isReversing = forwardSpeed < -0.2 || (inputs.throttle < 0 && forwardSpeed <= 0.2);
    this.reverseLightMeshes.forEach(rev => {
      (rev.material as THREE.MeshStandardMaterial).emissiveIntensity = isReversing ? 1.2 : 0.0;
    });

    // 10. Headlights
    this.headlightsOn = inputs.headlights;
    this.headlightGroup.visible = this.headlightsOn;

    // Audio sync
    soundManager.updateEngine(this.speedKmh, effectiveThrottle, this.isDrifting);
  }

  private resolveCollisions(nextPos: THREE.Vector3, world: CityWorld) {
    const carRadius = 1.55;
    this.isColliding = false;

    for (const obs of world.colliders) {
      const closestX = Math.max(obs.min.x, Math.min(nextPos.x, obs.max.x));
      const closestZ = Math.max(obs.min.z, Math.min(nextPos.z, obs.max.z));

      const dx = nextPos.x - closestX;
      const dz = nextPos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < carRadius * carRadius) {
        this.isColliding = true;
        const dist = Math.sqrt(distSq);
        const overlap = carRadius - dist;

        const nx = dist > 0.001 ? dx / dist : 0;
        const nz = dist > 0.001 ? dz / dist : 1;

        // Push car out smoothly
        nextPos.x += nx * overlap;
        nextPos.z += nz * overlap;

        const impactSpeed = this.velocity.length() * 3.6;
        if (impactSpeed > 16) {
          soundManager.playCollision(Math.min(1, impactSpeed / 85));
          const damage = Math.round((impactSpeed / 14) * (100 / this.maxDurability));
          this.currentHealth = Math.max(0, this.currentHealth - damage);
        }

        // Elastic bounce
        const restitution = 0.35;
        const dot = this.velocity.x * nx + this.velocity.z * nz;
        if (dot < 0) {
          this.velocity.x -= (1 + restitution) * dot * nx;
          this.velocity.z -= (1 + restitution) * dot * nz;
        }
        break;
      }
    }
  }

  public repair(amount: number = 100) {
    this.currentHealth = Math.min(this.maxDurability, this.currentHealth + amount);
  }

  public refuel(amount: number = 100) {
    this.currentFuel = Math.min(this.maxFuel, this.currentFuel + amount);
  }

  public getTelemetry(): VehicleTelemetry {
    return {
      speedKmh: Math.round(this.speedKmh),
      rpm: Math.round(850 + (Math.abs(this.speedKmh) / this.maxSpeedKmh) * 6200),
      gear: this.speedKmh < -1 ? 'R' : Math.abs(this.speedKmh) < 1.5 ? 'N' : Math.min(5, Math.floor(Math.abs(this.speedKmh) / 28) + 1),
      fuel: Math.round((this.currentFuel / this.maxFuel) * 100),
      maxFuel: this.maxFuel,
      health: Math.round((this.currentHealth / this.maxDurability) * 100),
      maxHealth: this.maxDurability,
      isColliding: this.isColliding,
      isDrifting: this.isDrifting,
      headlights: this.headlightsOn
    };
  }
}
