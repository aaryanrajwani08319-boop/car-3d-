import { District, DistrictId, VehicleConfig, VehicleUpgrades, TripJob, MissionType, Passenger } from '../types/game';

export const DISTRICTS: District[] = [
  {
    id: 'metro_city',
    name: 'Metro City',
    tagline: 'The bustling central urban metropolis',
    center: [0, 0],
    color: '#3B82F6',
    description: 'Skyline towers, corporate headquarters, and high-traffic multi-lane avenues.',
    landmark: 'Central Plaza & Tower'
  },
  {
    id: 'downtown',
    name: 'Downtown',
    tagline: 'Financial district & luxury hotel avenue',
    center: [320, 0],
    color: '#8B5CF6',
    description: 'Broad avenues, neon storefronts, financial institutions, and vibrant shopping streets.',
    landmark: 'Exchange Tower & Broadway'
  },
  {
    id: 'green_valley',
    name: 'Green Valley',
    tagline: 'Suburban lanes & tranquil botanical parkways',
    center: [-320, 0],
    color: '#10B981',
    description: 'Tree-lined parkways, suburban estates, golf greens, and peaceful cul-de-sacs.',
    landmark: 'Grand Botanical Pavilion'
  },
  {
    id: 'riverside',
    name: 'Riverside',
    tagline: 'Bridges, boardwalks & waterfront marina',
    center: [0, 320],
    color: '#06B6D4',
    description: 'Suspension bridge, container docks, seafood boardwalks, and scenic river drives.',
    landmark: 'Twin Arch Suspension Bridge'
  },
  {
    id: 'beach_city',
    name: 'Beach City',
    tagline: 'Coastal promenade, palm palms & resorts',
    center: [320, 320],
    color: '#F59E0B',
    description: 'Ocean views, palm-lined boulevards, luxury seaside resorts, and beach clubs.',
    landmark: 'Oceanview Pier'
  },
  {
    id: 'hill_town',
    name: 'Hill Town',
    tagline: 'Scenic winding roads & panoramic overlooks',
    center: [-320, 320],
    color: '#EC4899',
    description: 'Curving mountain roads, hairpin turns, elevated terraces, and radio mast observatory.',
    landmark: 'Summit Viewpoint Observatory'
  },
  {
    id: 'industrial_city',
    name: 'Industrial City',
    tagline: 'Logistics depots, smokestacks & cargo yards',
    center: [-320, -320],
    color: '#64748B',
    description: 'Factories, heavy truck logistics hubs, freight terminals, and rail crossing roads.',
    landmark: 'Continental Freight Yard'
  },
  {
    id: 'airport_city',
    name: 'Airport City',
    tagline: 'International terminal, jetways & highway corridor',
    center: [320, -320],
    color: '#6366F1',
    description: 'Grand departure terminals, high-speed perimeter expressways, and jet radar towers.',
    landmark: 'Terminal One & Flight Deck'
  }
];

export const VEHICLE_PRESETS: VehicleConfig[] = [
  {
    id: 'crown_metro',
    name: 'Crown Metro Taxi',
    category: 'Standard Fleet',
    price: 0,
    unlocked: true,
    baseMaxSpeed: 140, // km/h
    baseAcceleration: 32, // m/s^2 factor
    baseHandling: 36,
    baseBraking: 40,
    baseDurability: 100,
    baseFuelTank: 60,
    color: '#FBBF24', // iconic yellow
    roofSign: true,
    description: 'The legendary workhorse of city cabbies. Reliable, agile, and easy to maintain.'
  },
  {
    id: 'executive_sedan',
    name: 'Executive Sedan',
    category: 'Premium Fleet',
    price: 3500,
    unlocked: false,
    baseMaxSpeed: 175,
    baseAcceleration: 44,
    baseHandling: 45,
    baseBraking: 48,
    baseDurability: 120,
    baseFuelTank: 75,
    color: '#1E293B', // midnight slate
    roofSign: true,
    neonColor: '#00D8F6',
    description: 'A luxurious sedan designed for VIP clients and high-paying airport express runs.'
  },
  {
    id: 'grand_navigator',
    name: 'Grand Navigator SUV',
    category: 'Heavy Cruiser',
    price: 8500,
    unlocked: false,
    baseMaxSpeed: 160,
    baseAcceleration: 40,
    baseHandling: 34,
    baseBraking: 46,
    baseDurability: 200,
    baseFuelTank: 95,
    color: '#991B1B', // deep burgundy
    roofSign: true,
    neonColor: '#F59E0B',
    description: 'An imposing luxury SUV with tremendous durability and capacity for multi-passenger hauls.'
  },
  {
    id: 'cyber_cruiser',
    name: 'Cyber Cruiser GT',
    category: 'Super Hyper-Cab',
    price: 18000,
    unlocked: false,
    baseMaxSpeed: 215,
    baseAcceleration: 58,
    baseHandling: 52,
    baseBraking: 56,
    baseDurability: 160,
    baseFuelTank: 85,
    color: '#06B6D4', // cyan electric
    roofSign: false,
    neonColor: '#EC4899',
    description: 'A lightning-fast concept cab equipped with carbon chassis and magnetic road grip.'
  }
];

