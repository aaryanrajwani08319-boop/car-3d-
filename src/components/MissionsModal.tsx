import React, { useState } from 'react';
import { TripJob, MissionType, DistrictId } from '../types/game';
import { generateTripJob, DISTRICTS } from '../data/gameData';
import { soundManager } from '../audio/SoundManager';
import { 
  X, 
  Briefcase, 
  Navigation, 
  Clock, 
  DollarSign, 
  Plane, 
  Crown, 
  AlertCircle, 
  RefreshCw, 
  Flame, 
  Moon,
  Sparkles
} from 'lucide-react';

interface MissionsModalProps {
  currentDistrictId: DistrictId;
  activeJob: TripJob | null;
  onAcceptJob: (job: TripJob) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  currentDistrictId,
  activeJob,
  onAcceptJob,
  onClose
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [jobs, setJobs] = useState<TripJob[]>(() => {
    return [
      generateTripJob(currentDistrictId, 'normal'),
      generateTripJob(currentDistrictId, 'airport'),
      generateTripJob(currentDistrictId, 'vip'),
      generateTripJob(currentDistrictId, 'long_distance'),
      generateTripJob(currentDistrictId, 'emergency'),
      generateTripJob(currentDistrictId, 'night')
    ];
  });

  const handleRefresh = () => {
    soundManager.playNavAlert();
    setJobs([
      generateTripJob(currentDistrictId, 'normal'),
      generateTripJob(currentDistrictId, 'airport'),
      generateTripJob(currentDistrictId, 'vip'),
      generateTripJob(currentDistrictId, 'long_distance'),
      generateTripJob(currentDistrictId, 'emergency'),
      generateTripJob(currentDistrictId, 'night')
    ]);
  };

  const filteredJobs = filterType === 'all' 
    ? jobs 
    : jobs.filter(j => j.type === filterType);

  const getMissionIcon = (type: MissionType) => {
    switch (type) {
      case 'airport':
        return <Plane className="w-4 h-4 text-indigo-400" />;
      case 'vip':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'emergency':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'night':
        return <Moon className="w-4 h-4 text-blue-400" />;
      default:
        return <Briefcase className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Dispatch Center & Passenger Calls</h2>
              <p className="text-xs text-slate-400">Select available passenger fares across the metropolitan districts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              title="Refresh available dispatch calls"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Board</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/60 px-6 py-2 gap-2 text-xs">
          {[
            { id: 'all', label: 'All Fares' },
            { id: 'normal', label: 'City Trips' },
            { id: 'airport', label: 'Airport Express' },
            { id: 'vip', label: 'VIP Passengers' },
            { id: 'long_distance', label: 'Long Distance' },
            { id: 'emergency', label: 'Emergency Runs' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                filterType === f.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeJob && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-400">Current Trip Active:</span>
                  <div className="text-sm font-semibold text-white">
                    {activeJob.passenger.name} ({activeJob.passenger.role}) → {activeJob.destinationDistrict.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-mono font-bold text-lg">${activeJob.baseFare}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map(job => {
              const isCurrent = activeJob?.id === job.id;

              return (
                <div
                  key={job.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-lg'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Top Row: Passenger & Type */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                          style={{ backgroundColor: job.passenger.avatarColor }}
                        >
                          {job.passenger.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{job.passenger.name}</h4>
                          <span className="text-xs text-slate-400">{job.passenger.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
                        {getMissionIcon(job.type)}
                        <span className="font-semibold text-slate-200 capitalize">
                          {job.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="space-y-1.5 text-xs text-slate-300 mb-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pickup District:</span>
                        <span className="font-semibold text-white capitalize">{job.pickupDistrict.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Destination:</span>
                        <span className="font-semibold text-emerald-400 capitalize">{job.destinationDistrict.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Estimated Distance:</span>
                        <span className="font-mono font-bold text-white">{job.distanceKm} km</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Est. Travel Time:</span>
                        <span className="font-mono text-slate-200">{Math.round(job.timeLimitSec / 60)} mins</span>
                      </div>
                    </div>

                    {job.specialCondition && (
                      <div className="text-[11px] text-amber-300/90 italic mb-3">
                        ★ {job.specialCondition}
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Fare & Accept button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estimated Fare</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">${job.baseFare}</span>
                    </div>

                    <button
                      onClick={() => {
                        onAcceptJob(job);
                        soundManager.playNavAlert();
                        onClose();
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      }`}
                    >
                      {isCurrent ? 'Active Trip' : 'Accept Fare'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
