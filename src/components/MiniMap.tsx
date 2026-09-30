import React, { useEffect, useRef } from 'react';
import { TripJob } from '../types/game';
import { CityWorld } from '../game/CityWorld';
import * as THREE from 'three';

interface MiniMapProps {
  playerPos: THREE.Vector3;
  playerHeading: number;
  activeJob: TripJob | null;
  passengerInCab: boolean;
  world: CityWorld | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerPos,
  playerHeading,
  activeJob,
  passengerInCab,
  world
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // View range in meters (radius on minimap)
    const viewRadiusMeters = 300;
    const scale = (width / 2) / viewRadiusMeters;

    // Clear background (dark radar canvas)
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Circular clipping
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Subtle radar concentric rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(ratio => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (width / 2 - 4) * ratio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Transform world to minimap relative to player
    const toMapCoords = (worldX: number, worldZ: number) => {
      const dx = worldX - playerPos.x;
      const dz = worldZ - playerPos.z;
      // Heading rotation so up is car's forward direction
      const cos = Math.cos(-playerHeading);
      const sin = Math.sin(-playerHeading);
      const rotX = dx * cos - dz * sin;
      const rotY = dx * sin + dz * cos;
      return {
        x: centerX + rotX * scale,
        y: centerY - rotY * scale // In Three.js forward is +Z
      };
    };

    // Draw Roads
    if (world && world.roadSegments) {
      ctx.strokeStyle = '#273549';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      world.roadSegments.forEach(seg => {
        const p1 = toMapCoords(seg.start.x, seg.start.z);
        const p2 = toMapCoords(seg.end.x, seg.end.z);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Road centers
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      world.roadSegments.forEach(seg => {
        const p1 = toMapCoords(seg.start.x, seg.start.z);
        const p2 = toMapCoords(seg.end.x, seg.end.z);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    }

    // Draw Gas Stations (🟡 Yellow)
    if (world && world.gasStations) {
      world.gasStations.forEach(station => {
        const pt = toMapCoords(station.position.x, station.position.z);
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Draw Job Markers
    if (activeJob) {
      if (!passengerInCab) {
        // 🟢 Green = Passenger pickup
        const pPt = toMapCoords(activeJob.pickupPos[0], activeJob.pickupPos[2]);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(pPt.x, pPt.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // 🔴 Red = Destination dropoff
        const dPt = toMapCoords(activeJob.destinationPos[0], activeJob.destinationPos[2]);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(dPt.x, dPt.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw Player's Cab (🔵 Blue Arrow at Center)
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 8); // Top nose
    ctx.lineTo(centerX - 5.5, centerY + 6); // Bottom left
    ctx.lineTo(centerX, centerY + 3); // Notch
    ctx.lineTo(centerX + 5.5, centerY + 6); // Bottom right
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Radar Glass Outer Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();

  }, [playerPos, playerHeading, activeJob, passengerInCab, world]);

  return (
    <div className="relative w-44 h-44 rounded-full p-1 bg-black/60 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        width={168}
        height={168}
        className="w-full h-full rounded-full"
      />
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest text-white/70 uppercase">
        N
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-wider text-white/50">
        GPS 300M
      </div>
    </div>
  );
};
