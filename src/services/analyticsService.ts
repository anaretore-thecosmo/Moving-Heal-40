import { Session, UserProfile } from "../types";

export interface MuscleVolume {
  region: string;
  volume: number; // raw count or weighted intensity
  intensity: number; // 0 to 1 (renamed for compatibility)
  isPainful: boolean;
}

const MUSCLE_MAPPING: Record<string, string[]> = {
  'Peito': ['peito', 'supino', 'chest', 'push-up', 'crucifixo', 'fly'],
  'Costas': ['costas', 'remada', 'pull-up', 'puxada', 'back', 'row', 'lat'],
  'Ombros': ['ombro', 'shoulder', 'desenvolvimento', 'elevação', 'deltoide'],
  'Braços': ['braço', 'biceps', 'triceps', 'rosca', 'extension', 'curl', 'arm'],
  'Core': ['abdominal', 'abs', 'core', 'prancha', 'plank', 'crunch', 'leg raise'],
  'Glúteos': ['glúteo', 'butt', 'abdução', 'elevação pélvica', 'hip thrust'],
  'Quadríceps': ['quadríceps', 'agachamento', 'squat', 'extensora', 'leg press', 'avanço', 'lunge'],
  'Posterior': ['posterior', 'flexora', 'stiff', 'terra', 'deadlift', 'hamstring'],
  'Panturrilha': ['panturrilha', 'calf', 'gemelar'],
  'Lombar': ['lombar', 'lower back', 'hiperextensão']
};

export interface AdherenceAnalysis {
  inactivityDays: number;
  abandonmentPattern: {
    isHighRisk: boolean;
    reason?: string;
    preferredDuration?: number;
  };
  microVictories: {
    label: string;
    description: string;
    type: 'consistency' | 'stability' | 'recovery';
  }[];
  returnMode: {
    isActive: boolean;
    level: 'soft' | 'moderate' | 'reintegration';
    message: string;
  };
  shouldTriggerAntiAbandonment: boolean;
}

export interface FatigueAnalysis {
  isDetected: boolean;
  type: 'physical' | 'neural' | 'mental' | 'none';
  level: number; // 0 to 1
  insight: string;
  recommendation: 'deload' | 'restore' | 'shorten' | 'none';
}

export function analyzeFatigue(history: Session[]): FatigueAnalysis {
  if (history.length < 3) return { isDetected: false, type: 'none', level: 0, insight: "", recommendation: 'none' };

  const last3 = history.slice(0, 3);
  
  // Indicators
  const avgEffort = last3.reduce((acc, s) => acc + (s.effortScore || 0), 0) / 3;
  const skipCount = last3.reduce((acc, s) => acc + (s.logs?.filter(l => l.skipped).length || 0), 0);
  const swapCount = last3.reduce((acc, s) => acc + (s.logs?.filter(l => l.notes?.includes('Feedback: Trocar')).length || 0), 0);
  const boringCount = last3.filter(s => s.logs?.some(l => l.notes?.includes('Feedback: Chato'))).length;
  
  // 1. Mental Satiety (Boredom + Swaps)
  if (boringCount >= 2 || swapCount >= 3) {
    return {
      isDetected: true,
      type: 'mental',
      level: 0.7,
      insight: "Senti que o ritmo e a estrutura andam um pouco monótonos para você.",
      recommendation: 'restore'
    };
  }

  // 2. Physical Fatigue (High Effort + Skips + Pain)
  const painReports = last3.filter(s => (s.painLevel || 0) > 4).length;
  if (avgEffort > 8 && (skipCount > 2 || painReports >= 2)) {
    return {
      isDetected: true,
      type: 'physical',
      level: 0.8,
      insight: "Seu corpo está sinalizando um acúmulo de esforço acima do ideal.",
      recommendation: 'deload'
    };
  }

  // 3. Neural Fatigue (Hard to finish, low energy)
  const lowEnergy = last3.filter(s => s.energyLevel === 'Low').length;
  if (lowEnergy >= 2 && avgEffort > 7) {
    return {
      isDetected: true,
      type: 'neural',
      level: 0.6,
      insight: "Sua recuperação parece estar demorando um pouco mais esta semana.",
      recommendation: 'shorten'
    };
  }

  return { isDetected: false, type: 'none', level: 0, insight: "", recommendation: 'none' };
}

export interface PerformancePattern {
  bestTimeOfDay: 'Manhã' | 'Tarde' | 'Noite' | 'Indefinido';
  bestDayOfWeek: string;
  energyPeak: string;
  riskFactor: string;
  insight: string;
}

