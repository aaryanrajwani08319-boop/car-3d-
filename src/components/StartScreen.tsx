import React from 'react';
import { PlayerStats } from '../types/game';
import { DRIVER_RANKS, VEHICLE_PRESETS, DISTRICTS } from '../data/gameData';
import { 
  Play, 
  RotateCcw, 
  Car, 
  Award, 
  MapPin, 
  CheckCircle2, 
  Sliders, 
  Briefcase,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface StartScreenProps {
  stats: PlayerStats;
  onStartGame: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenSettings: () => void;
  onResetProgress: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  stats,
  onStartGame,
  onOpenGarage,
  onOpenMissions,
  onOpenSettings,
  onResetProgress
}) => {
  const currentRank = DRIVER_RANKS.find(r => r.level === stats.level) || DRIVER_RANKS[0];
  const nextRank = DRIVER_RANKS.find(r => r.level === stats.level + 1);
  const xpNeeded = nextRank ? nextRank.minXp - currentRank.minXp : 1000;
  const currentLevelProgress = nextRank 
    ? Math.min(100, Math.max(0, ((stats.xp - currentRank.minXp) / xpNeeded) * 100)) 
    : 100;

  const activeVehicle = VEHICLE_PRESETS.find(v => v.id === stats.activeVehicleId) || VEHICLE_PRESETS[0];

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-6 sm:p-10 select-none overflow-y-auto">
      
      {/* Top Bar: Brand Wordmark & Quick Stats */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xl shadow-[0_0_20px_rgba(251,191,36,0.5)]">
            🚕
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
              Metro Cab <span className="text-amber-400">3D</span>
            </h1>
            <p className="text-xs text-slate-400">Metropolitan Taxi Driver Simulator</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-medium">Bank Balance</span>
            <span className="font-mono font-bold text-xl text-emerald-400">
              ${stats.money.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-medium">Trips Finished</span>
            <span className="font-mono font-bold text-xl text-white">
              {stats.tripsCompleted}
            </span>
          </div>
        </div>
      </div>

      {/* Center Hero: Play CTA & Driver Profile */}
      <div className="my-auto py-8 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left: Main Menu CTAs */}
        <div className="md:col-span-7 space-y-6">
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold tracking-wide uppercase">
              Open-World 3D Transport Simulation
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-3 leading-tight">
              Drive. Transport. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                Rule the City Streets.
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-lg">
              Pick up passengers across 8 metropolitan districts, navigate realistic traffic, earn fares, and tune your dream taxi fleet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                soundManager.resume();
                onStartGame();
              }}
              className="px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(251,191,36,0.4)] transition-all transform hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>{stats.tripsCompleted > 0 ? 'CONTINUE SHIFT' : 'START DRIVING'}</span>
            </button>

            <button
              onClick={onOpenGarage}
              className="px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all hover:border-slate-500"
            >
              <Car className="w-4 h-4 text-cyan-400" />
              <span>Garage & Fleet</span>
            </button>

            <button
              onClick={onOpenMissions}
              className="px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all hover:border-slate-500"
            >
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>Jobs Board</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Sliders className="w-4 h-4" />
              <span>Settings & Controls</span>
            </button>
            <span>·</span>
            <button
              onClick={() => {
                if (window.confirm('Reset all career progress, cash, and vehicle upgrades?')) {
                  onResetProgress();
                }
              }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Career</span>
            </button>
          </div>
        </div>

        {/* Right: Driver Career Card */}
        <div className="md:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Driver License Rank
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {currentRank.title}
                </h3>
                <span className="text-xs text-slate-400">Level {stats.level}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-amber-400">★ 4.9</div>
              <span className="text-[10px] text-slate-500 uppercase">Rating</span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Experience Points</span>
              <span className="font-mono text-white">
                {stats.xp} / {nextRank ? nextRank.minXp : 'MAX'} XP
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-500"
                style={{ width: `${currentLevelProgress}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1 italic">
              Perk: {currentRank.perk}
            </div>
          </div>

          {/* Active Vehicle Spec */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Fleet Cab</span>
              <span className="text-xs font-bold text-amber-400">{activeVehicle.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-400">
                Top Speed: <span className="font-mono text-white font-semibold">{activeVehicle.baseMaxSpeed} km/h</span>
              </div>
              <div className="text-slate-400">
                Capacity: <span className="font-mono text-white font-semibold">{activeVehicle.baseFuelTank}L Tank</span>
              </div>
            </div>
          </div>

          {/* Connected Districts */}
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Connected Territories (8)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DISTRICTS.map(d => (
                <span
                  key={d.id}
                  className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-300 font-medium"
                >
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-500 gap-2">
        <div>
          Metro Cab 3D Simulator · Full 3D WebGL Open World
        </div>
        <div className="flex items-center gap-4">
          <span>Desktop & Mobile Ready</span>
          <span>·</span>
          <span>Web Audio Synthesis</span>
        </div>
      </div>

    </div>
  );
};
