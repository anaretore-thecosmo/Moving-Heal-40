import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, WorkoutDay, Session, Exercise, VoiceInteraction } from '../types';
import { 
  Play, Pause, ChevronRight, ChevronLeft, Check, Timer, HelpCircle, 
  Mic, MicOff, Brain, Sparkles, RefreshCw, AlertCircle, Info, Volume2, Shield, MapPin, Zap, RotateCcw, TrendingUp,
  X, VolumeX, Moon, Sun, AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { interpretVoiceCommand } from '../services/geminiService';

interface Props {
  profile: UserProfile;
  day: WorkoutDay;
  initialSession: Partial<Session>;
  history: Session[];
  onComplete: (data: Partial<Session>) => void;
  onCancel: () => void;
}

export default function WorkoutSessionPlayer({ profile, day, initialSession, history, onComplete, onCancel }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [session, setSession] = useState<Partial<Session>>({
    ...initialSession,
    startedAt: new Date().toISOString(),
    voiceInteractions: []
  });
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [exercising, setExercising] = useState<Exercise[]>(day.exercises);
  const [loads, setLoads] = useState<Record<string, number>>(() => {
    const prefilled: Record<string, number> = {};
    if (history && history.length > 0) {
      // Find latest record for each exercise (reverse historical lookup)
      const reversedHistory = [...history].reverse();
      reversedHistory.forEach(sess => {
        if (sess.exerciseLoads) {
          Object.entries(sess.exerciseLoads).forEach(([exName, wt]) => {
            prefilled[exName] = wt;
          });
        }
      });
    }
    // Set logical starting points based on exercise roles
    day.exercises.forEach(ex => {
      if (!prefilled[ex.name]) {
        prefilled[ex.name] = ex.role === 'main' ? 40 : 15;
      }
    });
    return prefilled;
  });

  // Premium UI & Gym Experience States (BLOCO 44)
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`moving_heal_autosave_${day.dayName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.currentIdx > 0 || parsed.time > 15)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Autosave read failed:", e);
    }
    return null;
  });
  const [showRecoverPrompt, setShowRecoverPrompt] = useState(() => !!savedSessionData);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Smart Rest Timer State (Item 12)
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  const [restInitialSeconds, setRestInitialSeconds] = useState<number>(60);
  
  // Last recorded weight for visual memory (Item 13)
  const lastRecordedLoad = useMemo(() => {
    if (!history || history.length === 0) return null;
    const currentExName = exercising[currentIdx]?.name;
    if (!currentExName) return null;
    for (const s of history) {
      if (s.exerciseLoads?.[currentExName] !== undefined) {
        return s.exerciseLoads[currentExName];
      }
    }
    return null;
  }, [history, currentIdx, exercising]);
  
  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState<{ message: string; action: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Combined Timer Tick Effect (Workout Timer + Rest Countdown)
  useEffect(() => {
    let interval: any;
    if (!isPaused) {
      interval = setInterval(() => {
        setTime(t => t + 1);
        
        // Count down Rest Timer if active
        setRestTimeLeft(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            // Wake Up with audio alert if not muted (synthesized beep)
            if (!isMuted && ('speechSynthesis' in window)) {
              try {
                const utterance = new SpeechSynthesisUtterance("Tempo de descanso encerrado. Próxima série.");
                utterance.lang = 'pt-BR';
                window.speechSynthesis.speak(utterance);
              } catch (e) { console.warn(e); }
            }
            return null; // Rest timer finished
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, isMuted]);

  // Continuous Autosave Effect
  useEffect(() => {
    if (exercising.length > 0) {
      localStorage.setItem(`moving_heal_autosave_${day.dayName}`, JSON.stringify({
        currentIdx,
        loads,
        time,
        exercising
      }));
    }
  }, [currentIdx, loads, time, exercising, day.dayName]);

  // Keep screen awake (WakeLock Window Visibility integration)
  useEffect(() => {
    const handleVisibility = async () => {
      if (wakeLockEnabled && document.visibilityState === 'visible' && ('wakeLock' in navigator)) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (e) {
          console.error(e);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [wakeLockEnabled]);

  const toggleWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      alert("Wake Lock não é suportado por este navegador.");
      return;
    }
    try {
      if (wakeLockEnabled) {
        await wakeLockRef.current?.release();
        wakeLockRef.current = null;
        setWakeLockEnabled(false);
      } else {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockEnabled(true);
      }
    } catch (err) {
      console.error("Erro ao ativar wake lock:", err);
    }
  };

  const currentEx = exercising[currentIdx];

  const handleNext = () => {
    if (currentIdx < exercising.length - 1) {
      setCurrentIdx(currentIdx + 1);
      // Trigger Intelligent Rest Timer automatically if defined
      startRestCountdown();
    } else {
      // Clear autosave backup on full, successful completion (Item 3)
      localStorage.removeItem(`moving_heal_autosave_${day.dayName}`);
      onComplete({ ...session, exerciseLoads: loads, completedAt: new Date().toISOString() });
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleExitWithPartialSave = () => {
    localStorage.removeItem(`moving_heal_autosave_${day.dayName}`);
    onComplete({ 
      ...session, 
      exerciseLoads: loads, 
      completedAt: new Date().toISOString(),
      isPartial: true,
      bodyFeel: 'Treino suspenso parcialmente'
    });
  };

  const startRestCountdown = () => {
    // Parse current rest duration (e.g., '60s' or '1m30s' or standard 60)
    let seconds = 60;
    if (currentEx.rest) {
      const matched = currentEx.rest.match(/\d+/);
      if (matched) seconds = parseInt(matched[0]);
    }
    setRestInitialSeconds(seconds);
    setRestTimeLeft(seconds);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Comanto por voz não suportado neste navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      processCommand(text);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onerror = () => {
        setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const processCommand = async (text: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/gemini/voice-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          workout: { days: [{ ...day, exercises: exercising }] },
          currentDayIndex: 0,
          transcript: text,
          currentExercise: currentEx
        })
      });
      const data = await res.json();
      
      setAiResponse({ message: data.explanation, action: data.action });
      
      // Execute Action
      if (data.action === 'substitute' && data.substitution) {
        const newExercises = [...exercising];
        newExercises[currentIdx] = data.substitution;
        setExercising(newExercises);
      } else if (data.action === 'adjust_parameters' && data.parameters) {
        const newExercises = [...exercising];
        newExercises[currentIdx] = { ...newExercises[currentIdx], ...data.parameters };
        setExercising(newExercises);
      }

      // Log Interaction
      const interaction: VoiceInteraction = {
        timestamp: new Date().toISOString(),
        transcript: text,
        detectedIntent: data.intent,
        actionTaken: data.action,
        originalExercise: currentEx.name,
        replacementExercise: data.substitution?.name,
        reason: data.explanation
      };
      setSession(prev => ({
        ...prev,
        voiceInteractions: [...(prev.voiceInteractions || []), interaction]
      }));

    } catch (e) {
      console.error(e);
      setAiResponse({ message: "Desculpe, tive um problema técnico ao processar seu pedido.", action: 'none' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setAiResponse(null), 5000);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.round(((currentIdx + 1) / exercising.length) * 100);

  return (
    <div className="fixed inset-0 z-[100] bg-app text-app flex flex-col overflow-hidden">
      <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />

      {/* Header */}
      <header className="p-6 md:p-10 flex flex-col md:flex-row gap-4 justify-between items-center relative z-10 border-b border-border-app/20 bg-app/80 backdrop-blur-md">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <button 
            type="button"
            onClick={() => setShowExitConfirm(true)} 
            className="p-4 rounded-full border border-border-app hover:bg-card-app transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="Sair ou Pausar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center md:text-left">
              <p className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-40">Sessão em Curso • Moving Heal</p>
              <h2 className="font-black text-xl uppercase tracking-tight text-accent-app">{day.dayName}</h2>
          </div>
        </div>

        {/* Live Controls & Indicators - Item 4, Item 18 */}
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-border-app/10 pt-3 md:pt-0">
            <div className="flex items-center gap-3">
                {/* Keep screen awake / Wake Lock - Item 4 */}
                <button
                    type="button"
                    onClick={toggleWakeLock}
                    className={cn(
                        "p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer active:scale-95",
                        wakeLockEnabled 
                            ? "bg-gold/10 border-gold/40 text-gold shadow-sm shadow-gold/5 animate-pulse" 
                            : "border-border-app text-slate-400 hover:text-slate-200"
                    )}
                    title={wakeLockEnabled ? "Tela Ativa Ligada" : "Ligar Tela Ativa"}
                >
                    <Sun className="w-4 h-4" />
                    <span className="hidden sm:inline">{wakeLockEnabled ? "Sem Bloqueio" : "Manter Ativa"}</span>
                </button>

                {/* Silent Mode Toggle - Item 18 */}
                <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                        "p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer active:scale-95",
                        isMuted 
                            ? "bg-rose-500/10 border-rose-500/40 text-rose-500" 
                            : "border-border-app text-slate-400 hover:text-slate-200"
                    )}
                    title={isMuted ? "Modo Silencioso Ativo" : "Silenciar Beeps"}
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isMuted ? "Mudo" : "Voz / Beep"}</span>
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <p className="text-[9px] font-mono uppercase opacity-30">Tempo Ativo</p>
                    <p className="font-mono font-bold text-2xl text-slate-200">{formatTime(time)}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPaused(!isPaused)} 
                  className={cn(
                    "p-4 rounded-full text-white shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center",
                    isPaused ? "bg-emerald-500 shadow-emerald-500/10" : "bg-accent-app shadow-accent-app/20"
                  )}
                >
                    {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl glass-card relative overflow-hidden"
          >
            {/* AI Assistant Overlay */}
            <AnimatePresence>
                {(isListening || isProcessing || aiResponse) && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-accent-app/95 text-white flex flex-col items-center justify-center p-12 text-center space-y-8 backdrop-blur-xl"
                    >
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center relative">
                            {isListening && <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full border-2 border-gold/50" />}
                            <Brain className={cn("w-10 h-10", isListening ? "text-gold" : "text-white")} />
                        </div>
                        
                        <div className="space-y-4">
                            {isListening ? (
                                <>
                                    <h3 className="text-2xl font-bold uppercase tracking-tight">Ouvindo...</h3>
                                    <p className="italic text-lg opacity-60">"{transcript || 'Diga o que você precisa...'}"</p>
                                </>
                            ) : isProcessing ? (
                                <>
                                    <h3 className="text-2xl font-bold uppercase tracking-tight">Analisando Biomecânica...</h3>
                                    <div className="flex gap-2 justify-center">
                                        <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </>
                            ) : aiResponse ? (
                                <>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-gold mb-2">
                                        <Sparkles className="w-3 h-3" /> IA Bio-Adapter
                                    </div>
                                    <h3 className="text-3xl font-bold tracking-tight italic">"{aiResponse.message}"</h3>
                                    {aiResponse.action === 'substitute' && (
                                        <div className="flex items-center gap-2 justify-center text-emerald-400 font-bold uppercase text-xs">
                                            <RefreshCw className="w-4 h-4" /> Exercício Substituído
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-10 space-y-10">
                {/* Visual Progress Bar Indicators - Item 11 */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono opacity-50 uppercase tracking-wider">
                        <span>Progresso do Treino</span>
                        <span>{progressPercent}% Concluído</span>
                    </div>
                    <div className="h-2 w-full bg-border-app/30 rounded-full overflow-hidden">
                        <motion.div 
                            className="bg-accent-app h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono opacity-30 uppercase tracking-tighter">
                        <span>Início</span>
                        <span>Exercício {currentIdx + 1} de {exercising.length}</span>
                        <span>Fim</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                            <span className="px-4 py-1.5 bg-accent-app/5 border border-accent-app/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-accent-app">
                                Bloco {Math.floor(currentIdx / 2) + 1}
                            </span>
                            {currentEx.role && (
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                    currentEx.role === 'main' ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                    currentEx.role === 'technical' ? "bg-gold/10 text-gold border border-gold/20" :
                                    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                )}>
                                    {currentEx.role}
                                </span>
                            )}
                        </div>
                        <span className="font-mono text-xs opacity-30">0{currentIdx + 1} / 0{exercising.length}</span>
                    </div>
                    <h3 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase leading-[0.9]">
                        {currentEx.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {currentEx.variation && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full">
                                <RotateCcw className="w-3 h-3 text-gold" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gold">{currentEx.variation.description}</span>
                            </div>
                        )}
                        {currentEx.progressionStrategy && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{currentEx.progressionStrategy}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div className="p-6 bg-app rounded-2xl border border-border-app text-center">
                        <p className="text-[9px] font-mono uppercase opacity-30 mb-2">Séries</p>
                        <p className="text-3xl font-bold italic">{currentEx.sets}</p>
                    </div>
                    <div className="p-6 bg-app rounded-2xl border border-border-app text-center">
                        <p className="text-[9px] font-mono uppercase opacity-30 mb-2">Reps</p>
                        <p className="text-3xl font-bold italic">{currentEx.reps}</p>
                    </div>
                    <div className="p-6 bg-app rounded-2xl border border-border-app text-center">
                        <p className="text-[9px] font-mono uppercase opacity-30 mb-2">Descanso</p>
                        <p className="text-3xl font-bold italic">{currentEx.rest}</p>
                    </div>
                </div>

                {/* Smart Rest Timer Section - Item 12 */}
                <div className="p-6 border border-border-app rounded-3xl bg-card-app/40 space-y-4">
                    {restTimeLeft === null ? (
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-gold" /> Descanso Inteligente
                                </h4>
                                <p className="text-[11px] text-slate-400">Inicie cronômetro pós-série para regular o fôlego.</p>
                            </div>
                            <button
                                type="button"
                                onClick={startRestCountdown}
                                className="px-5 py-3 bg-gold text-slate-950 font-bold uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 cursor-pointer hover:bg-gold/90 transition-all flex items-center gap-2"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" /> Iniciar {currentEx.rest || '60s'}
                              </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-rose-500 animate-pulse flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-rose-500" /> Regulando fôlego...
                                </span>
                                <span className="font-mono text-xl font-bold text-slate-200">
                                    {restTimeLeft} seg restantes
                                </span>
                            </div>
                            
                            {/* Animated bar */}
                            <div className="h-1.5 w-full bg-border-app/30 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gold transition-all duration-1000"
                                    style={{ width: `${(restTimeLeft / restInitialSeconds) * 100}%` }}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRestTimeLeft(prev => prev !== null ? Math.max(0, prev - 15) : null)}
                                    className="flex-1 py-2 bg-app border border-border-app rounded-xl font-bold text-[10px] uppercase text-rose-400 hover:border-rose-500/30 transition-all active:scale-95 cursor-pointer"
                                >
                                    -15s
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRestTimeLeft(prev => prev !== null ? prev + 15 : null)}
                                    className="flex-1 py-2 bg-app border border-border-app rounded-xl font-bold text-[10px] uppercase text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                                >
                                    +15s
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRestTimeLeft(null)}
                                    className="flex-1 py-2 bg-gold/10 border border-gold/30 rounded-xl font-bold text-[10px] uppercase text-gold hover:bg-gold/20 transition-all active:scale-95 cursor-pointer"
                                >
                                    Pular descanso
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-accent-app/5 border border-accent-app/10 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-accent-app">Carga Ativa Registrada</p>
                            <p className="text-xs text-slate-400">Ajuste o peso real para este exercício</p>
                            
                            {/* Memory Load - Item 13 */}
                            {lastRecordedLoad !== null ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono leading-none mt-1">
                                <Check className="w-3 h-3" /> Última: {lastRecordedLoad} kg
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-mono leading-none mt-1">
                                Primeira execução sugerida
                              </div>
                            )}
                        </div>
                        <div className="flex items-baseline gap-1 bg-app px-4 py-2 border border-border-app rounded-2xl">
                            <span className="text-3xl font-black italic text-accent-app">{loads[currentEx.name] ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-400">KG</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={() => setLoads(prev => ({ ...prev, [currentEx.name]: Math.max(0, (prev[currentEx.name] ?? 0) - 5) }))}
                            className="flex-1 py-2 bg-app border border-border-app rounded-xl font-bold text-xs hover:border-accent-app/50 text-slate-300 transition-all active:scale-95 cursor-pointer"
                        >
                            -5 kg
                        </button>
                        <button 
                            type="button"
                            onClick={() => setLoads(prev => ({ ...prev, [currentEx.name]: Math.max(0, (prev[currentEx.name] ?? 0) - 1) }))}
                            className="flex-1 py-2 bg-app border border-border-app rounded-xl font-bold text-xs hover:border-accent-app/50 text-slate-300 transition-all active:scale-95 cursor-pointer"
                        >
                            -1 kg
                        </button>
                        <button 
                            type="button"
                            onClick={() => setLoads(prev => ({ ...prev, [currentEx.name]: (prev[currentEx.name] ?? 0) + 1 }))}
                            className="flex-1 py-2 bg-app border border-border-app rounded-xl font-bold text-xs hover:border-accent-app/50 text-slate-300 transition-all active:scale-95 cursor-pointer"
                        >
                            +1 kg
                        </button>
                        <button 
                            type="button"
                            onClick={() => setLoads(prev => ({ ...prev, [currentEx.name]: (prev[currentEx.name] ?? 0) + 5 }))}
                            className="flex-1 py-2 bg-app border border-border-app rounded-xl font-bold text-xs hover:border-accent-app/50 text-slate-300 transition-all active:scale-95 cursor-pointer"
                        >
                            +5 kg
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-mono opacity-30">0kg</span>
                        <input 
                            type="range" 
                            min="0" 
                            max="150" 
                            step="1"
                            value={loads[currentEx.name] ?? 0}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setLoads(prev => ({ ...prev, [currentEx.name]: val }));
                            }}
                            className="flex-1 h-1.5 bg-border-app rounded-lg appearance-none cursor-pointer accent-accent-app"
                        />
                        <span className="text-[9px] font-mono opacity-30">150kg</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-start gap-4 p-6 bg-gold/5 border border-gold/10 rounded-3xl">
                        <Info className="w-5 h-5 text-gold shrink-0 mt-1" />
                        <div className="space-y-2">
                             <p className="text-[10px] font-bold uppercase tracking-widest text-gold/60">Foco Interno</p>
                             <p className="text-lg font-medium italic leading-relaxed">"{currentEx.whatToFeel}"</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-app border border-border-app flex items-center justify-center">
                           <MapPin className="w-6 h-6 text-gold opacity-60" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">Estação / Local</p>
                            <p className="text-xs font-bold uppercase">{currentEx.station || currentEx.equipment} {currentEx.locationHint ? `• ${currentEx.locationHint}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {currentEx.substitutions && currentEx.substitutions.length > 0 && (
                                <button 
                                    onClick={() => {
                                        const nextSub = currentEx.substitutions![0];
                                        const newEx = { ...currentEx, name: nextSub, substitutions: currentEx.substitutions?.slice(1) };
                                        const newExercising = [...exercising];
                                        newExercising[currentIdx] = newEx;
                                        setExercising(newExercising);
                                    }}
                                    className="px-4 py-2 border border-border-app rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-accent-app transition-all flex items-center gap-2"
                                >
                                    <RefreshCw className="w-3 h-3" /> Substituir
                                </button>
                            )}
                            <button 
                                onClick={async () => {
                                    setIsProcessingVoice(true);
                                    try {
                                        const res = await interpretVoiceCommand(profile, { days: [{ exercises: exercising }] } as any, 0, `Quero uma variação inteligente para o exercício ${currentEx.name}. Mude pegada, ângulo ou implemento, mas mantenha o foco.`);
                                        if (res.action === 'substitute' && res.substitution) {
                                            const newEx = { ...currentEx, ...res.substitution };
                                            const newExercising = [...exercising];
                                            newExercising[currentIdx] = newEx;
                                            setExercising(newExercising);
                                        }
                                    } catch (e) {
                                        console.error(e);
                                    } finally {
                                        setIsProcessingVoice(false);
                                    }
                                }}
                                className="px-4 py-2 bg-gold/10 border border-gold/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gold hover:bg-gold/20 transition-all flex items-center gap-2"
                            >
                                <Zap className="w-3 h-3" /> Variar
                            </button>
                        </div>
                    </div>

                    {currentEx.safetyAlerts && currentEx.safetyAlerts.length > 0 && (
                        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Cuidado Biomecânico</p>
                                <ul className="text-[10px] text-rose-500/70 list-disc list-inside italic">
                                    {currentEx.safetyAlerts.map((alert, i) => <li key={i}>{alert}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="p-6 md:p-12 bg-app border-t border-border-app relative z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-6">
            <button 
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="p-6 rounded-3xl border border-border-app hover:bg-card-app transition-all disabled:opacity-10"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Voice Assistant Button - Central & Distinctive */}
            <div className="relative group">
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleListen}
                    className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl relative z-10",
                        isListening ? "bg-rose-500 text-white animate-pulse" : "bg-gold text-white shadow-gold/20"
                    )}
                >
                    {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </motion.button>
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gold/10 text-gold text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                    Treinador IA
                </div>
            </div>

            <button 
                onClick={handleNext}
                className="flex-1 p-6 bg-accent-app text-white rounded-[32px] font-black uppercase tracking-[0.2em] shadow-xl shadow-accent-app/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
            >
                {currentIdx === exercising.length - 1 ? 'Finalizar' : 'Próximo'}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
      </footer>

      {/* MODAL 1: Proteção Contra Saída Acidental - Item 2 */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card-app border border-border-app p-8 rounded-[32px] max-w-md w-full space-y-6 text-center shadow-2xl relative"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight text-white">Sair do Treino?</h3>
                <p className="text-sm text-slate-400">
                  Você está com um treino ativo em andamento. Como deseja prosseguir para evitar perdas acidentais?
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    setIsPaused(false);
                  }}
                  className="w-full py-4 bg-accent-app text-white font-black uppercase text-xs tracking-widest rounded-2xl cursor-pointer hover:bg-accent-app/95 transition-all text-center"
                >
                  Continuar Treinando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaused(true);
                    setShowExitConfirm(false);
                  }}
                  className="w-full py-4 bg-gold/10 border border-gold/30 text-gold font-black uppercase text-xs tracking-widest rounded-2xl cursor-pointer hover:bg-gold/20 transition-all text-center"
                >
                  Pausar Sessão Ativa
                </button>
                <button
                  type="button"
                  onClick={handleExitWithPartialSave}
                  className="w-full py-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase text-xs tracking-wider rounded-2xl cursor-pointer hover:bg-emerald-500/20 transition-all text-center"
                >
                  Salvar Progresso Parcial & Sair
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-3 text-slate-500 hover:text-rose-500 font-bold uppercase text-[10px] tracking-widest transition-colors cursor-pointer text-center"
                >
                  Sair sem salvar histórico
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Recuperação de Autosave Contínuo - Item 3 */}
      <AnimatePresence>
        {showRecoverPrompt && savedSessionData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card-app border border-border-app p-8 rounded-[32px] max-w-md w-full space-y-6 text-center shadow-2xl relative"
            >
              <div className="w-16 h-16 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gold">Sessão Interrompida</span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-white">Recuperar Treino?</h3>
                <p className="text-sm text-slate-400">
                  Encontramos um progresso de treino salvo automaticamente do dia de hoje. Deseja retomar de onde parou?
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (savedSessionData) {
                      setCurrentIdx(savedSessionData.currentIdx || 0);
                      setLoads(savedSessionData.loads || {});
                      setTime(savedSessionData.time || 0);
                      if (savedSessionData.exercising) {
                        setExercising(savedSessionData.exercising);
                      }
                    }
                    setShowRecoverPrompt(false);
                  }}
                  className="w-full py-4 bg-gold text-slate-950 font-black uppercase text-xs tracking-widest rounded-2xl cursor-pointer hover:bg-gold/90 transition-all text-center"
                >
                  Sim, Recuperar Progresso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(`moving_heal_autosave_${day.dayName}`);
                    setShowRecoverPrompt(false);
                  }}
                  className="w-full py-3 text-slate-500 hover:text-slate-200 font-bold uppercase text-[10px] tracking-widest transition-colors cursor-pointer text-center"
                >
                  Não, Começar do Zero
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