export const DEFAULT_UPGRADES: VehicleUpgrades = {
  engine: 0,
  brakes: 0,
  tires: 0,
  fuelTank: 0,
  durability: 0
};

export const UPGRADE_TIERS = [
  { level: 1, cost: 350, bonus: '+15%' },
  { level: 2, cost: 750, bonus: '+30%' },
  { level: 3, cost: 1400, bonus: '+45%' },
  { level: 4, cost: 2400, bonus: '+60%' },
  { level: 5, cost: 4000, bonus: '+80%' }
];

export const DRIVER_RANKS = [
  { level: 1, title: 'Beginner Driver', minXp: 0, perk: 'Unlocked Metro City routes' },
  { level: 2, title: 'City Driver', minXp: 300, perk: 'Unlocked Downtown & Green Valley fares' },
  { level: 3, title: 'Professional Driver', minXp: 900, perk: '+15% Tip bonus on clean rides' },
  { level: 4, title: 'Long Distance Driver', minXp: 2000, perk: 'Unlocked Airport City & Cross-District VIP routes' },
  { level: 5, title: 'Taxi Expert', minXp: 4000, perk: 'Night rides pay 1.5x fare' },
  { level: 6, title: 'Master Transporter', minXp: 8000, perk: 'Double passenger rating tips' }
];

const PASSENGER_NAMES = [
  'Alex Vance', 'Sophia Laurent', 'Marcus Sterling', 'Elena Rostova',
  'David Chen', 'Amara Okafor', 'Julian Rossi', 'Chloe Dubois',
  'Liam Montgomery', 'Maya Lin', 'Carlos Santana', 'Emily Watson',
  'Hassan Al-Mansoor', 'Zoe Kravitz', 'Dr. Kenneth Park', 'Olivia Stone'
];

const PASSENGER_ROLES = [
  'Stock Trader', 'Software Architect', 'Fashion Designer', 'Flight Attendant',
  'Hotel Guest', 'Doctor on Call', 'Tourist Explorer', 'Music Producer',
  'College Professor', 'Chef de Cuisine', 'Architectural Engineer', 'Concert Pianist'
];

const PICKUP_DIALOGUES = [
  "Hi driver! Thanks for picking me up so fast.",
  "Good timing! I have an appointment to catch.",
  "Hello! Beautiful day for a drive across the city.",
  "Finally, my cab is here! Please get me there in one piece.",
  "Hey! Hope you know the fastest route today."
];

const DROPOFF_DIALOGUES = [
  "Perfect driving! Keep the change, five stars!",
  "We made it right on time! Thank you so much!",
  "Great music and smooth ride. Much appreciated!",
  "Awesome trip! Here's a generous tip for you.",
  "Safe and sound! Have a great shift today!"
];

const IMPATIENT_DIALOGUES = [
  "Are we almost there? I'm running behind!",
  "Watch that turn! Don't scratch that yellow paint!",
  "Can we step on the gas a little?",
  "Traffic looks busy, let's keep moving!"
];

const AVATAR_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
];

export function generateRandomPassenger(): Passenger {
  const name = PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)];
  const role = PASSENGER_ROLES[Math.floor(Math.random() * PASSENGER_ROLES.length)];
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const pickup = PICKUP_DIALOGUES[Math.floor(Math.random() * PICKUP_DIALOGUES.length)];
  const dropoff = DROPOFF_DIALOGUES[Math.floor(Math.random() * DROPOFF_DIALOGUES.length)];
  const impatient = IMPATIENT_DIALOGUES[Math.floor(Math.random() * IMPATIENT_DIALOGUES.length)];

  return {
    id: 'pass_' + Math.random().toString(36).substring(2, 9),
    name,
    avatarSeed: Math.floor(Math.random() * 100),
    avatarColor: color,
    role,
    dialoguePickup: pickup,
    dialogueDropoff: dropoff,
    dialogueImpatient: impatient
  };
}

