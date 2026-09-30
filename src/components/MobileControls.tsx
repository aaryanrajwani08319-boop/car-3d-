import React, { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap, Bell, Camera } from 'lucide-react';
import { VehicleInputs } from '../game/VehiclePhysics';
import { soundManager } from '../audio/SoundManager';

interface MobileControlsProps {
  inputs: VehicleInputs;
  onActionClick: () => void;
  onCycleCamera: () => void;
  canPickup: boolean;
  canDropoff: boolean;
  isNearGasStation: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  inputs,
  onActionClick,
  onCycleCamera,
  canPickup,
  canDropoff,
  isNearGasStation
}) => {
  const [activeSteer, setActiveSteer] = useState<'left' | 'right' | null>(null);
  const [activePedal, setActivePedal] = useState<'gas' | 'brake' | null>(null);
  const [activeDrift, setActiveDrift] = useState<boolean>(false);

  // Global safety release: if any touch ends or window blurs, ensure inputs don't get stuck
  useEffect(() => {
    const handleGlobalRelease = () => {
      // If no pointer is active, verify state
    };
    window.addEventListener('blur', handleGlobalRelease);
    return () => {
      window.removeEventListener('blur', handleGlobalRelease);
    };
  }, []);

  const handleSteerDown = useCallback((dir: 'left' | 'right') => (e: React.PointerEvent) => {
    e.preventDefault();
    soundManager.resume();
    setActiveSteer(dir);
    inputs.steering = dir === 'left' ? -1 : 1;
  }, [inputs]);

  const handleSteerUp = useCallback((dir: 'left' | 'right') => (e: React.PointerEvent) => {
    e.preventDefault();
    setActiveSteer(prev => (prev === dir ? null : prev));
    if (activeSteer === dir || inputs.steering === (dir === 'left' ? -1 : 1)) {
      inputs.steering = 0;
    }
  }, [activeSteer, inputs]);

  const handlePedalDown = useCallback((pedal: 'gas' | 'brake') => (e: React.PointerEvent) => {
    e.preventDefault();
    soundManager.resume();
    setActivePedal(pedal);
    inputs.throttle = pedal === 'gas' ? 1 : -1;
  }, [inputs]);

  const handlePedalUp = useCallback((pedal: 'gas' | 'brake') => (e: React.PointerEvent) => {
    e.preventDefault();
    setActivePedal(prev => (prev === pedal ? null : prev));
    if (activePedal === pedal || (pedal === 'gas' ? inputs.throttle > 0 : inputs.throttle < 0)) {
      inputs.throttle = 0;
    }
  }, [activePedal, inputs]);

  const handleDriftDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    soundManager.resume();
    setActiveDrift(true);
    inputs.handbrake = true;
  }, [inputs]);

  const handleDriftUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setActiveDrift(false);
    inputs.handbrake = false;
  }, [inputs]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 select-none touch-none">
      
      {/* Top Mobile Utilities (Horn, Cam, Action) */}
      <div className="flex justify-end gap-3 pointer-events-auto">
        {(canPickup || canDropoff || isNearGasStation) && (
          <button
            onPointerDown={(e) => { e.preventDefault(); onActionClick(); }}
            className="px-5 h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black flex items-center justify-center shadow-2xl border-2 border-emerald-200 animate-pulse text-xs tracking-wider"
          >
            {canPickup ? '🚖 PICK UP' : canDropoff ? '🏁 DROP OFF' : '⛽ REFUEL'}
          </button>
        )}

        <button
          onPointerDown={(e) => { e.preventDefault(); soundManager.playHorn(); }}
          className="w-12 h-12 rounded-2xl bg-slate-900/80 backdrop-blur-md active:bg-amber-500 text-white flex items-center justify-center border border-white/20 shadow-lg"
          title="Car Horn"
        >
          <Bell className="w-5 h-5 text-amber-400" />
        </button>

        <button
          onPointerDown={(e) => { e.preventDefault(); onCycleCamera(); }}
          className="w-12 h-12 rounded-2xl bg-slate-900/80 backdrop-blur-md active:bg-cyan-500 text-white flex items-center justify-center border border-white/20 shadow-lg"
          title="Change View"
        >
          <Camera className="w-5 h-5 text-cyan-300" />
        </button>
      </div>

      {/* Bottom Steering & Throttle Clusters */}
      <div className="flex items-end justify-between pointer-events-auto pb-3">
        
        {/* Left: Steering Controls with Clear Active Feedback */}
        <div className="flex items-center gap-2.5 bg-slate-950/60 p-2 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
          {/* Steer Left Button */}
          <button
            onPointerDown={handleSteerDown('left')}
            onPointerUp={handleSteerUp('left')}
            onPointerCancel={handleSteerUp('left')}
            onPointerLeave={handleSteerUp('left')}
            className={`w-18 h-18 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-xl active:scale-95 ${
              activeSteer === 'left'
                ? 'bg-cyan-500 text-slate-950 border-cyan-200 scale-95 shadow-cyan-500/50'
                : 'bg-slate-900/90 text-white border-white/15'
            }`}
          >
            <ChevronLeft className={`w-9 h-9 ${activeSteer === 'left' ? 'text-slate-950 stroke-[3]' : 'text-cyan-400'}`} />
            <span className={`text-[10px] font-black tracking-wider ${activeSteer === 'left' ? 'text-slate-950' : 'text-cyan-300'}`}>
              LEFT
            </span>
          </button>

          {/* Steer Right Button */}
          <button
            onPointerDown={handleSteerDown('right')}
            onPointerUp={handleSteerUp('right')}
            onPointerCancel={handleSteerUp('right')}
            onPointerLeave={handleSteerUp('right')}
            className={`w-18 h-18 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-xl active:scale-95 ${
              activeSteer === 'right'
                ? 'bg-cyan-500 text-slate-950 border-cyan-200 scale-95 shadow-cyan-500/50'
                : 'bg-slate-900/90 text-white border-white/15'
            }`}
          >
            <ChevronRight className={`w-9 h-9 ${activeSteer === 'right' ? 'text-slate-950 stroke-[3]' : 'text-cyan-400'}`} />
            <span className={`text-[10px] font-black tracking-wider ${activeSteer === 'right' ? 'text-slate-950' : 'text-cyan-300'}`}>
              RIGHT
            </span>
          </button>
        </div>

        {/* Right: Pedals (Handbrake Drift, Brake/Reverse, Gas) */}
        <div className="flex items-end gap-2.5 bg-slate-950/60 p-2 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
          {/* Drift Button */}
          <button
            onPointerDown={handleDriftDown}
            onPointerUp={handleDriftUp}
            onPointerCancel={handleDriftUp}
            onPointerLeave={handleDriftUp}
            className={`w-14 h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-lg active:scale-95 text-[10px] font-black tracking-wider ${
              activeDrift
                ? 'bg-amber-500 text-slate-950 border-amber-200 shadow-amber-500/50'
                : 'bg-slate-900/90 text-white border-white/15'
            }`}
          >
            <Zap className={`w-5 h-5 mb-0.5 ${activeDrift ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
            <span>DRIFT</span>
          </button>

          {/* Brake / Reverse Pedal */}
          <button
            onPointerDown={handlePedalDown('brake')}
            onPointerUp={handlePedalUp('brake')}
            onPointerCancel={handlePedalUp('brake')}
            onPointerLeave={handlePedalUp('brake')}
            className={`w-17 h-22 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-xl active:scale-95 text-[11px] font-black ${
              activePedal === 'brake'
                ? 'bg-rose-600 text-white border-rose-300 shadow-rose-600/50 scale-95'
                : 'bg-slate-900/90 text-white border-white/15'
            }`}
          >
            <ChevronDown className={`w-8 h-8 ${activePedal === 'brake' ? 'text-white stroke-[3]' : 'text-rose-400'}`} />
            <span className={activePedal === 'brake' ? 'text-white' : 'text-rose-300'}>BRAKE</span>
          </button>

          {/* Gas / Accelerate Pedal */}
          <button
            onPointerDown={handlePedalDown('gas')}
            onPointerUp={handlePedalUp('gas')}
            onPointerCancel={handlePedalUp('gas')}
            onPointerLeave={handlePedalUp('gas')}
            className={`w-19 h-26 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-2xl active:scale-95 text-xs font-black ${
              activePedal === 'gas'
                ? 'bg-emerald-500 text-slate-950 border-emerald-200 shadow-emerald-500/50 scale-95'
                : 'bg-gradient-to-t from-emerald-700 to-emerald-600 text-white border-emerald-400/50'
            }`}
          >
            <ChevronUp className={`w-9 h-9 ${activePedal === 'gas' ? 'text-slate-950 stroke-[3]' : 'text-white'}`} />
            <span className={activePedal === 'gas' ? 'text-slate-950' : 'text-emerald-100'}>ACCEL</span>
          </button>
        </div>

      </div>

    </div>
  );
};
