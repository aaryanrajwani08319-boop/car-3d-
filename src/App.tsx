/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { 
  PlayerStats, 
  VehicleConfig, 
  VehicleUpgrades, 
  TripJob, 
  WeatherType, 
  CameraViewMode, 
  GameSettings, 
  VehicleTelemetry, 
  DistrictId 
} from './types/game';
import { VEHICLE_PRESETS, DEFAULT_UPGRADES, DRIVER_RANKS, generateTripJob } from './data/gameData';
import { soundManager } from './audio/SoundManager';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { GarageModal } from './components/GarageModal';
import { MissionsModal } from './components/MissionsModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import { StartScreen } from './components/StartScreen';
import { TripCompletedModal } from './components/TripCompletedModal';
import * as THREE from 'three';

const SAVE_KEY = 'metro_cab_save_v1';

const INITIAL_STATS: PlayerStats = {
  money: 250,
  level: 1,
  xp: 0,
  tripsCompleted: 0,
  totalDistanceDrivenKm: 0,
  driverRating: 5.0,
  activeVehicleId: 'crown_metro',
  ownedVehicles: ['crown_metro'],
  vehicleUpgrades: {
    crown_metro: { ...DEFAULT_UPGRADES },
    executive_sedan: { ...DEFAULT_UPGRADES },
    grand_navigator: { ...DEFAULT_UPGRADES },
    cyber_cruiser: { ...DEFAULT_UPGRADES }
  },
  vehicleCustomization: {
    crown_metro: { color: '#FBBF24', roofSign: true }
  }
};

