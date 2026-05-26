import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '../types';
import { Check, Heart, Ban, MapPin, Sparkles, Mic, MicOff, ChevronRight, ChevronLeft, Waves, Shield, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onComplete: (feedback: Partial<Session>) => void;
}

export default function PostWorkoutFeedback({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<Partial<Session>>({
    rating: 'Perfeito',
    feltWhere: [],
    exercisesToAvoid: '',
    exercisesLiked: '',
    satisfactionScore: 8,
    effortScore: 7,
    painLevel: 0,
    isBored: false,
    bodyFeel: 'confortável'
  });

  const [isListening, setIsListening] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const steps = [
    {
      id: 'rating',
      question: 'Como você avalia a sessão?',
      sub: 'Sua percepção subjetiva molda o próximo treino.',
      type: 'choice',
      field: 'rating',
      options: [
        { value: 'Perfeito', label: 'Perfeito', sub: 'No ponto ideal' },
        { value: 'Fácil demais', label: 'Leve', sub: 'Podemos subir' },
        { value: 'Pesado demais', label: 'Intenso', sub: 'Exigiu muito' },
        { value: 'Senti dor', label: 'Senti Dor', sub: 'Alerta biológico' }
      ]
    },
    {
      id: 'bodyFeel',
      question: 'Como seu corpo se sente agora?',
      sub: 'Detectamos padrões biomecânicos sutis.',
      type: 'choice',
      field: 'bodyFeel',
      options: [
        { value: 'encaixado', label: 'Encaixado', sub: 'Alinhamento total' },
        { value: 'fluido', label: 'Fluido', sub: 'Soltura e leveza' },
        { value: 'travado', label: 'Travado', sub: 'Rigidez excessiva' },
        { value: 'forte', label: 'Forte', sub: 'Sensação atlética' },
        { value: 'estranho', label: 'Estranho', sub: 'Padrão incomum' },
        { value: 'confortável', label: 'Confortável', sub: 'Bem-estar' }
      ]
    },
    {
      id: 'feltWhere',
      question: 'Onde você mais sentiu o treino?',
      sub: 'Validamos se o foco planejado foi atingido.',
      type: 'multi',
      field: 'feltWhere',
      options: [
        { value: 'Glúteos', label: 'Glúteos' },
        { value: 'Posterior', label: 'Posterior' },
        { value: 'Quadríceps', label: 'Quadríceps' },
        { value: 'Costas', label: 'Costas' },
        { value: 'Peito', label: 'Peito' },
        { value: 'Ombros', label: 'Ombros' },
        { value: 'Braços', label: 'Braços' },
        { value: 'Core', label: 'Core' }
      ]
    },
    {
        id: 'scores',
        question: 'Métricas de Esforço',
        sub: 'Balizando volume e intensidade.',
        type: 'scores'
    },
    {
      id: 'voice',
      question: 'Algum comentário final?',
      sub: 'Use a voz para detalhes que a IA deve aprender.',
      type: 'voice'
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete(feedback);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const selectOption = (field: string, val: any) => {
    setFeedback({ ...feedback, [field]: val });
    setTimeout(handleNext, 300);
  };

  const toggleMulti = (field: string, val: any) => {
    const current = (feedback[field as keyof Session] as string[]) || [];
    const newList = current.includes(val) 
        ? current.filter(i => i !== val)
        : [...current, val];
    setFeedback({ ...feedback, [field]: newList });
  };

  const startListening = (field: 'exercisesToAvoid' | 'exercisesLiked') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onstart = () => setIsListening(field);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFeedback(prev => ({ ...prev, [field]: prev[field] ? `${prev[field]} ${transcript}` : transcript }));
    };
    recognition.onend = () => setIsListening(null);
    recognition.start();
    recognitionRef.current = recognition;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-app text-app flex flex-col items-center justify-center p-6 md:p-12 transition-colors duration-500 overflow-hidden">
      <div className="absolute inset-0 technical-grid opacity-20 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-12 relative z-10"
      >
        {/* Step Header */}
        <div className="text-center space-y-6">
            <div className="flex justify-center gap-2 mb-8">
                {steps.map((_, i) => (
                    <div key={i} className={cn("h-1 w-8 rounded-full transition-all duration-500", i <= step ? "bg-accent-app" : "bg-border-app")} />
                ))}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight uppercase leading-none">
                {currentStep.question}
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">{currentStep.sub}</p>
        </div>

        {/* Dynamic Content */}
        <div className="min-h-[40vh] flex flex-col justify-center">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full"
                >
                    {currentStep.type === 'choice' && (
                        <div className="grid grid-cols-1 gap-4">
                            {currentStep.options?.map(opt => {
                                const isSelected = feedback[currentStep.field as keyof Session] === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => selectOption(currentStep.field!, opt.value)}
                                        className={cn(
                                            "w-full p-6 bg-card-app border border-border-app rounded-[24px] text-left transition-all duration-300 flex items-center justify-between group overflow-hidden relative",
                                            isSelected && "bg-accent-app border-accent-app text-white shadow-xl shadow-accent-app/20"
                                        )}
                                    >
                                        <div className="space-y-1 relative z-10">
                                            <p className="font-bold text-lg">{opt.label}</p>
                                            <p className={cn("text-xs opacity-60", isSelected ? "text-white" : "text-slate-500")}>{opt.sub}</p>
                                        </div>
                                        <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center transition-all", isSelected ? "bg-white border-white" : "border-border-app group-hover:border-gold")}>
                                            {isSelected && <Check className="w-4 h-4 text-accent-app" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {currentStep.type === 'multi' && (
                        <div className="grid grid-cols-2 gap-3">
                            {currentStep.options?.map(opt => {
                                const isSelected = ((feedback[currentStep.field as keyof Session] as string[]) || []).includes(opt.value);
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => toggleMulti(currentStep.field!, opt.value)}
                                        className={cn(
                                            "p-5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2",
                                            isSelected ? "bg-accent-app border-accent-app text-white" : "bg-card-app border-border-app"
                                        )}
                                    >
                                        <span className="font-bold text-sm tracking-tight">{opt.label}</span>
                                    </button>
                                );
                            })}
                            <button 
                                onClick={handleNext}
                                className="col-span-2 mt-6 p-6 bg-accent-app text-white rounded-[24px] font-bold uppercase tracking-widest shadow-lg"
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {currentStep.type === 'scores' && (
                        <div className="space-y-12">
                            {[
                                { id: 'satisfactionScore', label: 'Satisfação', color: 'bg-gold', icon: <Heart className="w-4 h-4"/> },
                                { id: 'effortScore', label: 'Esforço (RPE)', color: 'bg-rose-500', icon: <Zap className="w-4 h-4"/> },
                                { id: 'painLevel', label: 'Desconforto', color: 'bg-orange-500', icon: <Activity className="w-4 h-4"/> }
                            ].map(metric => (
                                <div key={metric.id} className="space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-40">
                                            {metric.icon} {metric.label}
                                        </div>
                                        <span className="text-3xl font-mono italic font-bold">
                                            {feedback[metric.id as keyof Session] as number}
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5 h-10">
                                        {[...Array(11)].map((_, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => setFeedback({...feedback, [metric.id]: i})}
                                                className={cn(
                                                    "flex-1 rounded-lg transition-all",
                                                    (feedback[metric.id as keyof Session] as number) === i ? metric.color : "bg-card-app border border-border-app"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={handleNext}
                                className="w-full p-6 bg-accent-app text-white rounded-[24px] font-bold uppercase tracking-widest shadow-lg"
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {currentStep.type === 'voice' && (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">O que a IA deve aprender?</span>
                                    <button 
                                        onClick={() => isListening ? setIsListening(null) : startListening('exercisesLiked')}
                                        className={cn("p-4 rounded-full transition-all", isListening ? "bg-rose-500 text-white animate-pulse" : "bg-card-app border border-border-app")}
                                    >
                                        {isListening ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                                    </button>
                                </div>
                                <textarea 
                                    value={feedback.exercisesLiked}
                                    onChange={(e) => setFeedback({...feedback, exercisesLiked: e.target.value})}
                                    placeholder="Diga como seu corpo respondeu hoje..."
                                    className="w-full bg-card-app border border-border-app rounded-3xl p-6 h-40 text-lg italic outline-none focus:border-accent-app transition-all"
                                />
                            </div>
                            <button 
                                onClick={handleNext}
                                className="w-full p-8 bg-gold text-white rounded-[32px] font-black uppercase tracking-[0.3em] italic shadow-2xl shadow-gold/20 flex items-center justify-center gap-4 group"
                            >
                                Finalizar Diário
                                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-center gap-6 pt-10">
            {step > 0 && (
                <button onClick={handlePrev} className="p-4 rounded-full border border-border-app hover:bg-card-app transition-all opacity-40 hover:opacity-100">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-30">Etapa {step + 1} de {steps.length}</span>
        </div>
      </motion.div>
    </div>
  );
}