export function analyzePerformancePatterns(history: Session[]): PerformancePattern {
  if (history.length < 5) {
    return { 
      bestTimeOfDay: 'Indefinido', 
      bestDayOfWeek: 'Processando...', 
      energyPeak: 'Aguardando mais dados', 
      riskFactor: 'Aguardando mais dados', 
      insight: 'Continue treinando para que eu possa mapear seu ritmo biológico.' 
    };
  }

  const times = { morning: 0, afternoon: 0, evening: 0 };
  const days: Record<string, number> = {};
  const energyByTime: Record<string, number[]> = { morning: [], afternoon: [], evening: [] };
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  history.forEach(s => {
    const date = new Date(s.createdAt);
    const hour = date.getHours();
    const day = weekdays[date.getDay()];
    
    days[day] = (days[day] || 0) + 1;

    let period: 'morning' | 'afternoon' | 'evening' = 'morning';
    if (hour >= 12 && hour < 18) period = 'afternoon';
    else if (hour >= 18 || hour < 5) period = 'evening';
    
    times[period]++;
    const energyVal = s.energyLevel === 'High' ? 10 : (s.energyLevel === 'Medium' ? 7 : 4);
    energyByTime[period].push(energyVal);
  });

  const bestPeriodKey = (Object.keys(times) as Array<keyof typeof times>).reduce((a, b) => times[a] > times[b] ? a : b);
  const bestDay = Object.keys(days).reduce((a, b) => days[a] > days[b] ? a : b);

  const avgEnergyByTime = {
    morning: energyByTime.morning.length ? energyByTime.morning.reduce((a,b) => a+b, 0) / energyByTime.morning.length : 0,
    afternoon: energyByTime.afternoon.length ? energyByTime.afternoon.reduce((a,b) => a+b, 0) / energyByTime.afternoon.length : 0,
    evening: energyByTime.evening.length ? energyByTime.evening.reduce((a,b) => a+b, 0) / energyByTime.evening.length : 0,
  };

  const peakPeriodKey = (Object.keys(avgEnergyByTime) as Array<keyof typeof avgEnergyByTime>).reduce((a, b) => avgEnergyByTime[a] > avgEnergyByTime[b] ? a : b);
  
  const periodLabels = { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite' };
  
  let insight = "";
  if (peakPeriodKey === 'morning') {
    insight = "Seu sistema nervoso parece mais desperto e responsivo no período da manhã.";
  } else if (peakPeriodKey === 'evening') {
    insight = "Você costuma tolerar melhor volumes maiores e treinos de força à noite.";
  } else {
    insight = "Sua estabilidade de energia é maior durante o período da tarde.";
  }

  return {
    bestTimeOfDay: periodLabels[bestPeriodKey] as any,
    bestDayOfWeek: bestDay,
    energyPeak: `Pico de energia: ${periodLabels[peakPeriodKey]}`,
    riskFactor: times.evening > 5 && avgEnergyByTime.evening < 5 ? "Risco de abandono por fadiga mental à noite" : "Aderência saudável",
    insight
  };
}

export interface NeuralSatietyAnalysis {
  isSatiated: boolean;
  level: number; // 0 to 1
  dominantSignature: string;
  insight: string;
  recommendation: 'change_signature' | 'change_structure' | 'none';
}

export function analyzeNeuralSatiety(history: Session[]): NeuralSatietyAnalysis {
  if (history.length < 4) return { isSatiated: false, level: 0, dominantSignature: "", insight: "", recommendation: 'none' };

  const last4 = history.slice(0, 4);
  const signatures = last4.map(s => s.signature).filter(Boolean);
  
  if (signatures.length < 3) return { isSatiated: false, level: 0, dominantSignature: "", insight: "", recommendation: 'none' };

  // Count occurrences
  const counts: Record<string, number> = {};
  signatures.forEach(s => {
    if (s) counts[s] = (counts[s] || 0) + 1;
  });

  const entry = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a);
  const mostUsed = entry[0];
  const count = entry[1];

  if (count >= 3) {
    return {
      isSatiated: true,
      level: count / 4,
      dominantSignature: mostUsed,
      insight: `Detectei uma repetição da assinatura "${mostUsed}". Seu sistema nervoso pode estar entrando em modo automático.`,
      recommendation: 'change_signature'
    };
  }

  // Check structure repetition (same intent)
  const intents = last4.map(s => s.intent);
  const uniqueIntents = new Set(intents).size;
  if (uniqueIntents === 1) {
    const dominantSig = last4[0].signature || "Misto";
    return {
      isSatiated: true,
      level: 0.7,
      dominantSignature: dominantSig,
      insight: "A dinâmica dos seus últimos treinos tem sido muito similar. Sugiro quebrar o padrão hoje.",
      recommendation: 'change_structure'
    };
  }

  return { isSatiated: false, level: 0, dominantSignature: "", insight: "", recommendation: 'none' };
}

