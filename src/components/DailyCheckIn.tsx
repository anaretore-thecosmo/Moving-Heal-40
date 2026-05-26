import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Session } from '../types';
import { Zap, AlertTriangle, Clock, MapPin, Target, Check, ChevronRight, ChevronLeft, X, Waves, Shield, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  profile: UserProfile;
  workoutDayIndex: number;
  onComplete: (sessionData: Partial<Session>) => void;
  onCancel: () => void;
}

export default function DailyCheckIn({ profile, workoutDayIndex, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<Partial<Session>>({
    energyLevel: 'Medium',
    painToday: 'Não',
    painLocation: [],
    durationMinutes: profile.sessionDuration || 45,
    location: profile.environment === 'both' ? 'Academia' : (profile.environment === 'home' ? 'Casa' : 'Academia'),
    intent: 'IA choice'
  });

  const steps = [
    {
      id: 'energy',
      question: 'Como está sua energia hoje?',
      sub: 'A IA ajustará o volume e intensidade baseada no seu estado.',
      options: [
        { value: 'High', label: 'Alta', sub: 'Pronto para o pico', icon: <Zap className="w-5 h-5" /> },
        { value: 'Medium', label: 'Média', sub: 'Ritmo sustentável', icon: <Waves className="w-5 h-5" /> },
        { value: 'Low', label: 'Baixa', sub: 'Recuperativo', icon: <Activity className="w-5 h-5" /> }
      ],
      field: 'energyLevel'
    },
    {
      id: 'pain',
      question: 'Alguma sensibilidade hoje?',
      sub: 'Blindagem articular ativa conforme sua resposta.',
      options: [
        { value: 'Não', label: 'Não', sub: 'Totalmente funcional' },
        { value: 'Sim, leve', label: 'Leve', sub: 'Apenas um alerta' },
        { value: 'Sim, moderada', label: 'Moderada', sub: 'Exige cuidado' },
        { value: 'Sim, forte', label: 'Forte', sub: 'Limitação real' }
      ],
      field: 'painToday'
    },
    {
      id: 'duration',
      question: 'Quanto tempo temos hoje?',
      sub: 'O protocolo será compactado ou expandido.',
      options: [
        { value: 20, label: '20 min', sub: 'Express' },
        { value: 30, label: '30 min', sub: 'Eficiente' },
        { value: 45, label: '45 min', sub: 'Ideal' },
        { value: 60, label: '60 min', sub: 'Completo' }
      ],
      field: 'durationMinutes'
    },
    {
      id: 'intent',
      question: 'Como deseja se sentir hoje?',
      sub: 'Muda a "assinatura" biomecânica do treino.',
      options: [
        { value: 'Forte', label: 'Forte', sub: 'Máxima tensão' },
        { value: 'Técnico', label: 'Técnico', sub: 'Foco no detalhe' },
        { value: 'Recuperativo', label: 'Leve', sub: 'Flow e soltura' },
        { value: 'IA choice', label: 'IA Decide', sub: 'Ajuste otimizado' }
      ],
      field: 'intent'
    },
    {
      id: 'gymCrowdedness',
      question: 'Como está a academia agora?',
      sub: 'A IA ajuda a substituir equipamentos se estiver muito cheia.',
      options: [
        { value: 'Vazia', label: 'Vazia', sub: 'Todos aparelhos livres' },
        { value: 'Tranquila', label: 'Tranquila', sub: 'Fluxo bem suave' },
        { value: 'Média', label: 'Tranquila / Média', sub: 'Alguma espera ocasional' },
        { value: 'Cheia', label: 'Cheia / Lotada', sub: 'Priorizar alternativas rápidas' }
      ],
      field: 'gymCrowdedness'
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete(session);
  };

  const selectOption = (val: any) => {
    setSession({ ...session, [currentStep.field]: val });
    setTimeout(handleNext, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-app/95 backdrop-blur-xl flex items-center justify-center p-6 transition-colors duration-500">
      <div className="absolute inset-0 technical-grid opacity-20 pointer-events-none" />
      
      <button 
        onClick={onCancel}
        className="absolute top-8 right-8 p-3 hover:bg-card-app rounded-full transition-colors opacity-50 hover:opacity-100"
      >
        <X className="w-6 h-6" />
      </button>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl space-y-12 relative z-10"
      >
        {/* Step Header */}
        <div className="text-center space-y-4">
            <div className="flex justify-center gap-2 mb-8">
                {steps.map((_, i) => (
                    <div key={i} className={cn("h-1 w-8 rounded-full transition-all duration-500", i <= step ? "bg-accent-app" : "bg-border-app")} />
                ))}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-app leading-tight">
                {currentStep.question}
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">{currentStep.sub}</p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 gap-4"
                >
                    {currentStep.options.map((opt) => {
                        const isSelected = (session[currentStep.field as keyof Session]) === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => selectOption(opt.value)}
                                className={cn(
                                    "p-6 rounded-[24px] border text-left transition-all duration-300 flex items-center justify-between group",
                                    isSelected 
                                        ? "bg-accent-app border-accent-app text-white shadow-xl shadow-accent-app/20" 
                                        : "bg-card-app border-border-app hover:border-gold hover:bg-gold/5"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    {opt.icon && <div className={cn("p-2 rounded-lg", isSelected ? "bg-white/20" : "bg-gold/10 text-gold")}>{opt.icon}</div>}
                                    <div className="space-y-1">
                                        <p className="font-bold text-lg">{opt.label}</p>
                                        <p className={cn("text-xs opacity-60", isSelected ? "text-white" : "text-slate-500")}>{opt.sub}</p>
                                    </div>
                                </div>
                                <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center transition-all", isSelected ? "bg-white border-white" : "border-border-app group-hover:border-gold")}>
                                    {isSelected && <Check className="w-4 h-4 text-accent-app" />}
                                </div>
                            </button>
                        );
                    })}
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 pt-10">
            {step > 0 && (
                <button 
                    onClick={() => setStep(step - 1)}
                    className="p-4 rounded-full border border-border-app hover:bg-card-app transition-all opacity-40 hover:opacity-100"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-30">Passo {step + 1} de {steps.length}</span>
        </div>
      </motion.div>
    </div>
  );
}
