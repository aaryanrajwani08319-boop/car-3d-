import React from 'react';
import { GameSettings, WeatherType, CameraViewMode } from '../types/game';
import { 
  X, 
  Sliders, 
  Sun, 
  Sunset, 
  Moon, 
  CloudRain, 
  Volume2, 
  Camera, 
  Gauge, 
  Gamepad2,
  Smartphone
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface SettingsModalProps {
  settings: GameSettings;
  cameraMode: CameraViewMode;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onUpdateCameraMode: (mode: CameraViewMode) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  cameraMode,
  onUpdateSettings,
  onUpdateCameraMode,
  onClose
}) => {
  const weathers: { id: WeatherType; label: string; icon: React.ReactNode }[] = [
    { id: 'clear', label: 'Sunny Day', icon: <Sun className="w-4 h-4 text-amber-400" /> },
    { id: 'sunset', label: 'Sunset Glow', icon: <Sunset className="w-4 h-4 text-orange-400" /> },
    { id: 'night', label: 'Night City', icon: <Moon className="w-4 h-4 text-blue-400" /> },
    { id: 'rain', label: 'Rain & Wet', icon: <CloudRain className="w-4 h-4 text-cyan-400" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Game & Environment Settings</h2>
              <p className="text-xs text-slate-400">Configure time of day, audio, display, and controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Environment & Time of Day */}
          <div className="space-y-3">
            <label className="text-slate-300 font-semibold block uppercase tracking-wider text-[11px]">
              Time of Day & Atmosphere
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weathers.map(w => (
                <button
                  key={w.id}
                  onClick={() => onUpdateSettings({ weather: w.id })}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    settings.weather === w.id
                      ? 'border-amber-400 bg-amber-400/10 text-white font-bold'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {w.icon}
                  <span className="text-xs">{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Camera View Mode */}
          <div className="space-y-3">
            <label className="text-slate-300 font-semibold block uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Camera Perspective
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'third_person', label: 'Third-Person' },
                { id: 'hood', label: 'Hood / Bumper' },
                { id: 'first_person', label: 'Cockpit View' }
              ].map(cam => (
                <button
                  key={cam.id}
                  onClick={() => onUpdateCameraMode(cam.id as CameraViewMode)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    cameraMode === cam.id
                      ? 'border-cyan-400 bg-cyan-400/10 text-white font-bold'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          </div>

          {/* Speedometer Units */}
          <div className="space-y-3">
            <label className="text-slate-300 font-semibold block uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              Speed Unit
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['kmh', 'mph'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => onUpdateSettings({ unit: u })}
                  className={`py-2.5 px-4 rounded-xl border text-center font-mono font-semibold transition-all ${
                    settings.unit === u
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Volume */}
          <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Audio Synthesis Levels</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Engine & Sound Effects:</span>
                  <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings({ sfxVolume: val });
                    soundManager.setVolume(settings.audioVolume, val, settings.musicVolume);
                  }}
                  className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>In-Cab FM Radio Music:</span>
                  <span className="font-mono">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings({ musicVolume: val });
                    soundManager.setVolume(settings.audioVolume, settings.sfxVolume, val);
                  }}
                  className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Touch Controls Toggle */}
          <div className="flex items-center justify-between bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <div>
                <div className="font-semibold text-white">On-Screen Touch Controls</div>
                <div className="text-slate-400 text-[11px]">Display virtual pedals and steering buttons</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ showTouchControls: !settings.showTouchControls })}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                settings.showTouchControls
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.showTouchControls ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Controls Quick Reference */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>Keyboard Controls</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
              <div><strong className="text-white font-mono">W / Up:</strong> Accelerate</div>
              <div><strong className="text-white font-mono">S / Down:</strong> Brake / Reverse</div>
              <div><strong className="text-white font-mono">A / D:</strong> Steer Left / Right</div>
              <div><strong className="text-white font-mono">Space:</strong> Handbrake / Drift</div>
              <div><strong className="text-white font-mono">E:</strong> Pickup / Dropoff / Gas</div>
              <div><strong className="text-white font-mono">H:</strong> Car Horn</div>
              <div><strong className="text-white font-mono">L:</strong> Headlights</div>
              <div><strong className="text-white font-mono">C:</strong> Change Camera</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