export interface PsychologicalAnalysis {
  detectedProfile: string;
  adherenceDriver: string;
  abandonmentRisk: string;
  pleasureSource: string;
  suggestedComplexity: 'Low' | 'Medium' | 'High';
}

export interface RegionalRecovery {
  legs: number; // 0-100
  upper: number;
  core: number;
  joints: number;
  insights: { region: string; speed: 'Fast' | 'Slow' | 'Normal'; status: string }[];
}

export interface BodyComfortProfile {
  dominantFeel: string;
  comfortTrend: 'Improving' | 'Degrading' | 'Stable';
  insight: string;
  affinities: { feel: string; count: number }[];
}

export function analyzeBodyComfort(history: Session[]): BodyComfortProfile {
  const last10 = history.slice(0, 10);
  const feels = last10.map(s => s.bodyFeel).filter(Boolean) as string[];

  if (feels.length === 0) {
    return {
      dominantFeel: 'Neutro',
      comfortTrend: 'Stable',
      insight: 'Ainda estou calibrando sua percepção subjetiva.',
      affinities: []
    };
  }

  const counts: Record<string, number> = {};
  feels.forEach(f => counts[f] = (counts[f] || 0) + 1);
  const affinities = Object.entries(counts).map(([feel, count]) => ({ feel, count })).sort((a,b) => b.count - a.count);
  const dominantFeel = affinities[0].feel;

  // Trend logic: compare last 3 with 3 before
  const recent3 = feels.slice(0, 3);
  const previous3 = feels.slice(3, 6);
  
  const positiveFeels = ['encaixado', 'leve', 'forte', 'fluido', 'confortável'];
  const negativeFeels = ['rígido', 'travado', 'estranho', 'instável', 'pesado'];

  const score = (arr: string[]) => arr.reduce((acc, f) => acc + (positiveFeels.includes(f) ? 1 : (negativeFeels.includes(f) ? -1 : 0)), 0);
  
  const recentScore = score(recent3);
  const previousScore = score(previous3);
  
  let comfortTrend: 'Improving' | 'Degrading' | 'Stable' = 'Stable';
  if (previous3.length > 0) {
    if (recentScore > previousScore) comfortTrend = 'Improving';
    else if (recentScore < previousScore) comfortTrend = 'Degrading';
  }

  let insight = "";
  if (dominantFeel === 'fluido') {
    insight = "Você costuma responder melhor a treinos que deixam seu corpo mais fluido do que exausto.";
  } else if (dominantFeel === 'rígido' || dominantFeel === 'travado') {
    insight = "Percebi uma tendência à rigidez nos últimos treinos. Sugiro focar em 'Mobilidade' ou 'Recuperativo' hoje.";
  } else if (dominantFeel === 'encaixado') {
    insight = "Você está em um ótimo momento biomecânico. Os movimentos estão 'conectados'.";
  } else {
    insight = `Sua sensação predominante é de um corpo ${dominantFeel}.`;
  }

  return { dominantFeel, comfortTrend, insight, affinities };
}

