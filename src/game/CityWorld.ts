import * as THREE from 'three';
import { DISTRICTS } from '../data/gameData';
import { WeatherType } from '../types/game';

export interface RoadSegment {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  width: number;
  lanes: number;
  districtId?: string;
}

export interface RoadNode {
  id: string;
  position: THREE.Vector3;
  connections: string[]; // ids of connected nodes
}

export interface ObstacleBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  type: 'building' | 'prop' | 'barrier' | 'bridge';
}

export class CityWorld {
  public scene: THREE.Scene;
  public colliders: ObstacleBox[] = [];
  public roadSegments: RoadSegment[] = [];
  public roadNodes: Map<string, RoadNode> = new Map();
  public gasStations: { position: THREE.Vector3; radius: number }[] = [];

  // Environment lighting
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemisphereLight: THREE.HemisphereLight;
  public streetLights: THREE.PointLight[] = [];
  public streetlightMeshes: THREE.Mesh[] = [];
  public buildingMaterials: THREE.MeshStandardMaterial[] = [];
  public windowMaterials: THREE.MeshStandardMaterial[] = [];
  public skyMesh!: THREE.Mesh;

  private roadMaterial: THREE.MeshStandardMaterial;
  private roadMarkingMaterial: THREE.MeshBasicMaterial;
  private roadWhiteMarkingMaterial: THREE.MeshBasicMaterial;
  private sidewalkMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Base materials
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.85,
      metalness: 0.12
    });

    this.roadMarkingMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide
    });

    this.roadWhiteMarkingMaterial = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      side: THREE.DoubleSide
    });

    this.sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.88,
      metalness: 0.05
    });

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.45);
    this.scene.add(this.hemisphereLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
    this.sunLight.position.set(200, 350, 150);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1000;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.02;
    const shadowD = 400;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.sunLight);

    this.createSkyDome();
    this.buildTerrainAndGround();
    this.buildRoadNetwork();
    this.buildDistricts();
    this.buildGasStations();
    this.buildWaterFeature();
    this.setWeather('clear');
  }

  private createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(800, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x70b5ff,
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  private buildTerrainAndGround() {
    // Vast ground terrain
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2e26, // rich grass/landscape green
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // City limit barrier colliders
    const limit = 620;
    this.addBarrierBox(-limit, 0, 0, 20, 30, limit * 2);
    this.addBarrierBox(limit, 0, 0, 20, 30, limit * 2);
    this.addBarrierBox(0, 0, -limit, limit * 2, 30, 20);
    this.addBarrierBox(0, 0, limit, limit * 2, 30, 20);
  }

  private addBarrierBox(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    this.colliders.push({
      min: new THREE.Vector3(x - sx / 2, y, z - sz / 2),
      max: new THREE.Vector3(x + sx / 2, y + sy, z + sz / 2),
      center: new THREE.Vector3(x, y + sy / 2, z),
      size: new THREE.Vector3(sx, sy, sz),
      type: 'barrier'
    });
  }

  private buildRoadNetwork() {
    // Create road graph connecting all 8 districts and intermediate avenues
    // Grid axes: X in [-320, 0, 320], Z in [-320, 0, 320]
    const coords = [-320, 0, 320];

    // Create intersection nodes
    coords.forEach(x => {
      coords.forEach(z => {
        const id = `node_${x}_${z}`;
        this.roadNodes.set(id, {
          id,
          position: new THREE.Vector3(x, 0, z),
          connections: []
        });
      });
    });

    // Add intermediate nodes to make realistic grid blocks
    const subCoords = [-320, -160, 0, 160, 320];
    subCoords.forEach(x => {
      subCoords.forEach(z => {
        const id = `node_${x}_${z}`;
        if (!this.roadNodes.has(id)) {
          this.roadNodes.set(id, {
            id,
            position: new THREE.Vector3(x, 0, z),
            connections: []
          });
        }
      });
    });

    // Connect horizontal and vertical roads
    const roadWidth = 14;
    for (let i = 0; i < subCoords.length; i++) {
      for (let j = 0; j < subCoords.length; j++) {
        const currentX = subCoords[i];
        const currentZ = subCoords[j];
        const currentId = `node_${currentX}_${currentZ}`;

        // Connect East (positive X)
        if (i < subCoords.length - 1) {
          const nextX = subCoords[i + 1];
          const nextId = `node_${nextX}_${currentZ}`;
          this.connectRoadNodes(currentId, nextId, roadWidth);
        }

        // Connect South (positive Z)
        if (j < subCoords.length - 1) {
          const nextZ = subCoords[j + 1];
          const nextId = `node_${currentX}_${nextZ}`;
          this.connectRoadNodes(currentId, nextId, roadWidth);
        }
      }
    }

    // Render physical road meshes
    this.roadSegments.forEach(seg => {
      this.createRoadMesh(seg);
    });
  }

  private connectRoadNodes(nodeIdA: string, nodeIdB: string, width: number) {
    const nodeA = this.roadNodes.get(nodeIdA);
    const nodeB = this.roadNodes.get(nodeIdB);
    if (!nodeA || !nodeB) return;

    if (!nodeA.connections.includes(nodeIdB)) nodeA.connections.push(nodeIdB);
    if (!nodeB.connections.includes(nodeIdA)) nodeB.connections.push(nodeIdA);

    const segId = `seg_${nodeIdA}_${nodeIdB}`;
    this.roadSegments.push({
      id: segId,
      start: nodeA.position.clone(),
      end: nodeB.position.clone(),
      width,
      lanes: 4
    });
  }

  private createRoadMesh(seg: RoadSegment) {
    const start = seg.start;
    const end = seg.end;
    const diff = new THREE.Vector3().subVectors(end, start);
    const length = diff.length();
    const angle = Math.atan2(diff.x, diff.z);

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // 1. Road asphalt surface
    const roadGeo = new THREE.PlaneGeometry(seg.width, length);
    const roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.rotation.z = -angle;
    roadMesh.position.set(mid.x, 0.05, mid.z);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // 2. Double Yellow Centerlines (Separated by 0.35m)
    [-0.18, 0.18].forEach(cOffset => {
      const yellowLineGeo = new THREE.PlaneGeometry(0.14, length);
      const yellowLine = new THREE.Mesh(yellowLineGeo, this.roadMarkingMaterial);
      yellowLine.rotation.x = -Math.PI / 2;
      yellowLine.rotation.z = -angle;

      const normX = -Math.cos(angle) * cOffset;
      const normZ = Math.sin(angle) * cOffset;
      yellowLine.position.set(mid.x + normX, 0.07, mid.z + normZ);
      this.scene.add(yellowLine);
    });

    // 3. White Solid Road Shoulder Lines (Along both sidewalk curbs)
    [-seg.width / 2 + 0.35, seg.width / 2 - 0.35].forEach(eOffset => {
      const edgeLineGeo = new THREE.PlaneGeometry(0.18, length);
      const edgeLine = new THREE.Mesh(edgeLineGeo, this.roadWhiteMarkingMaterial);
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.rotation.z = -angle;

      const normX = -Math.cos(angle) * eOffset;
      const normZ = Math.sin(angle) * eOffset;
      edgeLine.position.set(mid.x + normX, 0.07, mid.z + normZ);
      this.scene.add(edgeLine);
    });

    // 4. White Dashed Lane Dividers (Mid-lane guidelines)
    [-seg.width * 0.25, seg.width * 0.25].forEach(laneOffset => {
      const dashLength = 4.0;
      const gapLength = 4.0;
      const numDashes = Math.floor(length / (dashLength + gapLength));

      for (let d = 0; d < numDashes; d++) {
        const dAlpha = (d * (dashLength + gapLength) + dashLength / 2) / length;
        const dPos = new THREE.Vector3().lerpVectors(start, end, dAlpha);

        const normX = -Math.cos(angle) * laneOffset;
        const normZ = Math.sin(angle) * laneOffset;

        const dashGeo = new THREE.PlaneGeometry(0.16, dashLength);
        const dashMesh = new THREE.Mesh(dashGeo, this.roadWhiteMarkingMaterial);
        dashMesh.rotation.x = -Math.PI / 2;
        dashMesh.rotation.z = -angle;
        dashMesh.position.set(dPos.x + normX, 0.07, dPos.z + normZ);
        this.scene.add(dashMesh);
      }
    });

    // 5. Zebra Crossings near intersections (14m from each end)
    [14, length - 14].forEach(crossDist => {
      if (length > 45) {
        const cAlpha = crossDist / length;
        const crossCenter = new THREE.Vector3().lerpVectors(start, end, cAlpha);
        const stripeCount = 8;
        const stripeSpan = (seg.width - 2.0) / stripeCount;

        for (let s = 0; s < stripeCount; s++) {
          const sOffset = -seg.width / 2 + 1.0 + (s + 0.5) * stripeSpan;
          const normX = -Math.cos(angle) * sOffset;
          const normZ = Math.sin(angle) * sOffset;

          const zebraGeo = new THREE.PlaneGeometry(0.5, 3.2);
          const zebraMesh = new THREE.Mesh(zebraGeo, this.roadWhiteMarkingMaterial);
          zebraMesh.rotation.x = -Math.PI / 2;
          zebraMesh.rotation.z = -angle;
          zebraMesh.position.set(crossCenter.x + normX, 0.075, crossCenter.z + normZ);
          this.scene.add(zebraMesh);
        }
      }
    });

    // 6. Sidewalks on left and right with step curb
    const swWidth = 2.6;
    const swHeight = 0.28;
    const leftOffset = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(seg.width / 2 + swWidth / 2);
    const rightOffset = leftOffset.clone().negate();

    const swGeo = new THREE.BoxGeometry(swWidth, swHeight, length);
    const leftSw = new THREE.Mesh(swGeo, this.sidewalkMaterial);
    leftSw.rotation.y = angle;
    leftSw.position.set(mid.x + leftOffset.x, swHeight / 2, mid.z + leftOffset.z);
    leftSw.receiveShadow = true;
    this.scene.add(leftSw);

    const rightSw = new THREE.Mesh(swGeo, this.sidewalkMaterial);
    rightSw.rotation.y = angle;
    rightSw.position.set(mid.x + rightOffset.x, swHeight / 2, mid.z + rightOffset.z);
    rightSw.receiveShadow = true;
    this.scene.add(rightSw);

    // 7. Streetlights along segment
    const numLights = Math.floor(length / 45);
    for (let k = 1; k <= numLights; k++) {
      const alpha = k / (numLights + 1);
      const lightPos = new THREE.Vector3().lerpVectors(start, end, alpha);
      const lampOffset = leftOffset.clone().multiplyScalar(0.92);
      this.createStreetLight(lightPos.x + lampOffset.x, lightPos.z + lampOffset.z);
    }
  }

  private createStreetLight(x: number, z: number) {
    const poleHeight = 7;
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, poleHeight, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, poleHeight / 2, z);
    pole.castShadow = true;
    this.scene.add(pole);

    // Lamp arm & glowing head
    const armGeo = new THREE.BoxGeometry(0.8, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(x + 0.3, poleHeight - 0.2, z);
    this.scene.add(arm);

    const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff4d6,
      emissive: 0xffcc44,
      emissiveIntensity: 0.8
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(x + 0.6, poleHeight - 0.4, z);
    this.scene.add(bulb);
    this.streetlightMeshes.push(bulb);

    // Soft point light
    const pointLight = new THREE.PointLight(0xffdf80, 0.4, 25, 2);
    pointLight.position.set(x + 0.6, poleHeight - 0.5, z);
    this.scene.add(pointLight);
    this.streetLights.push(pointLight);
  }

  private buildDistricts() {
    // Generate distinct architectural blocks inside grid cells
    const cellOffsets = [
      // Block centers in between the grid roads
      [-240, -240], [-80, -240], [80, -240], [240, -240],
      [-240, -80], [-80, -80], [80, -80], [240, -80],
      [-240, 80], [-80, 80], [80, 80], [240, 80],
      [-240, 240], [-80, 240], [80, 240], [240, 240]
    ];

    cellOffsets.forEach(([cx, cz]) => {
      // Determine which district this cell is closest to
      let closestDist = Infinity;
      let districtId = 'metro_city';
      DISTRICTS.forEach(d => {
        const dx = d.center[0] - cx;
        const dz = d.center[1] - cz;
        const dist = dx * dx + dz * dz;
        if (dist < closestDist) {
          closestDist = dist;
          districtId = d.id;
        }
      });

      this.populateDistrictCell(cx, cz, districtId);
    });
  }

  private populateDistrictCell(cx: number, cz: number, districtId: string) {
    switch (districtId) {
      case 'metro_city':
      case 'downtown':
        this.buildSkyscraperBlock(cx, cz, districtId === 'downtown');
        break;
      case 'green_valley':
        this.buildSuburbanParkBlock(cx, cz);
        break;
      case 'beach_city':
        this.buildResortBlock(cx, cz);
        break;
      case 'hill_town':
        this.buildHillTownBlock(cx, cz);
        break;
      case 'industrial_city':
        this.buildIndustrialBlock(cx, cz);
        break;
      case 'airport_city':
        this.buildAirportBlock(cx, cz);
        break;
      case 'riverside':
        this.buildWaterfrontBlock(cx, cz);
        break;
      default:
        this.buildSkyscraperBlock(cx, cz, false);
    }
  }

  private buildSkyscraperBlock(cx: number, cz: number, hasNeon: boolean) {
    // 4 to 6 tall buildings per block
    const subPositions = [
      [-35, -35], [35, -35], [-35, 35], [35, 35], [0, 0]
    ];

    subPositions.forEach(([ox, oz], idx) => {
      const bx = cx + ox;
      const bz = cz + oz;
      const width = 28 + Math.random() * 14;
      const depth = 28 + Math.random() * 14;
      const height = 45 + Math.random() * 85;

      const colors = [0x1e293b, 0x334155, 0x0f172a, 0x475569, 0x27272a];
      const color = colors[idx % colors.length];

      const bMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.6
      });
      this.buildingMaterials.push(bMat);

      const bGeo = new THREE.BoxGeometry(width, height, depth);
      const building = new THREE.Mesh(bGeo, bMat);
      building.position.set(bx, height / 2, bz);
      building.castShadow = true;
      building.receiveShadow = true;
      this.scene.add(building);

      // Window grid texture simulation via emissive horizontal strips or rooftop structures
      const roofGeo = new THREE.BoxGeometry(width * 0.7, 5, depth * 0.7);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(bx, height + 2.5, bz);
      this.scene.add(roof);

      // Add neon sign if downtown
      if (hasNeon && idx === 0) {
        const signGeo = new THREE.BoxGeometry(width * 0.8, 4, 1);
        const signMat = new THREE.MeshStandardMaterial({
          color: 0xec4899,
          emissive: 0xec4899,
          emissiveIntensity: 0.9
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(bx, height * 0.8, bz + depth / 2 + 0.6);
        this.scene.add(sign);
      }

      // Add obstacle collider
      this.colliders.push({
        min: new THREE.Vector3(bx - width / 2, 0, bz - depth / 2),
        max: new THREE.Vector3(bx + width / 2, height, bz + depth / 2),
        center: new THREE.Vector3(bx, height / 2, bz),
        size: new THREE.Vector3(width, height, depth),
        type: 'building'
      });
    });

    // Street trees on corner sidewalks
    this.createTree(cx - 55, cz - 55, 'oak');
    this.createTree(cx + 55, cz + 55, 'oak');
  }

  private buildSuburbanParkBlock(cx: number, cz: number) {
    // Park lawns, small houses with gabled roofs, fountains and lush trees
    const houseCoords = [
      [-40, -40], [40, -40], [-40, 40], [40, 40]
    ];

    houseCoords.forEach(([ox, oz]) => {
      const hx = cx + ox;
      const hz = cz + oz;
      const width = 20;
      const depth = 20;
      const height = 10;

      const houseMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
      const houseGeo = new THREE.BoxGeometry(width, height, depth);
      const house = new THREE.Mesh(houseGeo, houseMat);
      house.position.set(hx, height / 2, hz);
      house.castShadow = true;
      this.scene.add(house);

      // Roof cone/pyramid
      const roofGeo = new THREE.ConeGeometry(width * 0.75, 6, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(hx, height + 3, hz);
      this.scene.add(roof);

      this.colliders.push({
        min: new THREE.Vector3(hx - width / 2, 0, hz - depth / 2),
        max: new THREE.Vector3(hx + width / 2, height + 6, hz + depth / 2),
        center: new THREE.Vector3(hx, (height + 6) / 2, hz),
        size: new THREE.Vector3(width, height + 6, depth),
        type: 'building'
      });

      this.createTree(hx + 18, hz + 5, 'oak');
    });

    // Central park pavilion & trees
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.createTree(cx + Math.cos(angle) * 25, cz + Math.sin(angle) * 25, 'pine');
    }
  }

  private buildResortBlock(cx: number, cz: number) {
    // Hotel towers, pools, and tropical palm trees
    const hWidth = 45;
    const hDepth = 30;
    const hHeight = 55;
    const hotelMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    const hotel = new THREE.Mesh(new THREE.BoxGeometry(hWidth, hHeight, hDepth), hotelMat);
    hotel.position.set(cx, hHeight / 2, cz - 20);
    hotel.castShadow = true;
    this.scene.add(hotel);

    this.colliders.push({
      min: new THREE.Vector3(cx - hWidth / 2, 0, cz - 20 - hDepth / 2),
      max: new THREE.Vector3(cx + hWidth / 2, hHeight, cz - 20 + hDepth / 2),
      center: new THREE.Vector3(cx, hHeight / 2, cz - 20),
      size: new THREE.Vector3(hWidth, hHeight, hDepth),
      type: 'building'
    });

    // Resort pool
    const poolGeo = new THREE.PlaneGeometry(35, 25);
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.2 });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, 0.1, cz + 25);
    this.scene.add(pool);

    // Palm trees
    this.createTree(cx - 30, cz + 20, 'palm');
    this.createTree(cx + 30, cz + 20, 'palm');
    this.createTree(cx - 20, cz + 45, 'palm');
    this.createTree(cx + 20, cz + 45, 'palm');
  }

  private buildHillTownBlock(cx: number, cz: number) {
    // Mountain terrace base & observatory dome
    const mountGeo = new THREE.CylinderGeometry(55, 65, 14, 12);
    const mountMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
    const mountain = new THREE.Mesh(mountGeo, mountMat);
    mountain.position.set(cx, 7, cz);
    mountain.receiveShadow = true;
    this.scene.add(mountain);

    // Observatory dome
    const domeGeo = new THREE.SphereGeometry(14, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.2 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(cx, 14, cz);
    this.scene.add(dome);

    // Radio antenna tower
    const mastGeo = new THREE.CylinderGeometry(0.4, 1.2, 45, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(cx, 14 + 22.5, cz);
    this.scene.add(mast);

    this.colliders.push({
      min: new THREE.Vector3(cx - 50, 0, cz - 50),
      max: new THREE.Vector3(cx + 50, 35, cz + 50),
      center: new THREE.Vector3(cx, 17.5, cz),
      size: new THREE.Vector3(100, 35, 100),
      type: 'building'
    });

    // Mountain pines
    for (let k = 0; k < 8; k++) {
      const rad = 60 + Math.random() * 15;
      const th = Math.random() * Math.PI * 2;
      this.createTree(cx + Math.cos(th) * rad, cz + Math.sin(th) * rad, 'pine');
    }
  }

  private buildIndustrialBlock(cx: number, cz: number) {
    // Metal warehouses, smokestacks and cargo containers
    const whWidth = 60;
    const whDepth = 35;
    const whHeight = 16;
    const whMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.6 });
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(whWidth, whHeight, whDepth), whMat);
    warehouse.position.set(cx - 15, whHeight / 2, cz - 15);
    warehouse.castShadow = true;
    this.scene.add(warehouse);

    this.colliders.push({
      min: new THREE.Vector3(cx - 15 - whWidth / 2, 0, cz - 15 - whDepth / 2),
      max: new THREE.Vector3(cx - 15 + whWidth / 2, whHeight, cz - 15 + whDepth / 2),
      center: new THREE.Vector3(cx - 15, whHeight / 2, cz - 15),
      size: new THREE.Vector3(whWidth, whHeight, whDepth),
      type: 'building'
    });

    // Smokestacks
    for (let s = 0; s < 2; s++) {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 2.5, 42, 12),
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 })
      );
      stack.position.set(cx + 25 + s * 10, 21, cz - 20);
      this.scene.add(stack);
    }

    // Shipping containers
    const contColors = [0x2563eb, 0xd97706, 0xdc2626, 0x16a34a];
    for (let c = 0; c < 6; c++) {
      const cGeo = new THREE.BoxGeometry(16, 7, 6);
      const cMat = new THREE.MeshStandardMaterial({ color: contColors[c % contColors.length] });
      const cont = new THREE.Mesh(cGeo, cMat);
      const cxPos = cx - 25 + (c % 3) * 18;
      const czPos = cz + 25 + Math.floor(c / 3) * 10;
      cont.position.set(cxPos, 3.5, czPos);
      this.scene.add(cont);

      this.colliders.push({
        min: new THREE.Vector3(cxPos - 8, 0, czPos - 3),
        max: new THREE.Vector3(cxPos + 8, 7, czPos + 3),
        center: new THREE.Vector3(cxPos, 3.5, czPos),
        size: new THREE.Vector3(16, 7, 6),
        type: 'prop'
      });
    }
  }

  private buildAirportBlock(cx: number, cz: number) {
    // Terminal building + Control Tower + Runway strip
    const termWidth = 70;
    const termDepth = 35;
    const termHeight = 18;
    const termMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.6,
      roughness: 0.2
    });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(termWidth, termHeight, termDepth), termMat);
    terminal.position.set(cx - 20, termHeight / 2, cz - 20);
    this.scene.add(terminal);

    this.colliders.push({
      min: new THREE.Vector3(cx - 20 - termWidth / 2, 0, cz - 20 - termDepth / 2),
      max: new THREE.Vector3(cx - 20 + termWidth / 2, termHeight, cz - 20 + termDepth / 2),
      center: new THREE.Vector3(cx - 20, termHeight / 2, cz - 20),
      size: new THREE.Vector3(termWidth, termHeight, termDepth),
      type: 'building'
    });

    // Control Tower
    const towerShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 4.5, 45, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    towerShaft.position.set(cx + 35, 22.5, cz - 20);
    this.scene.add(towerShaft);

    const towerCab = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 5, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 })
    );
    towerCab.position.set(cx + 35, 47, cz - 20);
    this.scene.add(towerCab);

    // Runway strip
    const runwayGeo = new THREE.PlaneGeometry(30, 90);
    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(cx, 0.06, cz + 35);
    this.scene.add(runway);
  }

  private buildWaterfrontBlock(cx: number, cz: number) {
    // Marina pier and waterfront towers
    const bGeo = new THREE.BoxGeometry(35, 40, 30);
    const bMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.3 });
    const building = new THREE.Mesh(bGeo, bMat);
    building.position.set(cx - 30, 20, cz - 30);
    this.scene.add(building);

    this.colliders.push({
      min: new THREE.Vector3(cx - 30 - 17.5, 0, cz - 30 - 15),
      max: new THREE.Vector3(cx - 30 + 17.5, 40, cz - 30 + 15),
      center: new THREE.Vector3(cx - 30, 20, cz - 30),
      size: new THREE.Vector3(35, 40, 30),
      type: 'building'
    });

    // Boardwalk pier
    const pierGeo = new THREE.BoxGeometry(20, 1.5, 60);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(cx + 25, 0.8, cz + 20);
    this.scene.add(pier);
  }

  private buildWaterFeature() {
    // River cutting across southern edge towards Beach City
    const waterGeo = new THREE.PlaneGeometry(800, 160);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.1,
      metalness: 0.8
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.05, 420);
    this.scene.add(water);
  }

  private buildGasStations() {
    // 3 Gas Stations distributed across city
    const stations = [
      new THREE.Vector3(0, 0, -160),
      new THREE.Vector3(-160, 0, 160),
      new THREE.Vector3(160, 0, 160)
    ];

    stations.forEach(pos => {
      this.gasStations.push({ position: pos, radius: 14 });

      // Canopy roof
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(22, 1, 14),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
      );
      canopy.position.set(pos.x, 6, pos.z);
      this.scene.add(canopy);

      // Support pillars
      const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      [
        [-9, -5], [9, -5], [-9, 5], [9, 5]
      ].forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pos.x + px, 3, pos.z + pz);
        this.scene.add(pillar);
      });

      // Gas pump island
      const island = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.3, 3),
        new THREE.MeshStandardMaterial({ color: 0x64748b })
      );
      island.position.set(pos.x, 0.15, pos.z);
      this.scene.add(island);

      // Fuel Pumps
      for (let p = -1; p <= 1; p += 2) {
        const pump = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 2.8, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x10b981 })
        );
        pump.position.set(pos.x + p * 4, 1.5, pos.z);
        this.scene.add(pump);
      }

      // Neon "GAS / FUEL" Sign
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1.4, 0.5),
        new THREE.MeshStandardMaterial({
          color: 0x22c55e,
          emissive: 0x22c55e,
          emissiveIntensity: 0.8
        })
      );
      sign.position.set(pos.x, 7.2, pos.z);
      this.scene.add(sign);
    });
  }

  private createTree(x: number, z: number, type: 'oak' | 'pine' | 'palm') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    let trunkHeight = 3.5;
    let trunkRadius = 0.3;

    if (type === 'palm') {
      trunkHeight = 6;
      trunkRadius = 0.25;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, trunkRadius, trunkHeight, 6), trunkMat);
      trunk.position.set(x, trunkHeight / 2, z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      this.scene.add(trunk);

      // Palm fronds
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 4), leafMat);
        frond.rotation.y = angle;
        frond.rotation.x = 0.45;
        frond.position.set(x + Math.sin(angle) * 1.5, trunkHeight + 0.3, z + Math.cos(angle) * 1.5);
        this.scene.add(frond);
      }
    } else if (type === 'pine') {
      trunkHeight = 5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, trunkHeight, 6), trunkMat);
      trunk.position.set(x, trunkHeight / 2, z);
      this.scene.add(trunk);

      // Pine foliage cones
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
      for (let lvl = 0; lvl < 3; lvl++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(3 - lvl * 0.6, 3.2, 6),
          foliageMat
        );
        cone.position.set(x, trunkHeight + lvl * 1.8, z);
        this.scene.add(cone);
      }
    } else {
      // Oak tree
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, trunkHeight, 6), trunkMat);
      trunk.position.set(x, trunkHeight / 2, z);
      this.scene.add(trunk);

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(2.8, 8, 8), leafMat);
      foliage.position.set(x, trunkHeight + 2, z);
      this.scene.add(foliage);
    }
  }

  public setWeather(weather: WeatherType) {
    if (!this.skyMesh) return;

    switch (weather) {
      case 'clear':
        (this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x70b5ff);
        this.ambientLight.color.setHex(0xffffff);
        this.ambientLight.intensity = 0.8;
        this.sunLight.color.setHex(0xfff7ed);
        this.sunLight.intensity = 1.4;
        this.sunLight.position.set(200, 350, 150);
        this.scene.fog = new THREE.FogExp2(0xdbeafe, 0.0012);
        this.setStreetlightsState(false);
        break;

      case 'sunset':
        (this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf97316);
        this.ambientLight.color.setHex(0xfed7aa);
        this.ambientLight.intensity = 0.6;
        this.sunLight.color.setHex(0xfb923c);
        this.sunLight.intensity = 1.1;
        this.sunLight.position.set(350, 100, 200);
        this.scene.fog = new THREE.FogExp2(0xfb923c, 0.0016);
        this.setStreetlightsState(true, 0.4);
        break;

      case 'night':
        (this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x050814);
        this.ambientLight.color.setHex(0x1e293b);
        this.ambientLight.intensity = 0.25;
        this.sunLight.color.setHex(0x60a5fa);
        this.sunLight.intensity = 0.3;
        this.sunLight.position.set(-150, 250, -100);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.002);
        this.setStreetlightsState(true, 1.2);
        break;

      case 'rain':
        (this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(0x475569);
        this.ambientLight.color.setHex(0x94a3b8);
        this.ambientLight.intensity = 0.45;
        this.sunLight.color.setHex(0xcfd8dc);
        this.sunLight.intensity = 0.5;
        this.sunLight.position.set(100, 200, 100);
        this.scene.fog = new THREE.FogExp2(0x64748b, 0.003);
        this.setStreetlightsState(true, 0.8);
        break;
    }
  }

  private setStreetlightsState(enabled: boolean, intensity: number = 1.0) {
    this.streetLights.forEach(light => {
      light.visible = enabled;
      light.intensity = intensity;
    });
    this.streetlightMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = enabled ? 1.0 : 0.1;
    });
  }
}
