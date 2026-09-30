import React from 'react';
import { Play, RotateCcw, Car, Briefcase, Sliders, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestartShift: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenSettings: () => void;
  onReturnToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestartShift,
  onOpenGarage,
  onOpenMissions,
  onOpenSettings,
  onReturnToMenu
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-center space-y-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Shift Paused</h2>
        <p className="text-xs text-slate-400">Take a breath or check your fleet status</p>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Driving</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <Car className="w-4 h-4 text-cyan-400" />
            <span>Garage & Tuning</span>
          </button>

          <button
            onClick={onOpenMissions}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>Passenger Fares</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={onRestartShift}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Respawn Vehicle at Central Plaza</span>
          </button>

          <button
            onClick={onReturnToMenu}
            className="w-full py-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-slate-400 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
