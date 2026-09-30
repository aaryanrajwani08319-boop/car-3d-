import React from 'react';
import { 
  TripJob, 
  VehicleTelemetry, 
  PlayerStats, 
  WeatherType, 
  CameraViewMode 
} from '../types/game';
import { MiniMap } from './MiniMap';
import { soundManager } from '../audio/SoundManager';
import { CityWorld } from '../game/CityWorld';
import * as THREE from 'three';
import { 
  Compass, 
  Fuel, 
  Wrench, 
  Radio, 
  Camera, 
  Volume2, 
  VolumeX, 
  Pause, 
  Briefcase, 
  Car, 
  Sliders, 
  Navigation,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface HUDProps {
  telemetry: VehicleTelemetry;
  playerPos: THREE.Vector3;
  playerHeading: number;
  stats: PlayerStats;
  activeJob: TripJob | null;
  passengerInCab: boolean;
  canPickup: boolean;
  canDropoff: boolean;
  isNearGasStation: boolean;
  tripTimerSec: number;
  tripDistanceRemainingKm: number;
  currentDistrictName: string;
  weather: WeatherType;
  cameraMode: CameraViewMode;
  world: CityWorld | null;
  unit: 'kmh' | 'mph';
  isMuted: boolean;
  radioStation: 'lofi' | 'synthwave' | 'jazz' | 'off';

  onPickup: () => void;
  onDropoff: () => void;
  onRefuel: () => void;
  onToggleMute: () => void;
  onChangeRadioStation: (st: 'lofi' | 'synthwave' | 'jazz' | 'off') => void;
  onCycleCamera: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  playerPos,
  playerHeading,
  stats,
  activeJob,
  passengerInCab,
  canPickup,
  canDropoff,
  isNearGasStation,
  tripTimerSec,
  tripDistanceRemainingKm,
  currentDistrictName,
  weather,
  cameraMode,
  world,
  unit,
  isMuted,
  radioStation,
  onPickup,
  onDropoff,
  onRefuel,
  onToggleMute,
  onChangeRadioStation,
  onCycleCamera,
  onOpenGarage,
  onOpenMissions,
  onOpenSettings,
  onPause
}) => {
  // Unit conversion
  const displaySpeed = unit === 'mph' 
    ? Math.round(telemetry.speedKmh * 0.621371) 
    : telemetry.speedKmh;
  const speedUnitLabel = unit === 'mph' ? 'MPH' : 'KM/H';

  // Format trip timer mm:ss
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 z-10 font-sans">
      
      {/* TOP BAR: Brand, Earnings, District & Quick Actions */}
      <div className="flex items-center justify-between pointer-events-auto">
        {/* Driver Stats Lockup */}
        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold font-mono text-xl tracking-tight">
              ${stats.money.toLocaleString()}
            </span>
          </div>
          <span className="text-white/20">|</span>
          <div className="text-xs text-white/80 flex items-center gap-2">
            <span className="font-semibold text-amber-400">LVL {stats.level}</span>
            <span className="text-white/40">·</span>
            <span className="text-slate-300 font-medium">{currentDistrictName}</span>
          </div>
        </div>

        {/* Top Center: Objective Banner or Weather/District Info */}
        <div className="hidden md:flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-xs text-white/90">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>District: {currentDistrictName}</span>
          </div>
          <span className="text-white/20">·</span>
          <span className="capitalize text-slate-300">{weather} Skies</span>
        </div>

        {/* Top Right: Nav buttons */}
        <div className="flex items-center gap-2">
          {/* Radio Station Switcher */}
          <div className="hidden sm:flex items-center bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-1 text-xs">
            <button
              onClick={() => {
                const stations: ('lofi' | 'synthwave' | 'jazz' | 'off')[] = ['lofi', 'synthwave', 'jazz', 'off'];
                const nextIdx = (stations.indexOf(radioStation) + 1) % stations.length;
                onChangeRadioStation(stations[nextIdx]);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-white/80 hover:text-white transition-colors"
              title="Change FM Radio Station"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono uppercase text-[11px] font-medium tracking-wide">
                {radioStation === 'off' ? 'Radio Off' : radioStation}
              </span>
            </button>
            <button
              onClick={onToggleMute}
              className="px-2 py-1 text-white/60 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Camera Cycle */}
          <button
            onClick={onCycleCamera}
            className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 hover:border-white/30 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            title="Change Camera View (C)"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline capitalize">{cameraMode.replace('_', ' ')}</span>
          </button>

          {/* Jobs / Missions */}
          <button
            onClick={onOpenMissions}
            className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 hover:border-white/30 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            title="Dispatch Missions Board"
          >
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Jobs</span>
          </button>

          {/* Garage */}
          <button
            onClick={onOpenGarage}
            className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 hover:border-white/30 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            title="Cab Garage & Upgrades"
          >
            <Car className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Garage</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="bg-black/70 backdrop-blur-md border border-white/10 hover:border-white/30 text-white/80 hover:text-white p-2 rounded-xl transition-colors"
            title="Game Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Pause */}
          <button
            onClick={onPause}
            className="bg-black/70 backdrop-blur-md border border-white/10 hover:border-white/30 text-white/80 hover:text-white p-2 rounded-xl transition-colors"
            title="Pause Menu"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MIDDLE: Dynamic Action Prompts (Pickup, Dropoff, Gas) */}
      <div className="flex flex-col items-center justify-center gap-3">
        {canPickup && activeJob && (
          <button
            onClick={onPickup}
            className="pointer-events-auto animate-bounce bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 py-3 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] border-2 border-emerald-300 flex items-center gap-2.5 text-base transition-all transform hover:scale-105 active:scale-95"
          >
            <UserCheck className="w-5 h-5" />
            <span>PICK UP PASSENGER (Press E)</span>
          </button>
        )}

        {canDropoff && activeJob && (
          <button
            onClick={onDropoff}
            className="pointer-events-auto animate-bounce bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-7 py-3 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.6)] border-2 border-amber-200 flex items-center gap-2.5 text-base transition-all transform hover:scale-105 active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-900" />
            <span>DROP OFF PASSENGER (${activeJob.baseFare}) (Press E)</span>
          </button>
        )}

        {isNearGasStation && (
          <button
            onClick={onRefuel}
            className="pointer-events-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-300 flex items-center gap-2 text-sm transition-all"
          >
            <Fuel className="w-4 h-4" />
            <span>REFUEL VEHICLE ($30) (Press E)</span>
          </button>
        )}

        {telemetry.fuel < 15 && (
          <div className="bg-red-500/80 backdrop-blur-md text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse shadow-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>LOW FUEL WARNING: Pull into a gas station!</span>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: Mini-Map (Left), Passenger Card (Center), Telemetry Gauges (Right) */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
        
        {/* Bottom Left: Mini-Map */}
        <div className="pointer-events-auto">
          <MiniMap
            playerPos={playerPos}
            playerHeading={playerHeading}
            activeJob={activeJob}
            passengerInCab={passengerInCab}
            world={world}
          />
        </div>

        {/* Bottom Center: Active Trip / Passenger Card */}
        {activeJob ? (
          <div className="pointer-events-auto w-full sm:w-auto max-w-md bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-2xl text-white">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                {/* Avatar Circle */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                  style={{ backgroundColor: activeJob.passenger.avatarColor }}
                >
                  {activeJob.passenger.name[0]}
                </div>
                <div>
                  <div className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                    <span>{activeJob.passenger.name}</span>
                    <span className="text-[10px] font-normal text-white/50">({activeJob.passenger.role})</span>
                  </div>
                  <div className="text-[11px] text-cyan-300 flex items-center gap-1 mt-0.5">
                    <Navigation className="w-3 h-3" />
                    <span>
                      {passengerInCab 
                        ? `To: ${activeJob.destinationDistrict.replace('_', ' ').toUpperCase()}`
                        : `Pickup: ${activeJob.pickupDistrict.replace('_', ' ').toUpperCase()}`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Fare Pill */}
              <div className="text-right">
                <span className="text-emerald-400 font-bold font-mono text-lg leading-none">
                  ${activeJob.baseFare}
                </span>
                <span className="block text-[10px] text-white/50 uppercase tracking-wider">Est. Fare</span>
              </div>
            </div>

            {/* Quote / Condition */}
            <div className="bg-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 italic mb-3 border border-white/5">
              "{passengerInCab ? activeJob.passenger.dialoguePickup : "Waiting for pickup..."}"
            </div>

            {/* Trip Telemetry: Distance & Timer */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white/5 rounded-lg py-1.5 px-2 border border-white/5">
                <span className="text-white/40 block text-[10px] uppercase tracking-wider">Distance</span>
                <span className="font-mono font-bold text-white text-sm">
                  {tripDistanceRemainingKm} km
                </span>
              </div>
              <div className="bg-white/5 rounded-lg py-1.5 px-2 border border-white/5">
                <span className="text-white/40 block text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Time Left
                </span>
                <span className={`font-mono font-bold text-sm ${tripTimerSec < 30 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                  {formatTimer(tripTimerSec)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex pointer-events-auto bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-xs text-white/70 items-center gap-3">
            <Briefcase className="w-4 h-4 text-amber-400" />
            <div>
              <span className="font-semibold text-white block">No Active Job</span>
              <span className="text-[11px] text-white/50">Click "Jobs" or drive around to receive radio calls!</span>
            </div>
          </div>
        )}

        {/* Bottom Right: Cockpit Speedometer & Instrument Cluster */}
        <div className="pointer-events-auto flex flex-col gap-2 bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-2xl min-w-[210px]">
          {/* Top Gauges: Turn Signals & Indicators */}
          <div className="flex items-center justify-between px-1">
            {/* Left Turn Indicator */}
            <div className={`flex items-center gap-1 text-xs font-black transition-opacity ${
              telemetry.speedKmh !== 0 ? 'opacity-100' : 'opacity-40'
            }`}>
              <span className="text-emerald-400 font-mono text-sm">◀</span>
            </div>

            {/* Central PRND Gear Strip */}
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10 text-[11px] font-mono font-bold">
              <span className={(telemetry.gear === 'N' && Math.abs(telemetry.speedKmh) < 1) ? 'text-amber-400 scale-110' : 'text-white/30'}>P</span>
              <span className={telemetry.gear === 'R' ? 'text-rose-400 font-extrabold scale-110' : 'text-white/30'}>R</span>
              <span className={(telemetry.gear === 'N' && Math.abs(telemetry.speedKmh) >= 1) ? 'text-cyan-400 font-extrabold scale-110' : 'text-white/30'}>N</span>
              <span className={typeof telemetry.gear === 'number' ? 'text-emerald-400 font-extrabold scale-110' : 'text-white/30'}>
                {typeof telemetry.gear === 'number' ? `D${telemetry.gear}` : 'D'}
              </span>
            </div>

            {/* Right Turn Indicator */}
            <div className={`flex items-center gap-1 text-xs font-black transition-opacity ${
              telemetry.speedKmh !== 0 ? 'opacity-100' : 'opacity-40'
            }`}>
              <span className="text-emerald-400 font-mono text-sm">▶</span>
            </div>
          </div>

          {/* Main Dial Area: Digital Speedometer & Health/Fuel */}
          <div className="flex items-center justify-between gap-4 mt-1">
            {/* Vertical Fuel & Health Bars */}
            <div className="flex flex-col gap-2.5 justify-center">
              {/* Health Bar */}
              <div className="flex items-center gap-1.5" title="Vehicle Condition">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-300 ${
                      telemetry.health > 50 ? 'bg-emerald-500' : telemetry.health > 25 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${telemetry.health}%` }}
                  />
                </div>
              </div>

              {/* Fuel Bar */}
              <div className="flex items-center gap-1.5" title="Fuel Tank">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-300 ${
                      telemetry.fuel > 30 ? 'bg-amber-400' : 'bg-red-500 animate-pulse'
                    }`}
                    style={{ width: `${telemetry.fuel}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="w-[1px] h-14 bg-white/10" />

            {/* Speed Readout */}
            <div className="text-right min-w-[85px]">
              <div className="text-4xl font-black font-mono tracking-tighter text-white leading-none">
                {displaySpeed}
              </div>
              <div className="text-[10px] font-mono tracking-widest text-cyan-400 mt-1 uppercase font-bold">
                {speedUnitLabel}
              </div>
              {telemetry.isDrifting && (
                <span className="inline-block bg-amber-500/20 text-amber-400 border border-amber-400/40 text-[9px] font-black px-1.5 py-0.2 rounded mt-1 animate-pulse">
                  DRIFTING
                </span>
              )}
            </div>
          </div>

          {/* RPM Tachometer Line */}
          <div className="w-full mt-1">
            <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-rose-500 transition-all duration-100"
                style={{ width: `${Math.min(100, (telemetry.rpm / 7500) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-white/30 mt-0.5">
              <span>0</span>
              <span>RPM x1000</span>
              <span>7.5</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