export function analyzeRegionalRecovery(history: Session[]): RegionalRecovery {
  const regions = {
    legs: 100,
    upper: 100,
    core: 100,
    joints: 100
  };

  if (history.length === 0) return { ...regions, insights: [] };

  const last10 = history.slice(0, 10);
  
  // Pain analysis by target muscles
  const legMuscles = ['Quadríceps', 'Posterior de Coxa', 'Glúteo', 'Panturrilha'];
  const upperMuscles = ['Peitoral', 'Costas', 'Ombros', 'Bíceps', 'Tríceps'];
  
  last10.forEach((session, index) => {
    const recencyWeight = (10 - index) / 10;
    const muscleImpact = (session.painLevel || 0) * 10 * recencyWeight;
    const jointImpact = (session.painLevel || 0) * 8 * recencyWeight;

    // Check targeted muscles in this session
    const workoutMuscles = session.logs?.flatMap(l => l.targetMuscles || []) || [];
    
    const targetsLegs = workoutMuscles.some(m => legMuscles.includes(m));
    const targetsUpper = workoutMuscles.some(m => upperMuscles.includes(m));
    const targetsCore = workoutMuscles.includes('Core') || workoutMuscles.includes('Abdominais');

    if (targetsLegs) regions.legs -= muscleImpact;
    if (targetsUpper) regions.upper -= muscleImpact;
    if (targetsCore) regions.core -= muscleImpact * 0.5;
    
    // Joint fatigue often tracks with intensity and pain
    if ((session.rpe || 0) > 8 || (session.painLevel || 0) > 3) {
      regions.joints -= jointImpact;
    }
  });

  // Insights on recovery speed
  const insights: RegionalRecovery['insights'] = [];
  
  // Inferring speed: if performance is high despite frequent training, it's "Fast"
  const checkSpeed = (r: keyof typeof regions, name: string) => {
    const score = Math.max(0, Math.min(100, regions[r]));
    regions[r] = score;
    
    let speed: 'Fast' | 'Slow' | 'Normal' = 'Normal';
    if (score < 40) speed = 'Slow';
    if (score > 85 && last10.length > 5) speed = 'Fast';
    
    insights.push({
      region: name,
      speed,
      status: score > 70 ? 'Recuperado' : (score > 40 ? 'Em recuperação' : 'Sobrecarga')
    });
  };

  checkSpeed('legs', 'Membros Inferiores');
  checkSpeed('upper', 'Membros Superiores');
  checkSpeed('core', 'Core');
  checkSpeed('joints', 'Articulações');

  return { ...regions, insights };
}

export interface RecoveryScore {
  score: 'Ótima' | 'Moderada' | 'Baixa';
  level: number; // 0 to 100
  insight: string;
  recommendation: 'Full' | 'Condensed' | 'Restorative';
}

export function analyzeRecoveryScore(history: Session[]): RecoveryScore {
  if (history.length === 0) return { score: 'Ótima', level: 90, insight: "Pronta para começar a jornada.", recommendation: 'Full' };

  const last5 = history.slice(0, 5);
  let baseLevel = 100;
  
  // 1. Fatigue Impact
  const fatigue = analyzeFatigue(history);
  if (fatigue.isDetected) {
    baseLevel -= (fatigue.level * 40);
  }

  // 2. Pain Impact
  const recentPain = last5.reduce((acc, s) => acc + (s.painLevel || 0), 0) / (last5.length || 1);
  baseLevel -= (recentPain * 6);

  // 3. Energy Levels
  const lowEnergySessions = last5.filter(s => s.energyLevel === 'Low').length;
  baseLevel -= (lowEnergySessions * 10);

  // 4. Consistency & Return
  const adherence = analyzeAdherence(history);
  if (adherence.inactivityDays > 5) {
    baseLevel -= (adherence.inactivityDays * 2);
  }

  // 5. Success Rate (Skips)
  const skipRate = last5.reduce((acc, s) => acc + (s.logs?.filter(l => l.skipped).length || 0), 0) / (last5.length || 1);
  baseLevel -= (skipRate * 5);

  const finalScore = Math.max(0, Math.min(100, baseLevel));
  
  let score: RecoveryScore['score'] = 'Ótima';
  let rec: RecoveryScore['recommendation'] = 'Full';
  let insight = "Seu corpo parece estar processando bem o estímulo e recuperando as reservas energéticas.";

  if (finalScore < 50) {
    score = 'Baixa';
    rec = 'Restorative';
    insight = "Sinais de fadiga acumulada e recuperação incompleta. Hoje o corpo pede pausa ativa ou intensidade baixa.";
  } else if (finalScore < 80) {
    score = 'Moderada';
    rec = 'Condensed';
    insight = "Recuperação em andamento, mas com algumas reservas baixas. Um treino denso e focado pode ser melhor que volume alto.";
  }

  return { score, level: Math.round(finalScore), insight, recommendation: rec };
}

export interface DurationSustainability {
  isSustainable: boolean;
  optimalDuration: number;
  abandonmentRisk: boolean;
  insight: string;
  recommendation: 'shorter' | 'condense' | 'keep' | 'none';
}

