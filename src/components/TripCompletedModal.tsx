import React, { useEffect } from 'react';
import { TripJob } from '../types/game';
import confetti from 'canvas-confetti';
import { CheckCircle2, DollarSign, Award, Clock, ArrowRight, Star } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface TripCompletedModalProps {
  job: TripJob;
  tripTimeSec: number;
  healthPct: number;
  onContinue: () => void;
}

export const TripCompletedModal: React.FC<TripCompletedModalProps> = ({
  job,
  tripTimeSec,
  healthPct,
  onContinue
}) => {
  // Bonus calculations
  const timeBonus = tripTimeSec < job.timeLimitSec ? Math.round(job.baseFare * 0.25) : 0;
  const cleanDrivingBonus = healthPct > 80 ? Math.round(job.baseFare * 0.15) : 0;
  const ratingTip = Math.round(job.baseFare * 0.20 * job.vipMultiplier);
  const totalEarned = job.baseFare + timeBonus + cleanDrivingBonus + ratingTip;
  const xpGained = Math.round(80 + job.distanceKm * 15 * job.vipMultiplier);

  useEffect(() => {
    // Fire festive confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored if canvas-confetti is not loaded
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden p-6 text-white space-y-5">
        
        {/* Header Banner */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase block pt-2">
            Trip Completed Successfully!
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Passenger Dropped Off
          </h2>
          <p className="text-xs text-slate-400">
            {job.pickupDistrict.replace('_', ' ').toUpperCase()} → {job.destinationDistrict.replace('_', ' ').toUpperCase()}
          </p>
        </div>

        {/* Passenger Quote & Rating */}
        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">{job.passenger.name}</span>
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-300 italic">
            "{job.passenger.dialogueDropoff}"
          </p>
        </div>

        {/* Fare Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Base Fare ({job.distanceKm} km):</span>
            <span className="font-mono text-white font-semibold">${job.baseFare}</span>
          </div>

          {timeBonus > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Quick Delivery Bonus:
              </span>
              <span className="font-mono font-semibold">+${timeBonus}</span>
            </div>
          )}

          {cleanDrivingBonus > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Clean Driving & Comfort:</span>
              <span className="font-mono font-semibold">+${cleanDrivingBonus}</span>
            </div>
          )}

          {ratingTip > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Passenger Tip ({job.vipMultiplier}x):</span>
              <span className="font-mono font-semibold">+${ratingTip}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="font-bold text-white uppercase text-xs">Total Earnings</span>
            <span className="font-mono font-extrabold text-2xl text-emerald-400">
              +${totalEarned.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-amber-300/80 pt-1">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Driver Experience Gained:
            </span>
            <span className="font-mono font-bold">+{xpGained} XP</span>
          </div>
        </div>

        {/* Next Action */}
        <button
          onClick={() => {
            soundManager.playUpgradeSound();
            onContinue();
          }}
          className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.35)] transition-all transform hover:scale-[1.02] active:scale-98"
        >
          <span>Collect Fare & Next Passenger</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
