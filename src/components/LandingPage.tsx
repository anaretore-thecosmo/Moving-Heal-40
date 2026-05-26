import React from 'react';
import { motion } from 'motion/react';
import { Activity, Shield, Sparkles, Move, ChevronRight } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { cn } from '../lib/utils';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-app text-app relative overflow-hidden flex flex-col font-sans">
      <div className="absolute inset-0 technical-grid opacity-20 pointer-events-none" />
      
      {/* Decorative Orbs */}
      <div className="absolute -top-[10%] -right-[10%] w-[50%] aspect-square bg-gold/5 blur-[120px] rounded-full" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[50%] aspect-square bg-deep-blue/5 blur-[120px] rounded-full" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full p-6 md:px-12 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-app border border-border-app flex items-center justify-center rounded-xl shadow-sm">
            <Move className="text-accent-app w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="font-bold text-sm md:text-base tracking-[0.2em] uppercase">Moving Heal <span className="text-gold">+40</span></span>
        </div>
        <button 
          onClick={signInWithGoogle}
          className="text-xs font-bold uppercase tracking-widest px-8 py-3 bg-app border border-border-app rounded-full hover:bg-gold hover:text-white hover:border-gold transition-all duration-500 shadow-sm"
        >
          Acessar
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 pt-32 pb-20 relative z-10 max-w-6xl mx-auto w-full">
        <div className="space-y-12 text-center md:text-left w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row items-center gap-6 justify-center md:justify-start">
                <span className="px-4 py-1.5 bg-gold/10 text-gold text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border border-gold/20">
                    Sua nova fase começa aqui
                </span>
                <div className="flex -space-x-4">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-app bg-slate-200 overflow-hidden shadow-sm">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=atleta${i}`} alt="User" />
                        </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-app bg-gold flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                        +2k
                    </div>
                </div>
            </div>

            <h1 className="text-5xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-[0.85] uppercase">
                Moving <span className="editorial-header text-gold italic font-normal normal-case">Heal</span> <br /> 
                <span className="text-deep-blue dark:text-gold opacity-80 decoration-gold/30 underline underline-offset-[10px]">+40</span>
            </h1>

            <div className="max-w-2xl bg-card-app p-8 rounded-[32px] border border-border-app shadow-xl shadow-gold/5 space-y-6">
                <p className="text-lg md:text-xl text-slate-500 italic leading-relaxed">
                  "O Moving Heal não é apenas sobre levantar pesos. É sobre recalibrar seu corpo para que ele se sinta leve, alinhado e imparável após os 40."
                </p>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <button 
                    onClick={signInWithGoogle}
                    className="w-full md:w-auto px-10 py-5 bg-accent-app text-white font-bold rounded-2xl flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent-app/20 group"
                  >
                    Iniciar Protocolo
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-[10px] md:text-xs font-mono uppercase tracking-widest opacity-40">Acesso via Google &bull; 2 min para configurar</p>
                </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
          >
            <FeatureItem 
              icon={<Shield className="w-5 h-5" />}
              title="Escudo Articular"
              desc="Proteção biomecânica em cada repetição."
            />
            <FeatureItem 
              icon={<Sparkles className="w-5 h-5" />}
              title="IA Pura"
              desc="Adaptação contínua ao seu feedback real."
            />
            <FeatureItem 
              icon={<Activity className="w-5 h-5" />}
              title="Design Premium"
              desc="Experiência silenciosa e sofisticada."
            />
          </motion.div>
        </div>
      </main>

      <footer className="w-full p-12 text-center opacity-30 mt-auto">
        <p className="text-[10px] font-mono uppercase tracking-widest">&copy; 2026 MOVING HEAL +40 &mdash; BIOMECHANICS & LONGEVITY</p>
      </footer>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 border border-border-app rounded-[24px] bg-card-app/50 backdrop-blur-sm space-y-3">
      <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-sm uppercase tracking-tight">{title}</h4>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}
