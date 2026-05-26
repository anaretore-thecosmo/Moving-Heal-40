export type PainArea = 'Lombar' | 'Joelho' | 'Ombro' | 'Quadril' | 'Cervical' | 'Punho' | 'Tornozelo' | 'Nenhuma';

export interface UserProfile {
  userId: string;
  email?: string;
  displayName: string;
  age: number;
  gender: 'male' | 'female';
  height?: number;
  weight?: number;
  fitnessLevel: 'Iniciante' | 'Intermediário' | 'Avançado';
  trainingHistory?: string;
  techniqueConfidence?: string;
  objectives: string[];
  pains: PainArea[];
  sessionDuration: number;
  availableEquipment: string[];
  trainingFrequencyPerWeek?: number;
  planTypePreference?: string;
  createdAt: any;
  updatedAt?: any;
  
  // Custom FCM and Lembretes Settings (BLOCO 44)
  fcmToken?: string;
  fcmEnabled?: boolean;
  reminderMinutesBefore?: number;
  scheduledNotificationTime?: string; // e.g., '18:00'
  consistencyDaysCount?: number;
  habitualWorkoutTime?: string;
  
  // High-fidelity profile sections
  demographics?: {
    fatDistribution?: string;
    muscleGainEase?: string;
    muscleGainAreas?: string[];
    muscleDifficultyAreas?: string[];
  };
  bodyMap?: {
    posture?: string;
    mobilityLevel?: string;
    bodyComfort?: string;
  };
  painProfile?: {
    injuries?: string[];
    chronicPains?: string[];
  };
  mobilityProfile?: {
    stiffAreas?: string[];
    flexibleAreas?: string[];
  };
  experiencePreferences?: {
    equipment?: string[];
    trainingStyles?: string[]; // classic, machine, functional, athletic, technical, free, hybrid
    trainingArchetype?: 'classic' | 'modern' | 'athletic' | 'minimum-effort' | 'high-tech' | 'old-school';
    methodPreference?: string; // bi-set/circuito/tradicional
    desiredSensation?: string[];
    format?: string;
    variety?: string;
    signatureStyles?: string[];
    cardioPreference: {
      type: 'hiit' | 'leve' | 'separado' | 'integrado' | 'evito';
      frequency?: number;
      enjoyment?: number;
    };
    avoidedExercises?: string[];
    neglectedMuscles?: string[];
  };
  psychologicalProfile?: {
    motivationSource?: string;
    structurePreference?: string;
    varietyLove?: number;
    focusPreference: 'controle' | 'intensidade' | 'integrado';
    decisionStyle: 'previsibilidade' | 'variedade' | 'autonomia' | 'direcao';
    repetitionTolerance?: 'alta' | 'média' | 'baixa';
  };
  physicalResponse?: {
    typicalFeel?: string[];
    recoverySpeed: 'rápida' | 'misto' | 'lenta';
    fastRecoveryMuscles?: string[];
    slowRecoveryMuscles?: string[];
    inflammationProneRegions: string[];
    sustenanceLimitMinutes?: number;
  };
  motorProfile?: {
    yearsOfExperience?: number;
    repertoireDepth: 'limited' | 'standard' | 'vast';
    coordinationLevel: 'developing' | 'competent' | 'advanced';
    bodyAwareness: 'developing' | 'competent' | 'advanced';
    complexityTolerance: 'low' | 'medium' | 'high';
    comfortWithFreeWeights: 'low' | 'medium' | 'high';
    comfortWithAdvancedEquipment?: string[]; // e.g., 'Kettlebells', 'Caixa de Salto', 'Barra Olímpica'
  };
  gymEnvironment?: {
    photos?: string[];
    identifiedEquipment: string[];
    gymStyle?: 'classic' | 'hybrid' | 'functional' | 'premium' | 'compact' | 'high-traffic';
    lastUpdated?: string;
  };
  currentPhase?: 'protection' | 'reintroduction' | 'expansion';
  recoveryStatus?: {
    lastPainAssessment?: string;
    improvementProgress: Record<string, number>; // area -> 0 to 100 level of recovery
  };
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  equipment: string;
  role?: 'main' | 'complementary' | 'technical' | 'metabolic' | 'warm-up';
  progressionStrategy?: string; // e.g., 'Aumento de carga', 'Mais reps', 'Menos descanso'
  station?: string; // e.g., 'polia', 'halteres', 'banco', 'maquina'
  locationHint?: string; // e.g., 'Zona de Pesos Livres', 'Setor de Máquinas', 'Poliestação'
  variation?: {
    type: 'grip' | 'angle' | 'implement' | 'support' | 'unilateral' | 'pace' | 'position' | 'none';
    description: string; // e.g., 'Pegada Neutra', 'Inclinado 30º', 'Unilateral'
  };
  whatToFeel: string;
  mechanics?: string;
  safetyAlerts?: string[];
  substitutions?: string[];
}

export interface WorkoutDay {
  dayName: string;
  focus: string;
  flowStrategy: 'station-grouped' | 'minimum-displacement' | 'circuit';
  estimatedDuration: number;
  neuralSignature: string;
  exercises: Exercise[];
  safetyWarnings?: string[];
}

export interface Workout {
  id?: string;
  userId: string;
  name: string;
  signature?: string;
  days: WorkoutDay[];
  status: 'active' | 'completed';
  createdAt: any;
}

export interface Session {
  id?: string;
  userId: string;
  workoutId: string;
  dayIndex: number;
  startedAt: any;
  completedAt?: any;
  rating?: string;
  satisfactionScore?: number;
  effortScore?: number;
  painLevel?: number;
  feltWhere?: string[];
  bodyFeel?: string;
  exercisesLiked?: string;
  exercisesToAvoid?: string;
  voiceInteractions?: VoiceInteraction[];
  exerciseLoads?: Record<string, number>;
  gymCrowdedness?: string;
  energyLevel?: string;
  painToday?: string;
  durationMinutes?: number;
  intent?: string;
}

export interface VoiceInteraction {
  timestamp: string;
  transcript: string;
  detectedIntent: string;
  actionTaken: string;
  originalExercise?: string;
  replacementExercise?: string;
  reason?: string;
}

export interface ProgressionDecision {
  id?: string;
  type: 'increase' | 'maintain' | 'decrease' | 'deload';
  reason: string;
  changes: string[];
}