export function generateTripJob(
  currentDistrictId: DistrictId = 'metro_city',
  forceType?: MissionType,
  isNightTime: boolean = false
): TripJob {
  const passenger = generateRandomPassenger();

  // Pick pickup district: either current or nearby
  const pickupDistrictObj = DISTRICTS.find(d => d.id === currentDistrictId) || DISTRICTS[0];
  
  // Pick destination district (different from pickup)
  const candidateDestinations = DISTRICTS.filter(d => d.id !== pickupDistrictObj.id);
  const destDistrictObj = candidateDestinations[Math.floor(Math.random() * candidateDestinations.length)];

  // Coordinates with slight offset inside the district
  const pickupPos: [number, number, number] = [
    pickupDistrictObj.center[0] + (Math.random() * 80 - 40),
    0,
    pickupDistrictObj.center[1] + (Math.random() * 80 - 40)
  ];

  const destinationPos: [number, number, number] = [
    destDistrictObj.center[0] + (Math.random() * 80 - 40),
    0,
    destDistrictObj.center[1] + (Math.random() * 80 - 40)
  ];

  const dx = destinationPos[0] - pickupPos[0];
  const dz = destinationPos[2] - pickupPos[2];
  const distanceWorld = Math.sqrt(dx * dx + dz * dz);
  // Scale world units to in-game kilometers (e.g., 100 units = 1.8 km)
  const distanceKm = Math.max(1.2, Number((distanceWorld * 0.024).toFixed(1)));

  // Mission type determination
  let type: MissionType = forceType || 'normal';
  if (!forceType) {
    const roll = Math.random();
    if (destDistrictObj.id === 'airport_city' || pickupDistrictObj.id === 'airport_city') {
      type = 'airport';
    } else if (distanceKm > 9) {
      type = 'long_distance';
    } else if (roll < 0.15) {
      type = 'vip';
    } else if (roll < 0.3) {
      type = 'time_limited';
    } else if (roll < 0.4) {
      type = 'emergency';
    } else if (isNightTime) {
      type = 'night';
    }
  }

  // Base fare calculation
  let baseFareRate = 18; // base per km
  let vipMult = 1.0;
  let condition: string | undefined;

  switch (type) {
    case 'long_distance':
      baseFareRate = 22;
      vipMult = 1.3;
      condition = 'High-Speed Expressway Run';
      break;
    case 'airport':
      baseFareRate = 25;
      vipMult = 1.4;
      condition = 'Flight Departure Priority';
      break;
    case 'vip':
      baseFareRate = 32;
      vipMult = 1.8;
      condition = 'Luxury Passenger - Requires Gentle Driving';
      break;
    case 'emergency':
      baseFareRate = 28;
      vipMult = 1.6;
      condition = 'Medical Express - Urgency Required!';
      break;
    case 'time_limited':
      baseFareRate = 24;
      vipMult = 1.35;
      condition = 'Strict Time Limit';
      break;
    case 'night':
      baseFareRate = 26;
      vipMult = 1.5;
      condition = 'Night Owl Surcharge (+50%)';
      break;
    default:
      baseFareRate = 20;
      vipMult = 1.0;
  }

  const baseFare = Math.round(50 + distanceKm * baseFareRate * vipMult);
  
  // Time limit based on distance (assuming avg 60-80 km/h with cushion)
  const timeLimitSec = Math.max(75, Math.round((distanceKm / 45) * 3600) + (type === 'emergency' || type === 'time_limited' ? 45 : 90));

  return {
    id: 'job_' + Math.random().toString(36).substring(2, 9),
    passenger,
    type,
    pickupDistrict: pickupDistrictObj.id,
    destinationDistrict: destDistrictObj.id,
    pickupPos,
    destinationPos,
    distanceKm,
    baseFare,
    timeLimitSec,
    vipMultiplier: vipMult,
    specialCondition: condition,
    isNight: isNightTime
  };
}
