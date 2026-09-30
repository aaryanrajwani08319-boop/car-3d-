export type DistrictId = 
  | 'metro_city'
  | 'downtown'
  | 'green_valley'
  | 'riverside'
  | 'hill_town'
  | 'airport_city'
  | 'industrial_city'
  | 'beach_city';

export interface District {
  id: DistrictId;
  name: string;
  tagline: string;
  center: [number, number]; // [x, z] coordinates in world space
  color: string;
  description: string;
  landmark: string;
}

export type MissionType = 
  | 'normal'
  | 'long_distance'
  | 'airport'
  | 'vip'
  | 'multi_passenger'
  | 'time_limited'
  | 'emergency'
  | 'night';

export interface Passenger {
  id: string;
  name: string;
  avatarSeed: number;
  avatarColor: string;
  role: string;
  dialoguePickup: string;
  dialogueDropoff: string;
  dialogueImpatient: string;
}

export interface TripJob {
  id: string;
  passenger: Passenger;
  type: MissionType;
  pickupDistrict: DistrictId;
  destinationDistrict: DistrictId;
  pickupPos: [number, number, number]; // x, y, z
  destinationPos: [number, number, number];
  distanceKm: number;
  baseFare: number;
  timeLimitSec: number;
  vipMultiplier: number;
  specialCondition?: string;
  isNight?: boolean;
}

export interface VehicleConfig {
  id: string;
  name: string;
  category: string;
  price: number;
  unlocked: boolean;
  baseMaxSpeed: number; // km/h
  baseAcceleration: number;
  baseHandling: number;
  baseBraking: number;
  baseDurability: number;
  baseFuelTank: number;
  color: string;
  roofSign: boolean;
  neonColor?: string;
  description: string;
}

export interface VehicleUpgrades {
  engine: number; // 0 to 5
  brakes: number; // 0 to 5
  tires: number; // 0 to 5
  fuelTank: number; // 0 to 5
  durability: number; // 0 to 5
}

export interface PlayerStats {
  money: number;
  level: number;
  xp: number;
  tripsCompleted: number;
  totalDistanceDrivenKm: number;
  driverRating: number; // 1.0 to 5.0
  activeVehicleId: string;
  ownedVehicles: string[];
  vehicleUpgrades: Record<string, VehicleUpgrades>;
  vehicleCustomization: Record<string, { color: string; roofSign: boolean; neonColor?: string }>;
}

export type CameraViewMode = 'third_person' | 'hood' | 'first_person';

export type WeatherType = 'clear' | 'sunset' | 'night' | 'rain';

export interface GameSettings {
  weather: WeatherType;
  audioVolume: number;
  musicVolume: number;
  sfxVolume: number;
  unit: 'kmh' | 'mph';
  graphicsQuality: 'high' | 'medium' | 'low';
  trafficDensity: 'normal' | 'low' | 'high';
  showTouchControls: boolean;
}

export interface VehicleTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number | 'R' | 'N';
  fuel: number; // 0 to 100
  maxFuel: number;
  health: number; // 0 to 100
  maxHealth: number;
  isColliding: boolean;
  isDrifting: boolean;
  headlights: boolean;
}
