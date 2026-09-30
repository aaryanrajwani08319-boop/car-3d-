import React, { useState } from 'react';
import { PlayerStats, VehicleConfig, VehicleUpgrades } from '../types/game';
import { VEHICLE_PRESETS, UPGRADE_TIERS } from '../data/gameData';
import { soundManager } from '../audio/SoundManager';
import { 
  X, 
  Wrench, 
  Fuel, 
  Shield, 
  Zap, 
  CircleDot, 
  Gauge, 
  Check, 
  Lock, 
  Palette,
  Sparkles,
  Award
} from 'lucide-react';

interface GarageModalProps {
  stats: PlayerStats;
  onClose: () => void;
  onSelectVehicle: (vehicleId: string) => void;
  onBuyVehicle: (vehicleId: string, price: number) => void;
  onUpgradePart: (vehicleId: string, part: keyof VehicleUpgrades, cost: number) => void;
  onCustomizePaint: (vehicleId: string, color: string) => void;
  onRepairVehicle: () => void;
  onRefuelVehicle: () => void;
  currentHealthPct: number;
  currentFuelPct: number;
}

const PAINT_COLORS = [
  { name: 'Iconic Taxi Yellow', hex: '#FBBF24' },
  { name: 'Midnight Obsidian', hex: '#1E293B' },
  { name: 'Cyber Electric Cyan', hex: '#06B6D4' },
  { name: 'Royal Crimson', hex: '#DC2626' },
  { name: 'Deep Burgundy', hex: '#991B1B' },
  { name: 'Alpine Pearl White', hex: '#F8FAFC' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Vibrant Sunset Orange', hex: '#F97316' }
];

export const GarageModal: React.FC<GarageModalProps> = ({
  stats,
  onClose,
  onSelectVehicle,
  onBuyVehicle,
  onUpgradePart,
  onCustomizePaint,
  onRepairVehicle,
  onRefuelVehicle,
  currentHealthPct,
  currentFuelPct
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(stats.activeVehicleId);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'upgrades' | 'paint' | 'service'>('upgrades');

  const selectedVehicle = VEHICLE_PRESETS.find(v => v.id === selectedVehicleId) || VEHICLE_PRESETS[0];
  const isOwned = stats.ownedVehicles.includes(selectedVehicle.id);
  const isActive = stats.activeVehicleId === selectedVehicle.id;

  const currentUpgrades = stats.vehicleUpgrades[selectedVehicle.id] || {
    engine: 0,
    brakes: 0,
    tires: 0,
    fuelTank: 0,
    durability: 0
  };

  const currentColor = stats.vehicleCustomization[selectedVehicle.id]?.color || selectedVehicle.color;

  const upgradeParts: {
    key: keyof VehicleUpgrades;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    { key: 'engine', label: 'Engine & Turbo', icon: <Zap className="w-4 h-4 text-amber-400" />, desc: 'Increases top speed and acceleration torque' },
    { key: 'brakes', label: 'Performance Brakes', icon: <CircleDot className="w-4 h-4 text-red-400" />, desc: 'Shortens braking distance and emergency stopping' },
    { key: 'tires', label: 'Grip & Tires', icon: <Gauge className="w-4 h-4 text-cyan-400" />, desc: 'Improves cornering response and reduces skid slip' },
    { key: 'fuelTank', label: 'Extended Fuel Tank', icon: <Fuel className="w-4 h-4 text-emerald-400" />, desc: 'Expands fuel capacity for longer inter-city hauls' },
    { key: 'durability', label: 'Reinforced Chassis', icon: <Shield className="w-4 h-4 text-purple-400" />, desc: 'Reduces collision damage and protects passenger comfort' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Cab Garage & Tuning Hub</h2>
              <p className="text-xs text-slate-400">Upgrade, repair, and customize your taxi fleet</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase font-medium">Bank Balance</div>
              <div className="text-xl font-mono font-bold text-emerald-400">
                ${stats.money.toLocaleString()}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 gap-2">
          {(['upgrades', 'vehicles', 'paint', 'service'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-xs font-semibold capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VEHICLE_PRESETS.map(car => {
                const owned = stats.ownedVehicles.includes(car.id);
                const active = stats.activeVehicleId === car.id;
                const canAfford = stats.money >= car.price;

                return (
                  <div
                    key={car.id}
                    onClick={() => setSelectedVehicleId(car.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      selectedVehicleId === car.id
                        ? 'border-amber-400 bg-slate-800/80 shadow-lg'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80">
                          {car.category}
                        </span>
                        <h3 className="text-base font-bold text-white">{car.name}</h3>
                      </div>
                      {owned ? (
                        active ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5" /> Active Cab
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectVehicle(car.id);
                              soundManager.playUpgradeSound();
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
                          >
                            Drive
                          </button>
                        )
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canAfford) {
                              onBuyVehicle(car.id, car.price);
                              soundManager.playTripCompleted();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Buy ${car.price.toLocaleString()}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-4">{car.description}</p>

                    {/* Stats preview */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase">Max Speed</span>
                        <span className="font-mono font-bold text-white">{car.baseMaxSpeed} km/h</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase">Durability</span>
                        <span className="font-mono font-bold text-white">{car.baseDurability} HP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Tuning Vehicle:</span>
                  <h3 className="text-lg font-bold text-white">{selectedVehicle.name}</h3>
                </div>
                {!isOwned && (
                  <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                    Purchase vehicle first to unlock tuning
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {upgradeParts.map(part => {
                  const currentLvl = currentUpgrades[part.key];
                  const nextTier = UPGRADE_TIERS[currentLvl];
                  const isMax = currentLvl >= 5;
                  const canAfford = nextTier ? stats.money >= nextTier.cost : false;

                  return (
                    <div
                      key={part.key}
                      className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 mt-0.5">
                          {part.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{part.label}</h4>
                            <span className="text-xs font-mono font-semibold text-amber-400">
                              Lvl {currentLvl}/5
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{part.desc}</p>
                          
                          {/* 5-step pip bar */}
                          <div className="flex gap-1.5 mt-2">
                            {[1, 2, 3, 4, 5].map(step => (
                              <div
                                key={step}
                                className={`w-6 h-1.5 rounded-full ${
                                  step <= currentLvl ? 'bg-amber-400' : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isMax ? (
                          <span className="text-xs font-bold text-emerald-400 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 block text-center">
                            MAX LEVEL
                          </span>
                        ) : (
                          <button
                            disabled={!isOwned || !canAfford}
                            onClick={() => {
                              if (isOwned && canAfford && nextTier) {
                                onUpgradePart(selectedVehicle.id, part.key, nextTier.cost);
                                soundManager.playUpgradeSound();
                              }
                            }}
                            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                              isOwned && canAfford
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md active:scale-95'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Upgrade ({nextTier?.bonus}) - ${nextTier?.cost.toLocaleString()}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAINT TAB */}
          {activeTab === 'paint' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Choose Fleet Paint Color</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAINT_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      onCustomizePaint(selectedVehicle.id, c.hex);
                      soundManager.playUpgradeSound();
                    }}
                    className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                      currentColor === c.hex
                        ? 'border-amber-400 bg-slate-800 shadow-md'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border border-white/20 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="text-xs font-medium text-white truncate">
                      {c.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SERVICE BAY TAB */}
          {activeTab === 'service' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Repair Station */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Bodywork & Engine Repair</h4>
                    <p className="text-xs text-slate-400">Restores chassis health and performance</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Current Condition:</span>
                  <span className="font-mono font-bold">{Math.round(currentHealthPct)}%</span>
                </div>

                <button
                  disabled={currentHealthPct >= 99 || stats.money < 50}
                  onClick={() => {
                    onRepairVehicle();
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentHealthPct < 99 && stats.money >= 50
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {currentHealthPct >= 99 ? 'Vehicle in Pristine Shape' : 'Repair Full ($50)'}
                </button>
              </div>

              {/* Refuel Station */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Quick Gas Station Refill</h4>
                    <p className="text-xs text-slate-400">Fills the fuel tank to 100% capacity</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Current Fuel:</span>
                  <span className="font-mono font-bold">{Math.round(currentFuelPct)}%</span>
                </div>

                <button
                  disabled={currentFuelPct >= 99 || stats.money < 30}
                  onClick={() => {
                    onRefuelVehicle();
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentFuelPct < 99 && stats.money >= 30
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {currentFuelPct >= 99 ? 'Tank is Full' : 'Fill Gas Tank ($30)'}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
