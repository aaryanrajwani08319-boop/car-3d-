import * as THREE from 'three';
import { CityWorld } from './CityWorld';
import { VehiclePhysics, VehicleInputs } from './VehiclePhysics';
import { TrafficManager } from './TrafficManager';
import { NavigationSystem } from './NavigationSystem';
import { VehicleConfig, VehicleUpgrades, TripJob, WeatherType, VehicleTelemetry } from '../types/game';
import { soundManager } from '../audio/SoundManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  public world: CityWorld;
  public vehicle: VehiclePhysics;
  public traffic: TrafficManager;
  public navigation: NavigationSystem;

  // Animation & Clock
  private clock: THREE.Clock = new THREE.Clock();
  private animId: number = 0;
  private isRunning: boolean = false;

  // Active Key State Tracking
  private activeKeys: Set<string> = new Set();

  // Control Inputs
  public inputs: VehicleInputs = {
    throttle: 0,
    steering: 0,
    handbrake: false,
    horn: false,
    headlights: false
  };

  // Camera Settings
  public cameraMode: 'third_person' | 'hood' | 'first_person' = 'third_person';
  private smoothedCamPos: THREE.Vector3 = new THREE.Vector3(0, 5, -10);
  private smoothedLookTarget: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  // Gameplay State
  public activeJob: TripJob | null = null;
  public passengerInCab: boolean = false;
  public canPickup: boolean = false;
  public canDropoff: boolean = false;
  public isNearGasStation: boolean = false;
  public currentWeather: WeatherType = 'clear';
  public currentDistrictName: string = 'Metro City';

  // Rain particle system
  private rainParticles: THREE.Points | null = null;
  private rainGeo: THREE.BufferGeometry | null = null;

  // Callbacks
  public onTelemetryUpdate?: (telemetry: VehicleTelemetry) => void;
  public onPickupAvailable?: (available: boolean) => void;
  public onDropoffAvailable?: (available: boolean) => void;
  public onGasStationNearby?: (nearby: boolean) => void;
  public onDistrictChange?: (districtName: string) => void;
  public onPickupAction?: () => void;
  public onDropoffAction?: () => void;
  public onRefuelAction?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    vehicleConfig: VehicleConfig,
    upgrades: VehicleUpgrades,
    customColor?: string
  ) {
    this.canvas = canvas;

    // Renderer with high-precision anti-aliasing and shadow maps
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.4, 1400);

    // Subsystems
    this.world = new CityWorld(this.scene);
    this.vehicle = new VehiclePhysics(vehicleConfig, upgrades, customColor);
    this.scene.add(this.vehicle.mesh);

    this.traffic = new TrafficManager(this.scene);
    this.traffic.initTraffic(this.world, 24, 20);

    this.navigation = new NavigationSystem(this.scene);

    this.initRain();
    this.setupListeners();
  }

  private initRain() {
    const rainCount = 2000;
    this.rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = Math.random() * 55;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }

    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.28,
      transparent: true,
      opacity: 0.7
    });

    this.rainParticles = new THREE.Points(this.rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  private setupListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL Context Lost');
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.info('WebGL Context Restored');
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private onResize = () => {
    if (!this.canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updateInputsFromKeys() {
    // Precise Left / Right Steering resolution
    let steer = 0;
    if (this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft')) steer -= 1;
    if (this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight')) steer += 1;
    this.inputs.steering = steer;

    // Precise Throttle / Reverse resolution
    let throttle = 0;
    if (this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp')) throttle += 1;
    if (this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown')) throttle -= 1;
    this.inputs.throttle = throttle;

    // Handbrake
    this.inputs.handbrake = this.activeKeys.has('Space');
  }

  private onKeyDown = (e: KeyboardEvent) => {
    soundManager.resume();

    // Prevent scrolling with arrows or space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    this.activeKeys.add(e.code);
    this.updateInputsFromKeys();

    switch (e.code) {
      case 'KeyH':
        soundManager.playHorn();
        break;
      case 'KeyL':
        this.inputs.headlights = !this.inputs.headlights;
        break;
      case 'KeyC':
        this.cycleCamera();
        break;
      case 'KeyE':
        this.handleActionKey();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.activeKeys.delete(e.code);
    this.updateInputsFromKeys();
  };

  private onBlur = () => {
    // Reset key states if user switches window/tab
    this.activeKeys.clear();
    this.inputs.steering = 0;
    this.inputs.throttle = 0;
    this.inputs.handbrake = false;
  };

  public cycleCamera() {
    if (this.cameraMode === 'third_person') {
      this.cameraMode = 'hood';
    } else if (this.cameraMode === 'hood') {
      this.cameraMode = 'first_person';
    } else {
      this.cameraMode = 'third_person';
    }
  }

  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;
    this.world.setWeather(weather);

    if (this.rainParticles) {
      this.rainParticles.visible = weather === 'rain';
    }

    if (weather === 'night' || weather === 'rain') {
      this.inputs.headlights = true;
      this.traffic.setHeadlights(true);
    } else {
      this.traffic.setHeadlights(false);
    }
  }

  public setJob(job: TripJob | null) {
    this.activeJob = job;
    this.passengerInCab = false;
    this.canPickup = false;
    this.canDropoff = false;

    if (job) {
      this.navigation.setTarget(job.pickupPos, 'pickup');
      soundManager.playNavAlert();
    } else {
      this.navigation.setTarget(null, 'pickup');
    }
  }

  public handleActionKey() {
    if (this.canPickup && !this.passengerInCab) {
      this.pickupPassenger();
    } else if (this.canDropoff && this.passengerInCab) {
      this.dropoffPassenger();
    } else if (this.isNearGasStation) {
      this.refuelCab();
    }
  }

  public pickupPassenger(): boolean {
    if (!this.activeJob || this.passengerInCab) return false;
    this.passengerInCab = true;
    this.canPickup = false;
    if (this.onPickupAvailable) this.onPickupAvailable(false);

    soundManager.playPickup();

    // Switch GPS target to destination
    this.navigation.setTarget(this.activeJob.destinationPos, 'destination');
    soundManager.playNavAlert();

    if (this.onPickupAction) this.onPickupAction();
    return true;
  }

  public dropoffPassenger(): boolean {
    if (!this.activeJob || !this.passengerInCab) return false;
    this.passengerInCab = false;
    this.canDropoff = false;
    if (this.onDropoffAvailable) this.onDropoffAvailable(false);

    soundManager.playDropoff();
    soundManager.playCash();

    this.navigation.setTarget(null, 'destination');

    if (this.onDropoffAction) this.onDropoffAction();
    return true;
  }

  public refuelCab() {
    this.vehicle.refuel(100);
    soundManager.playCash();
    if (this.onRefuelAction) this.onRefuelAction();
  }

  public refuelVehicle(amount: number = 30): boolean {
    this.vehicle.refuel(amount);
    soundManager.playCash();
    return true;
  }

  public repairVehicle(amount: number = 100): boolean {
    this.vehicle.repair(amount);
    soundManager.playCash();
    return true;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.animId = requestAnimationFrame(this.loop);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.render();
  };

  private update(delta: number) {
    // 1. Update vehicle physics
    this.vehicle.update(delta, this.inputs, this.world);

    // 2. Update AI traffic
    this.traffic.update(delta, this.vehicle.position, this.world);

    // 3. Update GPS navigation
    this.navigation.update(delta, this.vehicle.position, this.world);

    // 4. District check
    this.checkCurrentDistrict();

    // 5. Pickup / Dropoff proximity checks
    const carPos = this.vehicle.position;
    const carSpeed = Math.abs(this.vehicle.speedKmh);

    if (this.activeJob) {
      if (!this.passengerInCab) {
        const pPos = this.activeJob.pickupPos;
        const dx = carPos.x - pPos[0];
        const dz = carPos.z - pPos[2];
        const distToPickup = Math.sqrt(dx * dx + dz * dz);

        const available = distToPickup < 9.5 && carSpeed < 20;
        if (available !== this.canPickup) {
          this.canPickup = available;
          if (this.onPickupAvailable) this.onPickupAvailable(available);
        }
      } else {
        const dPos = this.activeJob.destinationPos;
        const dx = carPos.x - dPos[0];
        const dz = carPos.z - dPos[2];
        const distToDest = Math.sqrt(dx * dx + dz * dz);

        const available = distToDest < 9.5 && carSpeed < 20;
        if (available !== this.canDropoff) {
          this.canDropoff = available;
          if (this.onDropoffAvailable) this.onDropoffAvailable(available);
        }
      }
    }

    // 6. Gas station proximity check
    let nearGas = false;
    for (const gas of this.world.gasStations) {
      if (carPos.distanceTo(gas.position) < gas.radius && carSpeed < 12) {
        nearGas = true;
        break;
      }
    }
    if (nearGas !== this.isNearGasStation) {
      this.isNearGasStation = nearGas;
      if (this.onGasStationNearby) this.onGasStationNearby(nearGas);
    }

    // 7. Rain particles follow player
    if (this.rainParticles && this.rainParticles.visible && this.rainGeo) {
      this.rainParticles.position.set(carPos.x, 0, carPos.z);
      const posAttr = this.rainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - delta * 36;
        if (y < 0) y = 48;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 8. Smooth dynamic camera positioning
    this.updateCamera(delta);

    // 9. Telemetry callback
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate(this.vehicle.getTelemetry());
    }
  }

  private updateCamera(delta: number) {
    const carPos = this.vehicle.position;
    const carYaw = this.vehicle.heading;
    const speedRatio = Math.min(1, Math.abs(this.vehicle.speedKmh) / 140);

    const forward = new THREE.Vector3(Math.sin(carYaw), 0, Math.cos(carYaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    if (this.cameraMode === 'third_person') {
      // Dynamic chase camera centered directly behind vehicle
      const chaseDistance = 7.2 + speedRatio * 2.2;
      const chaseHeight = 3.1 + speedRatio * 0.7;

      const targetCamPos = carPos.clone()
        .addScaledVector(forward, -chaseDistance)
        .add(new THREE.Vector3(0, chaseHeight, 0));

      const lookTarget = carPos.clone()
        .add(new THREE.Vector3(0, 1.35, 0))
        .addScaledVector(forward, 3.2);

      // Smooth camera interpolation
      this.smoothedCamPos.lerp(targetCamPos, Math.min(1, delta * 10.0));
      this.smoothedLookTarget.lerp(lookTarget, Math.min(1, delta * 12.0));

      this.camera.position.copy(this.smoothedCamPos);
      this.camera.lookAt(this.smoothedLookTarget);

      // Dynamic FOV widening at speed
      const targetFov = 64 + speedRatio * 16;
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, delta * 6.0);
      this.camera.updateProjectionMatrix();

    } else if (this.cameraMode === 'hood') {
      // Bumper/Hood Cam
      const hoodPos = carPos.clone().addScaledVector(forward, 1.85).add(new THREE.Vector3(0, 0.95, 0));
      const lookTarget = hoodPos.clone().addScaledVector(forward, 25.0);
      this.camera.position.copy(hoodPos);
      this.camera.lookAt(lookTarget);
      this.camera.fov = 76;
      this.camera.updateProjectionMatrix();

    } else if (this.cameraMode === 'first_person') {
      // Cockpit / Driver view
      const leftOffset = right.clone().multiplyScalar(-0.4);
      const cockpitPos = carPos.clone().add(new THREE.Vector3(0, 1.38, 0)).addScaledVector(forward, 0.15).add(leftOffset);
      const lookTarget = cockpitPos.clone().addScaledVector(forward, 20.0);
      this.camera.position.copy(cockpitPos);
      this.camera.lookAt(lookTarget);
      this.camera.fov = 70;
      this.camera.updateProjectionMatrix();
    }
  }

  private checkCurrentDistrict() {
    const px = this.vehicle.position.x;
    const pz = this.vehicle.position.z;

    let nearest = 'Metro City';
    let minD = Infinity;

    const districts = [
      { name: 'Metro City', x: 0, z: 0 },
      { name: 'Downtown', x: 320, z: 0 },
      { name: 'Green Valley', x: -320, z: 0 },
      { name: 'Riverside', x: 0, z: 320 },
      { name: 'Beach City', x: 320, z: 320 },
      { name: 'Hill Town', x: -320, z: 320 },
      { name: 'Industrial City', x: -320, z: -320 },
      { name: 'Airport City', x: 320, z: -320 }
    ];

    districts.forEach(d => {
      const dist = (d.x - px) ** 2 + (d.z - pz) ** 2;
      if (dist < minD) {
        minD = dist;
        nearest = d.name;
      }
    });

    if (nearest !== this.currentDistrictName) {
      this.currentDistrictName = nearest;
      if (this.onDistrictChange) this.onDistrictChange(nearest);
    }
  }

  public switchVehicle(config: VehicleConfig, upgrades: VehicleUpgrades, customColor?: string) {
    const oldPos = this.vehicle.position.clone();
    const oldHeading = this.vehicle.heading;

    this.scene.remove(this.vehicle.mesh);
    this.vehicle = new VehiclePhysics(config, upgrades, customColor);
    this.vehicle.position.copy(oldPos);
    this.vehicle.heading = oldHeading;
    this.scene.add(this.vehicle.mesh);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.renderer.dispose();
  }
}
