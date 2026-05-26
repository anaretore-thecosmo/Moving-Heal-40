import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface MuscleIntensity {
  region: string;
  intensity: number; // 0 to 1
  isPainful?: boolean;
}

interface Props {
  data: MuscleIntensity[];
  className?: string;
}

export default function BodyHeatMap({ data, className }: Props) {
  const getIntensityColor = (region: string) => {
    const d = data.find(item => item.region === region);
    if (!d) return 'fill-slate-800';
    if (d.isPainful) return 'fill-orange-400';
    
    // Intensity mapping from emerald-950 to emerald-400
    if (d.intensity > 0.8) return 'fill-emerald-400';
    if (d.intensity > 0.6) return 'fill-emerald-500';
    if (d.intensity > 0.4) return 'fill-emerald-600';
    if (d.intensity > 0.2) return 'fill-emerald-700';
    if (d.intensity > 0) return 'fill-emerald-900/40';
    
    return 'fill-slate-900/50';
  };

  return (
    <div className={cn("grid grid-cols-2 gap-8 items-center", className)}>
      {/* Front View */}
      <div className="space-y-4">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">Vista Frontal</p>
        <svg viewBox="0 0 200 450" className="w-full h-auto drop-shadow-2xl">
          <g className="transition-colors duration-500">
            {/* Head */}
            <circle cx="100" cy="40" r="25" className="fill-slate-900 stroke-white/5" />
            {/* Neck */}
            <rect x="90" y="65" width="20" height="15" className="fill-slate-900 stroke-white/5" />
            
            {/* Torso - Peito */}
            <path 
              d="M70 80 L130 80 L135 150 L65 150 Z" 
              className={cn("stroke-white/10 transition-colors", getIntensityColor('Peito'))} 
            />
            {/* Core/Abs */}
            <path 
              d="M65 150 L135 150 L130 220 L70 220 Z" 
              className={cn("stroke-white/10 transition-colors", getIntensityColor('Core'))} 
            />
            
            {/* Shoulders */}
            <circle cx="65" cy="90" r="15" className={cn("stroke-white/10 transition-colors", getIntensityColor('Ombros'))} />
            <circle cx="135" cy="90" r="15" className={cn("stroke-white/10 transition-colors", getIntensityColor('Ombros'))} />
            
            {/* Arms - Upper */}
            <path d="M50 90 L35 180 L55 180 L65 105 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Braços'))} />
            <path d="M150 90 L165 180 L145 180 L135 105 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Braços'))} />
            
            {/* Arms - Forearms */}
            <path d="M35 180 L25 260 L45 260 L55 180 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Braços'))} />
            <path d="M165 180 L175 260 L155 260 L145 180 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Braços'))} />
            
            {/* Legs - Quads */}
            <path d="M70 220 L75 330 L100 330 L100 220 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Quadríceps'))} />
            <path d="M130 220 L125 330 L100 330 L100 220 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Quadríceps'))} />
            
            {/* Legs - Shins (front) */}
            <path d="M75 330 L80 430 L100 430 L100 330 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Panturrilha'))} />
            <path d="M125 330 L120 430 L100 430 L100 330 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Panturrilha'))} />
          </g>
        </svg>
      </div>

      {/* Back View */}
      <div className="space-y-4">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">Vista Posterior</p>
        <svg viewBox="0 0 200 450" className="w-full h-auto drop-shadow-2xl">
          <g className="transition-colors duration-500">
            {/* Head */}
            <circle cx="100" cy="40" r="25" className="fill-slate-900 stroke-white/5" />
            
            {/* Torso - Upper Back */}
            <path 
              d="M70 80 L130 80 L135 150 L65 150 Z" 
              className={cn("stroke-white/10 transition-colors", getIntensityColor('Costas'))} 
            />
            {/* Torso - Lower Back */}
            <path 
              d="M65 150 L135 150 L130 220 L70 220 Z" 
              className={cn("stroke-white/10 transition-colors", getIntensityColor('Lombar'))} 
            />
            
            {/* Shoulders */}
            <circle cx="65" cy="90" r="15" className={cn("stroke-white/10 transition-colors", getIntensityColor('Ombros'))} />
            <circle cx="135" cy="90" r="15" className={cn("stroke-white/10 transition-colors", getIntensityColor('Ombros'))} />
            
            {/* Arms */}
            <path d="M50 90 L35 180 L55 180 L65 105 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Braços'))} />
            <path d="M150 90 L165 180 L145 180 L135 105 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Braços'))} />
            
            {/* Legs - Glutes (higher part of leg path) */}
            <path d="M70 220 L72 260 L100 260 L100 220 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Glúteos'))} />
            <path d="M130 220 L128 260 L100 260 L100 220 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Glúteos'))} />

            {/* Legs - Hamstrings */}
            <path d="M72 260 L75 330 L100 330 L100 260 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Posterior'))} />
            <path d="M128 260 L125 330 L100 330 L100 260 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Posterior'))} />
            
            {/* Legs - Calves */}
            <path d="M75 330 L80 430 L100 430 L100 330 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Panturrilha'))} />
            <path d="M125 330 L120 430 L100 430 L100 330 Z" className={cn("stroke-white/10 transition-colors", getIntensityColor('Panturrilha'))} />
          </g>
        </svg>
      </div>
    </div>
  );
}