export function analyzeDurationSustainability(history: Session[]): DurationSustainability {
  if (history.length < 5) {
    return { isSustainable: true, optimalDuration: 45, abandonmentRisk: false, insight: "Ainda estou mapeando seu ritmo de vida real.", recommendation: 'none' };
  }

  const last10 = history.slice(0, 10);
  const completions = last10.filter(s => s.isCompleted).length;
  const avgPlanned = last10.reduce((acc, s) => acc + s.durationMinutes, 0) / last10.length;
  const avgActual = last10.reduce((acc, s) => acc + (s.actualDurationMinutes || 0), 0) / (last10.filter(s => s.actualDurationMinutes).length || 1);
  
  const completionRate = completions / last10.length;
  const timeDifference = avgActual - avgPlanned;

  // 1. High Abandonment for long workouts
  const longWorkouts = last10.filter(s => s.durationMinutes >= 50);
  const longCompletions = longWorkouts.filter(s => s.isCompleted).length;
  const longCompletionRate = longWorkouts.length > 0 ? longCompletions / longWorkouts.length : 1;

  if (longWorkouts.length >= 2 && longCompletionRate < 0.6) {
    return {
      isSustainable: false,
      optimalDuration: Math.round(avgActual),
      abandonmentRisk: true,
      insight: `Percebi que sessões acima de 50 min geram ${Math.round((1-longCompletionRate)*100)}% de abandono para você.`,
      recommendation: 'shorter'
    };
  }

  // 2. High actual time vs planned (Slower pace)
  if (timeDifference > 10 && completionRate > 0.8) {
    return {
      isSustainable: true,
      optimalDuration: Math.round(avgActual),
      abandonmentRisk: false,
      insight: "Seu ritmo real é um pouco mais cadenciado que o previsto. Vamos ajustar para não gerar pressa.",
      recommendation: 'keep'
    };
  }

  // 3. Excellent sustainability in short workouts
  const shortWorkouts = last10.filter(s => s.durationMinutes <= 35);
  const shortCompletionRate = shortWorkouts.length > 0 ? shortWorkouts.filter(s => s.isCompleted).length / shortWorkouts.length : 0;

  if (shortWorkouts.length >= 3 && shortCompletionRate > 0.9) {
    return {
      isSustainable: true,
      optimalDuration: 30,
      abandonmentRisk: false,
      insight: "Seu 'Sweet Spot' parece ser sessões de 30 minutos. Sua aderência aqui é impecável.",
      recommendation: 'condense'
    };
  }

  return { isSustainable: true, optimalDuration: Math.round(avgPlanned), abandonmentRisk: false, insight: "Seu tempo real está em harmonia com o planejamento.", recommendation: 'none' };
}

export function analyzePsychologicalBehavior(profile: UserProfile, history: Session[]): PsychologicalAnalysis {
  const driver = profile.psychologicalProfile?.motivationSource || 'technique';
  const last3 = history.slice(0, 3);
  
  // Complexity logic
  let complexity: 'Low' | 'Medium' | 'High' = 'Medium';
  if (profile.fitnessLevel === 'Iniciante' || profile.psychologicalProfile?.structurePreference === 'strict') {
    complexity = 'Low';
  } else if (profile.fitnessLevel === 'Avançado' && profile.psychologicalProfile?.motivationSource === 'challenge') {
    complexity = 'High';
  }

  // Behavior detection
  const recentCompletion = last3.filter(s => s.isCompleted).length;
  const recentSatisfaction = last3.reduce((acc, s) => acc + (s.satisfactionScore || 0), 0) / (last3.length || 1);

  let abandonmentRisk = "Baixo";
  if (last3.length >= 2 && recentCompletion < 2 && recentSatisfaction < 6) {
    abandonmentRisk = "Alto - Fadiga emocional detectada";
  }

  const profileMap: Record<string, string> = {
    challenge: "Busca por superação e desafio",
    technique: "Refinamento técnico e precisão",
    lightness: "Busca por bem-estar e fluidez",
    intensity: "Foco em esforço e pump muscular",
    therapeutic: "Treino como ferramenta mental"
  };

  return {
    detectedProfile: profileMap[driver] || "Equilibrado",
    adherenceDriver: driver === 'challenge' ? "Novos recordes e desafios" : "Sensação de controle e técnica",
    abandonmentRisk,
    pleasureSource: (profile.experiencePreferences?.desiredSensation && profile.experiencePreferences.desiredSensation[0]) || "Movimento",
    suggestedComplexity: complexity
  };
}