const INITIAL_SETTINGS: GameSettings = {
  weather: 'clear',
  audioVolume: 0.8,
  musicVolume: 0.45,
  sfxVolume: 0.85,
  unit: 'kmh',
  graphicsQuality: 'high',
  trafficDensity: 'normal',
  showTouchControls: false
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistence
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_STATS;
  });

  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused'>('start');
  const [activeModal, setActiveModal] = useState<'garage' | 'missions' | 'settings' | null>(null);

  // Active Job & Trip state
  const [activeJob, setActiveJob] = useState<TripJob | null>(null);
  const [passengerInCab, setPassengerInCab] = useState<boolean>(false);
  const [canPickup, setCanPickup] = useState<boolean>(false);
  const [canDropoff, setCanDropoff] = useState<boolean>(false);
  const [isNearGasStation, setIsNearGasStation] = useState<boolean>(false);
  const [completedJobInfo, setCompletedJobInfo] = useState<{ job: TripJob; tripTimeSec: number; healthPct: number } | null>(null);

  const [tripTimerSec, setTripTimerSec] = useState<number>(120);
  const [tripDistanceRemainingKm, setTripDistanceRemainingKm] = useState<number>(0);
  const [currentDistrictName, setCurrentDistrictName] = useState<string>('Metro City');

  // Dynamic Telemetry
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    speedKmh: 0,
    rpm: 800,
    gear: 'N',
    fuel: 100,
    maxFuel: 60,
    health: 100,
    maxHealth: 100,
    isColliding: false,
    isDrifting: false,
    headlights: false
  });

  const [cameraMode, setCameraMode] = useState<CameraViewMode>('third_person');
  const [radioStation, setRadioStation] = useState<'lofi' | 'synthwave' | 'jazz' | 'off'>('lofi');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Save progress
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(stats));
    } catch {
      // Ignored
    }
  }, [stats]);

  // Touch device check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(hasTouch);
      if (hasTouch) {
        setSettings(s => ({ ...s, showTouchControls: true }));
      }
    }
  }, []);

  // Initialize Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const activeConfig = VEHICLE_PRESETS.find(v => v.id === stats.activeVehicleId) || VEHICLE_PRESETS[0];
    const upgrades = stats.vehicleUpgrades[activeConfig.id] || DEFAULT_UPGRADES;
    const customColor = stats.vehicleCustomization[activeConfig.id]?.color || activeConfig.color;

    const engine = new GameEngine(canvasRef.current, activeConfig, upgrades, customColor);
    engineRef.current = engine;

    // Engine callbacks
    engine.onTelemetryUpdate = (telem) => {
      setTelemetry(telem);
      if (engine.navigation) {
        setTripDistanceRemainingKm(engine.navigation.getDistanceToTarget(engine.vehicle.position));
      }
    };

    engine.onPickupAvailable = (avail) => setCanPickup(avail);
    engine.onDropoffAvailable = (avail) => setCanDropoff(avail);
    engine.onGasStationNearby = (isNear) => setIsNearGasStation(isNear);
    engine.onDistrictChange = (name) => setCurrentDistrictName(name);

    // Initial weather & camera
    engine.setWeather(settings.weather);

    engine.start();

    // Generate starter passenger job
    const starterJob = generateTripJob('metro_city', 'normal');
    setActiveJob(starterJob);
    engine.setJob(starterJob);
    setTripTimerSec(starterJob.timeLimitSec);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Active trip countdown timer
  useEffect(() => {
    if (gameState !== 'playing' || !activeJob) return;

    const interval = window.setInterval(() => {
      setTripTimerSec(prev => {
        if (prev <= 1) {
          // Timer expired: passenger gets impatient
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, activeJob]);

  // Pickup passenger handler
  const handlePickup = useCallback(() => {
    if (!engineRef.current) return;
    const success = engineRef.current.pickupPassenger();
    if (success) {
      setPassengerInCab(true);
      setCanPickup(false);
    }
  }, []);

  // Dropoff passenger handler
  const handleDropoff = useCallback(() => {
    if (!engineRef.current || !activeJob) return;
    const success = engineRef.current.dropoffPassenger();
    if (success) {
      const tripTimeSpent = activeJob.timeLimitSec - tripTimerSec;
      const healthPct = (engineRef.current.vehicle.currentHealth / engineRef.current.vehicle.maxDurability) * 100;

      // Calculate earnings & XP
      const timeBonus = tripTimerSec > 0 ? Math.round(activeJob.baseFare * 0.25) : 0;
      const cleanDrivingBonus = healthPct > 80 ? Math.round(activeJob.baseFare * 0.15) : 0;
      const ratingTip = Math.round(activeJob.baseFare * 0.20 * activeJob.vipMultiplier);
      const totalEarned = activeJob.baseFare + timeBonus + cleanDrivingBonus + ratingTip;
      const xpGained = Math.round(80 + activeJob.distanceKm * 15 * activeJob.vipMultiplier);

      // Update Player Stats
      setStats(prev => {
        const newXp = prev.xp + xpGained;
        let newLevel = prev.level;
        DRIVER_RANKS.forEach(r => {
          if (newXp >= r.minXp) {
            newLevel = Math.max(newLevel, r.level);
          }
        });

        return {
          ...prev,
          money: prev.money + totalEarned,
          xp: newXp,
          level: newLevel,
          tripsCompleted: prev.tripsCompleted + 1,
          totalDistanceDrivenKm: Number((prev.totalDistanceDrivenKm + activeJob.distanceKm).toFixed(1))
        };
      });

      // Show completion celebration modal
      setCompletedJobInfo({
        job: activeJob,
        tripTimeSec: tripTimeSpent,
        healthPct
      });

      setPassengerInCab(false);
      setCanDropoff(false);
    }
  }, [activeJob, tripTimerSec]);

  // Refuel handler
  const handleRefuel = useCallback(() => {
    if (!engineRef.current) return;
    if (stats.money < 30) return;
    const success = engineRef.current.refuelVehicle(30);
    if (success) {
      setStats(prev => ({ ...prev, money: prev.money - 30 }));
    }
  }, [stats.money]);

  // Accept a new job
  const handleAcceptJob = useCallback((job: TripJob) => {
    if (!engineRef.current) return;
    setActiveJob(job);
    setPassengerInCab(false);
    setTripTimerSec(job.timeLimitSec);
    engineRef.current.setJob(job);
  }, []);

  // Continue to next job after dropoff
  const handleContinueAfterDropoff = useCallback(() => {
    setCompletedJobInfo(null);
    // Automatically generate next passenger request in the city
    const currentDist = (currentDistrictName.toLowerCase().replace(' ', '_') as DistrictId) || 'metro_city';
    const nextJob = generateTripJob(currentDist, undefined, settings.weather === 'night');
    handleAcceptJob(nextJob);
  }, [currentDistrictName, settings.weather, handleAcceptJob]);

  // Garage operations
  const handleSelectVehicle = useCallback((vId: string) => {
    setStats(prev => ({ ...prev, activeVehicleId: vId }));
    if (engineRef.current) {
      const config = VEHICLE_PRESETS.find(v => v.id === vId) || VEHICLE_PRESETS[0];
      const upgrades = stats.vehicleUpgrades[vId] || DEFAULT_UPGRADES;
      const customColor = stats.vehicleCustomization[vId]?.color || config.color;
      engineRef.current.switchVehicle(config, upgrades, customColor);
    }
  }, [stats.vehicleUpgrades, stats.vehicleCustomization]);

  const handleBuyVehicle = useCallback((vId: string, price: number) => {
    setStats(prev => {
      if (prev.money < price) return prev;
      return {
        ...prev,
        money: prev.money - price,
        ownedVehicles: [...prev.ownedVehicles, vId],
        activeVehicleId: vId
      };
    });
    handleSelectVehicle(vId);
  }, [handleSelectVehicle]);

  const handleUpgradePart = useCallback((vId: string, part: keyof VehicleUpgrades, cost: number) => {
    setStats(prev => {
      if (prev.money < cost) return prev;
      const carUpgrades = { ...(prev.vehicleUpgrades[vId] || DEFAULT_UPGRADES) };
      carUpgrades[part] = Math.min(5, carUpgrades[part] + 1);

      return {
        ...prev,
        money: prev.money - cost,
        vehicleUpgrades: {
          ...prev.vehicleUpgrades,
          [vId]: carUpgrades
        }
      };
    });

    if (engineRef.current && engineRef.current.vehicle) {
      engineRef.current.vehicle.applyUpgrades();
    }
  }, []);

  const handleCustomizePaint = useCallback((vId: string, color: string) => {
    setStats(prev => ({
      ...prev,
      vehicleCustomization: {
        ...prev.vehicleCustomization,
        [vId]: {
          ...(prev.vehicleCustomization[vId] || { roofSign: true }),
          color
        }
      }
    }));

    if (engineRef.current && stats.activeVehicleId === vId) {
      const config = VEHICLE_PRESETS.find(v => v.id === vId) || VEHICLE_PRESETS[0];
      const upgrades = stats.vehicleUpgrades[vId] || DEFAULT_UPGRADES;
      engineRef.current.switchVehicle(config, upgrades, color);
    }
  }, [stats.activeVehicleId, stats.vehicleUpgrades]);

  const handleRepairInGarage = useCallback(() => {
    if (stats.money < 50 || !engineRef.current) return;
    engineRef.current.repairVehicle();
    setStats(prev => ({ ...prev, money: prev.money - 50 }));
  }, [stats.money]);

  const handleRefuelInGarage = useCallback(() => {
    if (stats.money < 30 || !engineRef.current) return;
    engineRef.current.vehicle.refuel(engineRef.current.vehicle.maxFuel);
    setStats(prev => ({ ...prev, money: prev.money - 30 }));
    soundManager.playUpgradeSound();
  }, [stats.money]);

  // Camera cycle
  const handleCycleCamera = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.cycleCamera();
    setCameraMode(engineRef.current.cameraMode);
  }, []);

  // Weather update
  const handleUpdateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.weather && engineRef.current) {
        engineRef.current.setWeather(newSettings.weather);
      }
      return updated;
    });
  }, []);

  // Reset progress
  const handleResetProgress = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setStats(INITIAL_STATS);
    if (engineRef.current) {
      const config = VEHICLE_PRESETS[0];
      engineRef.current.switchVehicle(config, DEFAULT_UPGRADES, config.color);
    }
  }, []);

  const currentVehiclePos = engineRef.current?.vehicle.position || new THREE.Vector3(0, 0, 0);
  const currentVehicleHeading = engineRef.current?.vehicle.heading || 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* START / CAREER TITLE SCREEN */}
      {gameState === 'start' && (
        <StartScreen
          stats={stats}
          onStartGame={() => {
            setGameState('playing');
            soundManager.init();
          }}
          onOpenGarage={() => setActiveModal('garage')}
          onOpenMissions={() => setActiveModal('missions')}
          onOpenSettings={() => setActiveModal('settings')}
          onResetProgress={handleResetProgress}
        />
      )}

      {/* IN-GAME HUD */}
      {gameState === 'playing' && (
        <HUD
          telemetry={telemetry}
          playerPos={currentVehiclePos}
          playerHeading={currentVehicleHeading}
          stats={stats}
          activeJob={activeJob}
          passengerInCab={passengerInCab}
          canPickup={canPickup}
          canDropoff={canDropoff}
          isNearGasStation={isNearGasStation}
          tripTimerSec={tripTimerSec}
          tripDistanceRemainingKm={tripDistanceRemainingKm}
          currentDistrictName={currentDistrictName}
          weather={settings.weather}
          cameraMode={cameraMode}
          world={engineRef.current ? engineRef.current.world : null}
          unit={settings.unit}
          isMuted={isMuted}
          radioStation={radioStation}
          onPickup={handlePickup}
          onDropoff={handleDropoff}
          onRefuel={handleRefuel}
          onToggleMute={() => {
            const muted = soundManager.toggleMute();
            setIsMuted(muted);
          }}
          onChangeRadioStation={(st) => {
            soundManager.setRadioStation(st);
            setRadioStation(st);
          }}
          onCycleCamera={handleCycleCamera}
          onOpenGarage={() => setActiveModal('garage')}
          onOpenMissions={() => setActiveModal('missions')}
          onOpenSettings={() => setActiveModal('settings')}
          onPause={() => setGameState('paused')}
        />
      )}

      {/* ON-SCREEN MOBILE TOUCH CONTROLS */}
      {gameState === 'playing' && settings.showTouchControls && engineRef.current && (
        <MobileControls
          inputs={engineRef.current.inputs}
          onActionClick={() => engineRef.current?.handleActionKey()}
          onCycleCamera={handleCycleCamera}
          canPickup={canPickup}
          canDropoff={canDropoff}
          isNearGasStation={isNearGasStation}
        />
      )}

      {/* GARAGE MODAL */}
      {activeModal === 'garage' && (
        <GarageModal
          stats={stats}
          onClose={() => setActiveModal(null)}
          onSelectVehicle={handleSelectVehicle}
          onBuyVehicle={handleBuyVehicle}
          onUpgradePart={handleUpgradePart}
          onCustomizePaint={handleCustomizePaint}
          onRepairVehicle={handleRepairInGarage}
          onRefuelVehicle={handleRefuelInGarage}
          currentHealthPct={telemetry.health}
          currentFuelPct={telemetry.fuel}
        />
      )}

      {/* MISSIONS / DISPATCH BOARD MODAL */}
      {activeModal === 'missions' && (
        <MissionsModal
          currentDistrictId={
            (currentDistrictName.toLowerCase().replace(' ', '_') as DistrictId) || 'metro_city'
          }
          activeJob={activeJob}
          onAcceptJob={handleAcceptJob}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* SETTINGS MODAL */}
      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          cameraMode={cameraMode}
          onUpdateSettings={handleUpdateSettings}
          onUpdateCameraMode={(mode) => {
            setCameraMode(mode);
            if (engineRef.current) engineRef.current.cameraMode = mode;
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestartShift={() => {
            if (engineRef.current) {
              engineRef.current.vehicle.position.set(0, 0.4, 0);
              engineRef.current.vehicle.velocity.set(0, 0, 0);
              engineRef.current.vehicle.heading = 0;
            }
            setGameState('playing');
          }}
          onOpenGarage={() => setActiveModal('garage')}
          onOpenMissions={() => setActiveModal('missions')}
          onOpenSettings={() => setActiveModal('settings')}
          onReturnToMenu={() => setGameState('start')}
        />
      )}

      {/* TRIP COMPLETED REWARD MODAL */}
      {completedJobInfo && (
        <TripCompletedModal
          job={completedJobInfo.job}
          tripTimeSec={completedJobInfo.tripTimeSec}
          healthPct={completedJobInfo.healthPct}
          onContinue={handleContinueAfterDropoff}
        />
      )}

    </div>
  );
}
