import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { ChevronRight, ChevronLeft, Check, Loader2, Sparkles, Brain, Heart, Target, Zap, Waves, Shield, Activity, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import AnamnesisResult from './AnamnesisResult';

interface Props {
  user: User;
  onComplete: (profile: UserProfile) => void;
}

type QuestionType = {
  id: string;
  question: string;
  sub: string;
  type: 'text' | 'number' | 'select' | 'multi-select' | 'range' | 'choice';
  field: string;
  options?: { value: any; label: string; icon?: any; sub?: string }[];
  min?: number;
  max?: number;
  step?: number;
  parentField?: string; // for nested fields like experiencePreferences
};

const QUESTIONS: QuestionType[] = [
  // IDENTITY & BASICS
  {
    id: 'name',
    question: 'Como quer ser chamado?',
    sub: 'Seu nome ou apelido para personalizarmos sua jornada.',
    type: 'text',
    field: 'displayName'
  },
  {
    id: 'age',
    question: 'Qual a sua idade?',
    sub: 'O Moving Heal é otimizado para a fisiologia 40+.',
    type: 'number',
    field: 'age'
  },
  {
    id: 'gender',
    question: 'Sexo Biológico',
    sub: 'Direcionamento para ajustes metabólicos e hormonais.',
    type: 'choice',
    field: 'gender',
    options: [
      { value: 'male', label: 'Masculino' },
      { value: 'female', label: 'Feminino' }
    ]
  },
  {
    id: 'height',
    question: 'Sua estatura (cm)',
    sub: 'Usado para cálculos de alavancagem biomecânica.',
    type: 'number',
    field: 'height'
  },
  {
    id: 'weight',
    question: 'Seu peso atual (kg)',
    sub: 'Ponto de partida para controle de carga e massa.',
    type: 'number',
    field: 'weight'
  },
  {
    id: 'fat_dist',
    question: 'Onde seu corpo prioriza estocar energia?',
    sub: 'Mapeamento de perfil lipídico e metabólico.',
    type: 'choice',
    parentField: 'demographics',
    field: 'fatDistribution',
    options: [
        { value: 'abdominal', label: 'Região Abdominal', sub: 'Foco em sensibilidade insulínica' },
        { value: 'pernas_quadril', label: 'Pernas e Quadril', sub: 'Perfil ginoide' },
        { value: 'uniforme', label: 'Distribuição Uniforme', sub: 'Equilíbrio metabólico' },
        { value: 'baixa', label: 'Baixo percentual', sub: 'Foco em superávit/ganho' }
    ]
  },
  {
    id: 'muscle_ease',
    question: 'Onde você sente que ganha massa muscular com facilidade?',
    sub: 'Identificamos seus pontos fortes para equilibrar o volume total.',
    type: 'multi-select',
    parentField: 'demographics',
    field: 'muscleGainAreas',
    options: [
        { value: 'Pernas', label: 'Pernas' },
        { value: 'Braços', label: 'Braços' },
        { value: 'Peitoral', label: 'Peitoral' },
        { value: 'Costas', label: 'Costas' },
        { value: 'Ombros', label: 'Ombros' },
        { value: 'Nenhuma', label: 'Nenhuma em especial' }
    ]
  },
  {
    id: 'muscle_difficulty',
    question: 'E onde você sente que tem mais dificuldade para evoluir?',
    sub: 'Priorizamos ativação e biomecânica específica nestas zonas.',
    type: 'multi-select',
    parentField: 'demographics',
    field: 'muscleDifficultyAreas',
    options: [
        { value: 'Pernas', label: 'Pernas' },
        { value: 'Glúteos', label: 'Glúteos' },
        { value: 'Costas', label: 'Costas' },
        { value: 'Peitoral', label: 'Peitoral' },
        { value: 'Braços', label: 'Braços' },
        { value: 'Ombros', label: 'Ombros' },
        { value: 'Abdômen', label: 'Abdômen' }
    ]
  },
  
  // POSTURE & MOBILITY
  {
    id: 'posture',
    question: 'Como você descreve sua postura predominante?',
    sub: 'Exercícios corretivos serão integrados ao seu aquecimento.',
    type: 'choice',
    parentField: 'bodyMap',
    field: 'posture',
    options: [
        { value: 'cifotica', label: 'Ombros Projetados', sub: 'Foco em abertura e retrações' },
        { value: 'lordotica', label: 'Lombar Acentuada', sub: 'Foco em core e quadril' },
        { value: 'alinhada', label: 'Bem Alinhada', sub: 'Manutenção e performance' },
        { value: 'encurtada', label: 'Encurtamento Geral', sub: 'Foco em cadeias longas' }
    ]
  },
  {
    id: 'mobility',
    question: 'Seu nível de mobilidade articular?',
    sub: 'Define a amplitude de movimento segura para você.',
    type: 'choice',
    parentField: 'bodyMap',
    field: 'mobilityLevel',
    options: [
        { value: 'travado', label: 'Sinto-me travado', sub: ' Amplitude reduzida' },
        { value: 'nas_pontas', label: 'Alcance básico', sub: 'Toco os pés com dificuldade' },
        { value: 'movel', label: 'Boa mobilidade', sub: 'Movimentos fluidos' },
        { value: 'hipermovel', label: 'Muito elástico', sub: 'Exige foco em estabilidade' }
    ]
  },

  // PAINS & INJURIES
  {
    id: 'pains',
    question: 'Alguma região exige cuidado especial hoje?',
    sub: 'Vamos blindar suas articulações e evitar lesões.',
    type: 'multi-select',
    field: 'pains',
    options: [
      { value: 'Lombar', label: 'Lombar' },
      { value: 'Joelho', label: 'Joelhos' },
      { value: 'Ombro', label: 'Ombros' },
      { value: 'Cervical', label: 'Cervical' },
      { value: 'Quadril', label: 'Quadril' },
      { value: 'Punho', label: 'Punhos' },
      { value: 'Tornozelo', label: 'Tornozelo' },
      { value: 'Nenhuma', label: 'Nenhuma, estou bem' }
    ]
  },
  
  // EXPERIENCE & HISTORY
  {
    id: 'history',
    question: 'Há quanto tempo seu corpo está em movimento?',
    sub: 'Seu histórico técnico define a complexidade inicial.',
    type: 'choice',
    field: 'trainingHistory',
    options: [
      { value: 'Nunca treinei', label: 'Começando agora', sub: 'Sem experiência prévia' },
      { value: 'Retornando', label: 'Retornando', sub: 'Já treinei no passado' },
      { value: '1 a 3 anos', label: 'Iniciado', sub: '1 a 3 anos de prática' },
      { value: '3 a 10 anos', label: 'Consolidado', sub: '3 a 10 anos' },
      { value: 'Mais de 10 anos', label: 'Veterano', sub: 'Mais de 10 anos' }
    ]
  },
  {
    id: 'confidence',
    question: 'Como você se sente executando exercícios básicos?',
    sub: 'Agachamentos, empurres e puxadas fundamentais.',
    type: 'choice',
    field: 'techniqueConfidence',
    options: [
      { value: 'yes', label: 'Domino bem', sub: 'Conheço a técnica' },
      { value: 'some', label: 'Tenho dúvidas', sub: 'Alguns movimentos apenas' },
      { value: 'no', label: 'Preciso de guia', sub: 'Sou iniciante real' }
    ]
  },

  // PREFERENCES & METHODS
  {
    id: 'style',
    question: 'Quais ferramentas você prefere utilizar?',
    sub: 'O corpo responde melhor ao que gera aderência.',
    type: 'multi-select',
    parentField: 'experiencePreferences',
    field: 'trainingStyles',
    options: [
      { value: 'maquina', label: 'Máquinas', sub: 'Estabilidade e foco' },
      { value: 'peso livre', label: 'Peso Livre', sub: 'Funcionalidade total' },
      { value: 'cabo', label: 'Cabos/Polias', sub: 'Tensão constante' },
      { value: 'funcional', label: 'Funcional', sub: 'Movimentos integrados' },
      { value: 'calistenia', label: 'Peso do Corpo', sub: 'Controle total' },
      { value: 'misto', label: 'Mix de Estilos', sub: 'Variedade' }
    ]
  },
  {
    id: 'method',
    question: 'Qual dinâmica de treino você prefere?',
    sub: 'Isso altera o tempo de descanso e a densidade da sessão.',
    type: 'choice',
    parentField: 'experiencePreferences',
    field: 'methodPreference',
    options: [
        { value: 'tradicional', label: 'Tradicional', sub: 'Série única + Descanso' },
        { value: 'bi-set', label: 'Bi-Set / Tri-Set', sub: 'Dois/Três seguidos' },
        { value: 'circuito', label: 'Circuito', sub: 'Vários sem descanso' },
        { value: 'hipertrofia_foco', label: 'Pausas Longas', sub: 'Foco total em carga' }
    ]
  },
  {
    id: 'sensation',
    question: 'Qual a sensação de treino desejada?',
    sub: 'Como você quer se sentir ao sair da academia?',
    type: 'multi-select',
    parentField: 'experiencePreferences',
    field: 'desiredSensation',
    options: [
        { value: 'pump', label: 'Pump Muscular', sub: 'Inchaço e sangue no músculo' },
        { value: 'burn', label: 'Queimação', sub: 'Stress metabólico' },
        { value: 'power', label: 'Poder/Força', sub: 'Sensação de estar forte' },
        { value: 'flow', label: 'Flow/Conexão', sub: 'Mente e corpo alinhados' },
        { value: 'esgotado', label: 'Esgotamento', sub: 'Sensação de dever cumprido' }
    ]
  },

  // NEGLECTED & AVOIDED
  {
    id: 'neglected',
    question: 'Músculos que você sente que negligencia?',
    sub: 'Daremos ênfase especial neles para equilíbrio estético e funcional.',
    type: 'multi-select',
    parentField: 'experiencePreferences',
    field: 'neglectedMuscles',
    options: [
        { value: 'Posterior', label: 'Posterior de Coxa' },
        { value: 'Glúteo', label: 'Glúteos' },
        { value: 'Ombro_Post', label: 'Ombro Posterior' },
        { value: 'Panturrilha', label: 'Panturrilhas' },
        { value: 'Core', label: 'Core / Abdômen' },
        { value: 'Antebraco', label: 'Antebraço / Pegada' }
    ]
  },
  {
    id: 'avoided',
    question: 'Exercícios que você odeia ou evita?',
    sub: 'A IA buscará substitutos com a mesma biomecânica que você goste mais.',
    type: 'multi-select',
    parentField: 'experiencePreferences',
    field: 'avoidedExercises',
    options: [
        { value: 'Agachamento Barra', label: 'Agachamento com Barra' },
        { value: 'Supino Reto', label: 'Supino Reto com Barra' },
        { value: 'Levantamento Terra', label: 'Levantamento Terra' },
        { value: 'Burpees', label: 'Burpees' },
        { value: 'Afundo', label: 'Afundo / Passada' },
        { value: 'Polichinelos', label: 'Polichinelos' }
    ]
  },

  // PSYCHOLOGICAL & MOTIVATION
  {
    id: 'repetition',
    question: 'Qual sua tolerância à repetição do mesmo plano?',
    sub: 'Define se mudamos o treino toda semana ou mantemos o foco.',
    type: 'choice',
    parentField: 'psychologicalProfile',
    field: 'repetitionTolerance',
    options: [
        { value: 'alta', label: 'Gosto de repetir', sub: 'Prefiro masterizar o movimento' },
        { value: 'media', label: 'Mudar a cada 4 semanas', sub: 'Equilíbrio padrão' },
        { value: 'baixa', label: 'Gosto de novidade', sub: 'Quero variações frequentes' }
    ]
  },
  {
    id: 'motivation',
    question: 'O que mais te motiva em uma sessão?',
    sub: 'A fonte do seu engajamento mental.',
    type: 'choice',
    parentField: 'psychologicalProfile',
    field: 'motivationSource',
    options: [
      { value: 'desafio', label: 'O Desafio', sub: 'Vencer limites' },
      { value: 'técnica', label: 'A Técnica', sub: 'Aprender o movimento' },
      { value: 'leveza', label: 'A Leveza', sub: 'Bem-estar e flow' },
      { value: 'intensidade', label: 'Intensidade', sub: 'Sensação de esforço' },
      { value: 'terapêutico', label: 'Terapêutico', sub: 'Foco e clareza' },
      { value: 'refinamento', label: 'Refinamento', sub: 'Melhoria constante' }
    ]
  },

  // PRACTICAL
  {
    id: 'equipment',
    question: 'O que temos disponível para hoje?',
    sub: 'A IA montará o treino baseado exatamente no que você tem.',
    type: 'multi-select',
    field: 'availableEquipment',
    options: [
        { value: 'Halter', label: 'Halteres' },
        { value: 'Barra', label: 'Barra Olímpica' },
        { value: 'Kettlebell', label: 'Kettlebell' },
        { value: 'Maquinas', label: 'Máquinas de Musculação' },
        { value: 'Cabo', label: 'Cabos e Polias' },
        { value: 'Corpo', label: 'Apenas Peso do Corpo' },
        { value: 'Elasticos', label: 'Elásticos / Bands' }
    ]
  },
  {
    id: 'duration',
    question: 'Quanto tempo você tem sustentável?',
    sub: 'Sessões realistas geram resultados consistentes.',
    type: 'range',
    field: 'sessionDuration',
    min: 15,
    max: 90,
    step: 5
  },

  // OBJECTIVES
  {
    id: 'objectives',
    question: 'Qual o seu norte principal?',
    sub: 'O que fará você sentir que o processo valeu a pena?',
    type: 'multi-select',
    field: 'objectives',
    options: [
      { value: 'Perder gordura', label: 'Composição', sub: 'Reduzir gordura' },
      { value: 'Ganhar massa', label: 'Vitalidade', sub: 'Ganhar massa' },
      { value: 'Melhorar postura', label: 'Alinhamento', sub: 'Sua postura' },
      { value: 'Ganhar força', label: 'Poder', sub: 'Capacidade de carga' },
      { value: 'Longevidade', label: 'Futuro', sub: 'Saúde a longo prazo' },
      { value: 'Disposição', label: 'Energia', sub: 'Dia a dia melhor' }
    ]
  },

  // CARDIO
  {
    id: 'cardio',
    question: 'Como vamos integrar o aeróbico?',
    sub: 'O motor cardiovascular é o suporte da sua força.',
    type: 'choice',
    parentField: 'experiencePreferences',
    field: 'cardioPreference',
    options: [
      { value: 'hiit', label: 'Sessões HIIT', sub: 'Curto e explosivo' },
      { value: 'leve', label: 'Ritmo Leve', sub: 'Caminhada ou trote' },
      { value: 'separado', label: 'Em dias separados', sub: 'Foco exclusivo' },
      { value: 'integrado', label: 'Durante o treino', sub: 'Ganho de tempo' },
      { value: 'evito', label: 'Evito se puder', sub: 'Mínimo necessário' }
    ]
  },
];

export default function AnamnesisForm({ user, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    userId: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    gender: 'male',
    location: '',
    height: 170,
    weight: 70,
    fitnessLevel: 'Iniciante',
    trainingHistory: 'Nunca treinei',
    techniqueConfidence: 'no',
    pains: [],
    objectives: [],
    availableEquipment: [],
    sessionDuration: 45,
    planTypePreference: 'ai_choice',
    demographics: {
      fatDistribution: 'uniforme',
      muscleGainEase: 'moderado',
      muscleGainAreas: [],
      muscleDifficultyAreas: []
    },
    bodyMap: {
      posture: 'alinhada',
      mobilityLevel: 'nas_pontas',
      bodyComfort: 'bom'
    },
    painProfile: {
      injuries: [],
      chronicPains: []
    },
    mobilityProfile: {
      stiffAreas: [],
      flexibleAreas: []
    },
    experiencePreferences: {
      equipment: [],
      trainingStyles: [],
      methodPreference: 'tradicional',
      desiredSensation: [],
      format: 'Misto',
      variety: 'muita',
      signatureStyles: [],
      cardioPreference: { type: 'integrado', frequency: 3, enjoyment: 5 },
      avoidedExercises: [],
      neglectedMuscles: []
    },
    psychologicalProfile: {
      motivationSource: 'técnica',
      structurePreference: 'flexível',
      varietyLove: 5,
      focusPreference: 'integrado',
      decisionStyle: 'variedade',
      repetitionTolerance: 'media'
    },
    physicalResponse: {
      typicalFeel: [],
      recoverySpeed: 'misto',
      fastRecoveryMuscles: [],
      slowRecoveryMuscles: [],
      inflammationProneRegions: [],
      sustenanceLimitMinutes: 45
    }
  });

  const currentQuestion = QUESTIONS[currentIndex];

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const updateField = (field: string, value: any, parentField?: string) => {
    if (parentField) {
      setFormData(prev => ({
        ...prev,
        [parentField]: {
          ...(prev[parentField as keyof UserProfile] as any),
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const toggleMultiSelect = (field: string, value: any, parentField?: string) => {
    const target = parentField 
      ? (formData[parentField as keyof UserProfile] as any)[field] 
      : (formData[field as keyof UserProfile]);
    
    const currentList = Array.isArray(target) ? target : [];
    const newList = currentList.includes(value)
      ? currentList.filter((v: any) => v !== value)
      : [...currentList, value];
    
    updateField(field, newList, parentField);
  };

  if (showResult) {
    return <AnamnesisResult profile={formData as UserProfile} onContinue={() => onComplete({
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as UserProfile)} />;
  }

  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-app text-app transition-colors duration-500 overflow-hidden relative">
      <div className="absolute inset-0 technical-grid opacity-30 pointer-events-none" />
      
      {/* Header / Progress */}
      <div className="w-full max-w-xl mb-12 flex items-center justify-between px-2">
         <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">onboarding premium</span>
            <div className="h-0.5 w-12 bg-accent-app mt-1" />
         </div>
         <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono opacity-40">{Math.round(progress)}%</span>
            <div className="w-24 h-1 bg-border-app rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-accent-app"
                />
            </div>
         </div>
      </div>

      <div className="w-full max-w-xl flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="space-y-12"
          >
            {/* Question Header */}
            <div className="space-y-4 text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance leading-[1.1] text-app">
                {currentQuestion.question}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed text-balance">
                {currentQuestion.sub}
              </p>
            </div>

            {/* Answer Input */}
            <div className="py-8">
              {currentQuestion.type === 'text' && (
                <div className="relative group">
                  <input
                    type="text"
                    value={(formData[currentQuestion.field as keyof UserProfile] as string) || ''}
                    onChange={(e) => updateField(currentQuestion.field, e.target.value)}
                    className="w-full bg-transparent border-b-2 border-border-app p-6 text-2xl font-semibold outline-none focus:border-accent-app transition-all text-center placeholder:opacity-20"
                    placeholder="Responda aqui..."
                    autoFocus
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-accent-app transition-all group-focus-within:w-full" />
                </div>
              )}

              {currentQuestion.type === 'number' && (
                <div className="flex justify-center">
                  <input
                    type="number"
                    value={(formData[currentQuestion.field as keyof UserProfile] as number) || ''}
                    onChange={(e) => updateField(currentQuestion.field, parseFloat(e.target.value))}
                    className="w-48 bg-transparent border-b-2 border-border-app p-6 text-5xl font-bold outline-none focus:border-accent-app transition-all text-center"
                    autoFocus
                  />
                </div>
              )}

              {currentQuestion.type === 'range' && (
                <div className="space-y-8">
                  <div className="flex justify-center flex-col items-center gap-2">
                    <span className="text-6xl font-black text-accent-app tracking-tighter">
                      {formData[currentQuestion.field as keyof UserProfile] as number}
                    </span>
                    <span className="text-xs font-mono uppercase tracking-[0.3em] opacity-40">minutos por sessão</span>
                  </div>
                  <input
                    type="range"
                    min={currentQuestion.min}
                    max={currentQuestion.max}
                    step={currentQuestion.step}
                    value={(formData[currentQuestion.field as keyof UserProfile] as number) || 45}
                    onChange={(e) => updateField(currentQuestion.field, parseInt(e.target.value))}
                    className="w-full h-2 bg-border-app rounded-lg appearance-none cursor-pointer accent-accent-app"
                  />
                  <div className="flex justify-between text-[10px] font-mono opacity-40 uppercase tracking-widest">
                    <span>Mín {currentQuestion.min}m</span>
                    <span>Máx {currentQuestion.max}m</span>
                  </div>
                </div>
              )}

              {currentQuestion.type === 'choice' && (
                <div className="grid grid-cols-1 gap-4 max-h-[40vh] overflow-y-auto px-2 custom-scrollbar">
                  {currentQuestion.options?.map((opt) => {
                    const isSelected = currentQuestion.parentField 
                      ? (formData[currentQuestion.parentField as keyof UserProfile] as any)[currentQuestion.field] === opt.value
                      : (formData[currentQuestion.field as keyof UserProfile]) === opt.value;
                    
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          updateField(currentQuestion.field, opt.value, currentQuestion.parentField);
                          setTimeout(handleNext, 300); // Auto-advance for choices
                        }}
                        className={cn(
                          "w-full p-6 h-auto rounded-3xl text-left transition-all duration-300 border flex items-center justify-between group",
                          isSelected 
                            ? "bg-accent-app border-accent-app text-white shadow-xl shadow-accent-app/20" 
                            : "bg-card-app border-border-app hover:border-accent-app/50 text-app"
                        )}
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-lg">{opt.label}</p>
                          {opt.sub && <p className={cn("text-sm opacity-60", isSelected ? "text-white" : "text-slate-500")}>{opt.sub}</p>}
                        </div>
                        <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center transition-all", isSelected ? "bg-white border-white" : "border-border-app group-hover:border-accent-app")}>
                           {isSelected && <Check className="w-4 h-4 text-accent-app" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'multi-select' && (
                <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto px-2 custom-scrollbar pb-4 focus:outline-none">
                  {currentQuestion.options?.map((opt) => {
                    const list = currentQuestion.parentField 
                      ? (formData[currentQuestion.parentField as keyof UserProfile] as any)[currentQuestion.field]
                      : (formData[currentQuestion.field as keyof UserProfile]);
                    const isSelected = Array.isArray(list) && list.includes(opt.value);
                    
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleMultiSelect(currentQuestion.field, opt.value, currentQuestion.parentField)}
                        className={cn(
                          "p-5 rounded-2xl text-center transition-all duration-300 border flex flex-col justify-center items-center gap-2",
                          isSelected 
                            ? "bg-accent-app border-accent-app text-white shadow-lg" 
                            : "bg-card-app border-border-app hover:border-accent-app/30"
                        )}
                      >
                        <span className="font-bold text-sm tracking-tight">{opt.label}</span>
                        {opt.sub && <span className="text-[10px] opacity-60 font-mono uppercase tracking-widest">{opt.sub}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="w-full max-w-xl pb-10 flex gap-4">
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="p-6 bg-card-app border border-border-app rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-app shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={
            (currentQuestion.type === 'text' && !formData[currentQuestion.field as keyof UserProfile]) ||
            (currentQuestion.type === 'number' && !formData[currentQuestion.field as keyof UserProfile])
          }
          className="flex-1 p-6 bg-accent-app text-white font-bold uppercase tracking-widest rounded-3xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-20 shadow-xl shadow-accent-app/10"
        >
          {currentIndex === QUESTIONS.length - 1 ? 'Finalizar' : 'Próximo'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-app);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