export function analyzeAdherence(history: Session[]): AdherenceAnalysis {
  const now = new Date().getTime();
  const lastSession = history.length > 0 ? new Date(history[0].createdAt).getTime() : now;
  const inactivityDays = Math.floor((now - lastSession) / (1000 * 60 * 60 * 24));

  const microVictories: AdherenceAnalysis['microVictories'] = [];
  
  // Consistency micro-victory
  const last7Days = history.filter(s => (now - new Date(s.createdAt).getTime()) < (7 * 24 * 60 * 60 * 1000));
  if (last7Days.length >= 3) {
    microVictories.push({
      label: "Frequência Elegante",
      description: "Você manteve uma cadência fluida nos últimos 7 dias. O corpo responde bem a essa estabilidade.",
      type: 'consistency'
    });
  }

  // Stability micro-victory (low pain reports)
  const last10Sessions = history.slice(0, 10);
  const painFreeSessions = last10Sessions.filter(s => (s.painLevel || 0) === 0).length;
  if (painFreeSessions >= 8 && history.length >= 10) {
    microVictories.push({
      label: "Fundação Sólida",
      description: "Sua regulação de dor está excelente. Isso mostra que os ajustes biomecânicos estão protegendo suas articulações.",
      type: 'stability'
    });
  }

  // Return mode logic
  const returnMode: AdherenceAnalysis['returnMode'] = {
    isActive: inactivityDays >= 5,
    level: inactivityDays >= 15 ? 'reintegration' : (inactivityDays >= 10 ? 'moderate' : 'soft'),
    message: ""
  };

  if (returnMode.isActive) {
    if (returnMode.level === 'reintegration') {
      returnMode.message = "Bem-vinda de volta. Como você ficou um período maior afastada, preparei um treino focado em mobilidade e despertar muscular, sem pressa.";
    } else if (returnMode.level === 'moderate') {
      returnMode.message = "Que bom ver você de novo. Vamos retomar com um volume moderado para seu corpo se readaptar ao ritmo natural.";
    } else {
      returnMode.message = "Retomando a consistência. Hoje o foco é apenas o retorno ao movimento, com cargas suaves e foco na técnica.";
    }
  }

  // Abandonment patterns
  const highEffortHighSkip = history.filter(s => (s.effortScore || 0) >= 9 && (s.logs?.some(l => l.skipped))).length;
  const abandonmentPattern = {
    isHighRisk: highEffortHighSkip >= 2,
    reason: highEffortHighSkip >= 2 ? "Intensidade muito alta gerando desmotivação" : undefined,
    preferredDuration: history.length > 0 ? (history.reduce((acc, s) => acc + (s.actualDurationMinutes || 0), 0) / history.length) : undefined
  };

  // Anti-abandonment trigger logic
  // Trigger if inactive for more than 3 days, or if high risk is detected, or if recent quality is very poor
  const last3 = history.slice(0, 3);
  const lowSatisfaction = last3.length >= 2 && last3.every(s => (s.satisfactionScore || 10) < 6);
  
  const shouldTriggerAntiAbandonment = inactivityDays >= 3 || abandonmentPattern.isHighRisk || lowSatisfaction;

  return {
    inactivityDays,
    abandonmentPattern,
    microVictories,
    returnMode,
    shouldTriggerAntiAbandonment
  };
}
export function calculateMuscleIntensities(history: Session[]): MuscleVolume[] {
  const volumes: Record<string, number> = {};
  const painReports: Record<string, number> = {};

  Object.keys(MUSCLE_MAPPING).forEach(region => {
    volumes[region] = 0;
    painReports[region] = 0;
  });

  history.forEach(session => {
    session.logs?.forEach(log => {
      if (log.skipped) return;
      
      const name = log.name.toLowerCase();
      let foundRegion: string | null = null;

      for (const [region, keywords] of Object.entries(MUSCLE_MAPPING)) {
        if (keywords.some(k => name.includes(k))) {
          volumes[region] += 1;
          foundRegion = region;
          break;
        }
      }

      if (foundRegion && (log.painLevel || 0) > 0) {
        painReports[foundRegion] += 1;
      }
    });

    // Check session-level pain regions
    session.feltWhere?.forEach(region => {
      const normalizedRegion = Object.keys(volumes).find(r => region.toLowerCase().includes(r.toLowerCase())) || 
                               (region.includes('Costas') ? 'Costas' : null);
      if (normalizedRegion) {
        painReports[normalizedRegion] += 1;
      }
    });
  });

  const maxVolume = Math.max(...Object.values(volumes), 1);

  return Object.keys(volumes).map(region => ({
    region,
    volume: volumes[region],
    intensity: volumes[region] / maxVolume,
    isPainful: painReports[region] >= 2 // Threshold for persistent pain
  }));
}
