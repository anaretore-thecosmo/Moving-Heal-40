import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Sparkles, Shield, Zap, Activity } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface Props {
  profile: UserProfile;
  onContinue: () => void;
}

export default function AnamnesisResult({ profile, onContinue }: Props) {
  const getSignature = () => {
    if (profile.trainingHistory === 'Nunca treinei' || profile.trainingHistory === 'Retornando') return "Recuperação & Base";
    if (profile.pains.length > 3) return "Blindagem Articular";
    return "Vitalidade Atlética";
  };

  const hasActualPains = profile.pains.filter(p => p !== 'Nenhuma').length > 0;

  return (
    <div className="min-h-screen bg-app text-app p-6 md:p-12 flex flex-col items-center justify-center font-sans transition-colors duration-500 overflow-hidden relative">
      <div className="absolute inset-0 technical-grid opacity-20 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl w-full space-y-12 relative z-10"
      >
        <header className="text-center space-y-6">
            <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-[0.2em]"
            >
                <Sparkles className="w-3 h-3" />
                Diagnóstico Concluído
            </motion.div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase leading-[0.9]">
                Seu DNA <span className="editorial-header italic font-normal text-gold normal-case">Biomecânico</span> <br /> 
                está pronto.
            </h1>
            <p className="text-slate-500 max-w-xl mx-auto font-medium text-lg italic">
                "Não prescrevemos apenas exercícios. Desenhamos uma nova relação com seu próprio corpo."
            </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column - Core Info */}
            <div className="md:col-span-7 space-y-8">
                <div className="glass-card p-10 space-y-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-gold/10 transition-colors" />
                    
                    <div className="space-y-4">
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40">Assinatura de Treino</span>
                        <h3 className="text-4xl font-bold uppercase tracking-tighter text-deep-blue dark:text-gold">{getSignature()}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border-app">
                        <div className="space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Nível de Foco</span>
                            <p className="font-bold">Premium Adaptive</p>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Articulações</span>
                            <p className={cn("font-bold", hasActualPains ? "text-rose-500" : "text-emerald-500")}>
                                {hasActualPains ? "Blindagem Ativa" : "Seguras"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    {profile.objectives.slice(0, 3).map(obj => (
                        <div key={obj} className="px-5 py-2.5 bg-card-app border border-border-app rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-3 h-3 text-gold" />
                            {obj}
                        </div>
                    ))}
                    <div className="px-5 py-2.5 bg-accent-app text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        Bio-Adapt
                    </div>
                </div>
            </div>

            {/* Right Column - AI Logic */}
            <div className="md:col-span-5 flex flex-col gap-8">
                <div className="flex-1 glass-card p-10 bg-deep-blue text-white space-y-8 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gold opacity-30" />
                    <Activity className="w-8 h-8 text-gold/40" />
                    <p className="text-xl font-medium leading-relaxed italic">
                        "{hasActualPains 
                            ? "Priorizaremos a descompressão das áreas sensíveis enquanto estimulamos sua força funcional." 
                            : "Focaremos em densidade muscular e refinamento atlético com alta precisão biomecânica."}"
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Moving Heal AI v4.0</p>
                </div>

                <button 
                    onClick={onContinue}
                    className="w-full p-8 bg-gold text-white font-black uppercase tracking-[0.3em] rounded-[32px] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-gold/20 group"
                >
                    Entrar no Fluxo
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
