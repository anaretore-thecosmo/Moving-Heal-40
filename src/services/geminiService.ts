import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Session, Workout, WorkoutDay, Exercise, VoiceInteraction } from "../types";

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
}

const MODEL = "gemini-3-flash-preview";

export async function interpretVoiceCommand(
  profile: UserProfile,
  workout: Workout,
  currentDayIndex: number,
  transcript: string,
  currentExercise?: Exercise
): Promise<{
    intent: string;
    action: 'substitute' | 'adjust_parameters' | 'rebuild_day' | 'rebuild_workout' | 'explain' | 'none';
    explanation: string;
    targetExerciseName?: string;
    substitution?: Exercise;
    parameters?: Partial<Exercise>;
}> {
  const ai = getAI();
  const prompt = `
    Como um treinador de elite bio-adaptativo, interprete o seguinte comando de voz de um usuário durante o treino:
    "${transcript}"

    Contexto do Usuário:
    - Idade/Sexo: ${profile.age}/${profile.gender}
    - Nível: ${profile.fitnessLevel}
    - Perfil Motor: ${profile.motorProfile?.repertoireDepth} repertório, ${profile.motorProfile?.coordinationLevel} coordenação
    - MAPEAMENTO DA ACADEMIA: ${profile.gymEnvironment?.identifiedEquipment.join(', ') || 'Nenhum'}
    - Estilo da Academia: ${profile.gymEnvironment?.gymStyle || 'Padrão'}
    - Fase Atual: ${profile.currentPhase || 'expansion'} (protection, reintroduction, expansion)
    - Dores Registradas: ${profile.pains?.join(', ') || 'Nenhuma'}
    - Progresso de Recuperação: ${JSON.stringify(profile.recoveryStatus?.improvementProgress || {})}
    - Objetivo: ${profile.goals?.join(', ')}
    - Músculos Fáceis/Difíceis: ${profile.demographics?.muscleGainEase} / ${profile.demographics?.muscleDifficultyAreas?.join(', ')}
    - Exercícios Evitados: ${profile.experiencePreferences?.avoidedExercises?.join(', ')}
    - Preferência de Cardio: ${profile.experiencePreferences?.cardioPreference?.type}

    Treino Atual: ${workout.days[currentDayIndex].dayName} - Foco: ${workout.days[currentDayIndex].focus}
    Exercício Sendo Realizado (opcional): ${currentExercise?.name || 'Não especificado'}

    Seu objetivo é:
    1. Detectar a intenção (dor, preferência, tédio, limitação, falta de equipamento, troca, adaptação, ACADEMIA LOTADA).
    2. ANAMNESE COMO MATRIZ: Se o usuário pedir uma troca, considere o que ele disse na anamnese (ex: se ele evita certos exercícios ou tem dificuldade em certas áreas).
    3. ESTILO REAL: Observe se o usuário demonstra preferência por um tipo de implemento (ex: "prefiro máquinas", "odeio esse tipo de exercício funcional").
    3. Decidir a melhor ação técnica imediata.
    4. SE O USUÁRIO QUER TROCAR OU ESTÁ ENTEDIADO: Priorize VARIAÇÃO INTELIGENTE antes de trocar o exercício inteiro.
       Hierarquia de Variação: Pegada -> Ângulo -> Implemento -> Apoio -> Unilateral -> Posição -> Ritmo.
       Exemplo: Ao invés de trocar Puxador Frente por Remada, sugira Puxador Pegada Neutra ou Unilateral.
    5. DINAMISMO (CONTEXTO vs IDENTIDADE): Entenda que dores são contextos temporais, não identidades permanentes. Se o usuário relatar melhora, mova-se gradualmente para a reintrodução/expansão.
    6. Se houver dor articular, NUNCA insista no exercício original. Substitua por algo mais seguro.
    6. LOGÍSTICA (IMPORTANTE): Se o usuário informar que a academia está lotada ou que está em uma estação específica, priorize substituições na MESMA ESTAÇÃO ou com equipamentos alternativos flexíveis (halteres, peso do corpo).
    7. Mantenha a resposta concisa e empática, como um treinador real.

    Retorne apenas um JSON seguindo este esquema:
    {
      "intent": string,
      "action": "substitute" | "adjust_parameters" | "rebuild_day" | "rebuild_workout" | "explain" | "none",
      "explanation": string (breve explicação em português),
      "targetExerciseName": string (se aplicável),
      "substitution": { "name", "sets", "reps", "rest", "equipment", "station", "locationHint", "whatToFeel" } (se action for substitute),
      "parameters": { "sets", "reps", "rest" } (se action for adjust_parameters)
    }
  `;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING },
          action: { type: Type.STRING, enum: ['substitute', 'adjust_parameters', 'rebuild_day', 'rebuild_workout', 'explain', 'none'] },
          explanation: { type: Type.STRING },
          targetExerciseName: { type: Type.STRING },
          substitution: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sets: { type: Type.NUMBER },
              reps: { type: Type.STRING },
              rest: { type: Type.STRING },
              equipment: { type: Type.STRING },
              station: { type: Type.STRING },
              locationHint: { type: Type.STRING },
              variation: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              },
              whatToFeel: { type: Type.STRING }
            }
          },
          parameters: {
            type: Type.OBJECT,
            properties: {
              sets: { type: Type.NUMBER },
              reps: { type: Type.STRING },
              rest: { type: Type.STRING }
            }
          }
        },
        required: ['intent', 'action', 'explanation']
      }
    }
  });

  return JSON.parse(response.text);
}

// ... Outras funções de geração (mockadas aqui para o app funcionar se o env estiver vazio) ...
export async function generateWorkout(profile: UserProfile, history: Session[], strategy?: string): Promise<Workout> {
    const prompt = `
      Como um treinador de elite especializado em longevidade biomecânica e performance para o público 40+ (Moving Heal +40), crie um protocolo de treino personalizado.
      
      PERFIL DO ATLETA:
      - Identidade: ${profile.displayName}, ${profile.age} anos, ${profile.gender}
      - Biometria: ${profile.height || 'N/A'}cm, ${profile.weight || 'N/A'}kg
      - Nível: ${profile.fitnessLevel}
      - Histórico: ${profile.trainingHistory}
      - Objetivos: ${profile.objectives.join(', ')}
      - Dores/Lesões: ${profile.pains.join(', ') || 'Nenhuma'}
      - Distribuição de Gordura: ${profile.demographics?.fatDistribution}
      - Facilidade Ganho Muscular (Geral): ${profile.muscleGainEase} (Impacto: Se 'dificil', aumente volume moderadamente)
      - Onde ganha fácil: ${profile.demographics?.muscleGainAreas?.join(', ') || 'Não especificado'} (Impacto: Menos volume/prioridade, manutenção técnica)
      - Áreas de Dificuldade: ${profile.demographics?.muscleDifficultyAreas?.join(', ') || 'Nenhuma'} (Impacto: Mais ativação, prioridade e biomecânica específica)
      - Postura: ${profile.bodyMap?.posture}
      - Mobilidade: ${profile.bodyMap?.mobilityLevel}
      - Trecho Psicológico: Tolerância à repetição ${profile.psychologicalProfile?.repetitionTolerance}, Estilo de decisão ${profile.psychologicalProfile?.decisionStyle}
      - Áreas Negligenciadas: ${profile.experiencePreferences?.neglectedMuscles?.join(', ')}
      - Exercícios Evitados (ÓDIO): ${profile.experiencePreferences?.avoidedExercises?.join(', ')} (Impacto CRÍTICO: NUNCA prescreva estes. Use alternativas que o usuário tolere melhor emocionalmente)
      - Preferência de Cardio: ${profile.experiencePreferences?.cardioPreference?.type} (Impacto: Se 'separado', o volume de perna pode ser maior. Se 'integrado', reduza densidade de perna para evitar sobrecarga)
      
      ANAMNESE COMO MATRIZ DECISÓRIA:
      1. TODA RESPOSTA IMPORTA: Não trate a anamnese como formulário passivo. Cada detalhe acima deve alterar a seleção de exercícios, volume e logística.
      2. MÚSCULOS FÁCEIS vs DIFÍCEIS: Se o usuário ganha músculo fácil em uma área (ex: Braços), reduza o volume neural ali para focar nas áreas de dificuldade (ex: Pernas).
      3. CARDIO E RECUPERAÇÃO: Se o usuário faz cardio separado e intenso, modular o volume de membros inferiores para garantir recuperação.
      4. PREFERÊNCIAS EMOCIONAIS: Se o usuário "odeia" um exercício, a escolha do substituto é crítica para a aderência.
      5. ESTILO FUNCIONAL: Se houver preferência por 'funcional', traga mais movimentos multiplanares e coordenação, mas sem perder a base de força.
      6. LOGÍSTICA DE CARGA: Se o usuário gosta de "Máquina para carga", use-as nos exercícios principais (main). Se prefere "Livre para fluidez", use pesos livres.
      
      CONTEXTO DINÂMICO & FASES:
      - Fase Atual: ${profile.currentPhase || 'expansion'}
      - Progresso de Recuperação: ${JSON.stringify(profile.recoveryStatus?.improvementProgress || {})}
      - Nota: Dores são contextos temporários. Não esterilize o treino permanentemente.
      
      PERFIL MOTOR & EXPERIÊNCIA REAL:
      - Anos de Exp: ${profile.motorProfile?.yearsOfExperience || 'N/A'}
      - Repertório Motor: ${profile.motorProfile?.repertoireDepth || 'standard'}
      - Consciência/Coordenação: ${profile.motorProfile?.coordinationLevel || 'competent'}/${profile.motorProfile?.bodyAwareness || 'competent'}
      - Tolerância à Complexidade: ${profile.motorProfile?.complexityTolerance || 'medium'}
      - Conforto com Cargas Livres: ${profile.motorProfile?.comfortWithFreeWeights || 'medium'}
      - Equipamentos Avançados: ${profile.motorProfile?.comfortWithAdvancedEquipment?.join(', ') || 'Nenhum'}
      
      LOGÍSTICA:
      - Equipamentos Básicos: ${profile.availableEquipment.join(', ') || 'Apenas Peso do Corpo'}
      - MAPEAMENTO REAIS DA ACADEMIA: ${profile.gymEnvironment?.identifiedEquipment.join(', ') || 'Nenhum mapeamento visual disponível'}
      - Estilo da Academia: ${profile.gymEnvironment?.gymStyle || 'Não especificado'}
      - Estilos Realmente Preferidos: ${profile.experiencePreferences?.trainingStyles?.join(', ')}
      - Arquétipo: ${profile.experiencePreferences?.trainingArchetype || 'Híbrido'}
      - Método: ${profile.experiencePreferences?.methodPreference}
      - Sensação Desejada: ${profile.experiencePreferences?.desiredSensation?.join(', ')}
      - Duração: ${profile.sessionDuration} minutos
      
      ESTRATÉGIA:
      ${strategy || 'Geração inicial de protocolo base'}

      DIRETRIZES DE ESTILO REAL:
      1. RESPEITE O ARQUÉTIPO DO USUÁRIO (Classic, Modern, Athletic): Se ele gosta de 'Máquinas para carga', prioritize-as. Se gosta de 'Livre para fluidez', use halteres/barras.
      2. MISTURA INTELIGENTE: Não presuma que 'Variedade' significa 'Funcional Extremo'. Mantenha a base sólida de força e varie os implementos.
      3. EVITE SATURAÇÃO: Não transforme todo treino em máquinas ou todo em funcional. Combine de forma lógica para gerar prazer e adesão.

      DIRETRIZES DE VOLUME E ESTRUTURA (INTELIGÊNCIA REAL):
      1. NÃO USE TEMPLATES FIXOS: Esqueça 3x12 para tudo. Defina séries, reps e descanso baseados no papel (role) do exercício.
      2. PAPEL DO EXERCÍCIO:
         - 'main': Exercícios-base/multiarticulares. Mais séries (3-5), mais descanso (90-180s), foco em progressão.
         - 'complementary': Isolados ou máquinas. Volume moderado (3 séries), menos descanso (60-90s).
         - 'technical': Foco em consciência corporal e técnica. Menos carga, mais controle.
         - 'metabolic': Foco em densidade e turgor. Descanso curto (30-45s), técnicas de intensidade (drop-sets, bi-sets).
      3. MODULAÇÃO POR FREQUÊNCIA: Usuário treina ${profile.trainingFrequencyPerWeek || '3'}x/semana. Ajuste o volume total semanal.
      4. FASE ATUAL: Respeite a fase '${profile.currentPhase || 'expansion'}'. Na proteção, reduza volume neural. Na expansão, maximize desafio.
      5. RECUPERAÇÃO INDIVIDUAL: Considere músculos de recuperação lenta (${profile.physicalResponse?.slowRecoveryMuscles?.join(', ')}) vs rápida (${profile.physicalResponse?.fastRecoveryMuscles?.join(', ')}).

      DIRETRIZES DE FASES (DINÂMICO):
      - FASE PROTECTION (DOR): Reduza agressão articular, foco em estabilidade, carga controlada, biomecânica ultra-segura.
      - FASE REINTRODUCTION (MELHORA): Retorne padrões gradualmente, devolva amplitude, comece a testar potência leve.
      - FASE EXPANSION (SOLTO): Intensifique, aumentando desafio e devolvendo a identidade atlética completa.

      DIRETRIZES DE NÍVEL REAL:
      1. NÃO RESTRINJA PELO 40+: Se o usuário tem repertório 'vasto' e coordenação 'avançada', use exercícios complexos (unilaterais, kettlebells, movimentos multiarticulares livres).
      2. REPERTÓRIO COERENTE: Se o repertório é 'limitado', foque em exercícios que construam estabilidade e consciência corporal antes de aumentar a complexidade.
      3. AVANÇADO HÍBRIDO vs INICIANTE: Diferencie o desafio. O avançado busca performance e fluidez; o iniciante busca segurança e base técnica.

      LOGÍSTICA DE ACADEMIA (CRÍTICO):
      1. ESTAÇÕES: Agrupe exercícios que usam a mesma estação (ex: Polia, Halteres, Banco) em sequência para minimizar deslocamento e perda de tempo.
      2. FLUXO CONTÍNUO: O treino deve fluir naturalmente pela academia. Evite idas e vindas desnecessárias entre setores distantes.
      3. ACADEMIA LOTADA: Priorize exercícios que permitam variações simples caso o aparelho principal esteja ocupado.
      4. ESTRATÉGIA DE FLUXO: Defina uma estratégia ('station-grouped', 'minimum-displacement' ou 'circuit').
      
      DIRETRIZES DE DESIGN DE TREINO:
      1. SEGURANÇA (OBRIGATÓRIO): Se houver dor relatada (ex: Ombro, Lombar), os exercícios devem ser biomecanicamente seguros para essa área, incluindo notas de segurança específicas.
      2. ASSINATURA NEURAL: Defina uma "Assinatura Neural" para cada dia (ex: "Metabolic Density", "Neural Drive", "Structural Integrity").
      3. BI-SETS/MÉTODOS: Use ${profile.experiencePreferences?.methodPreference || 'métodos variados'} conforme preferência. Aplique bi-sets na mesma estação sempre que possível.
      4. VARIAÇÃO INTELIGENTE (COERÊNCIA): Use variações de pegada, ângulo e implemento para criar frescor sem perder a progressão básica. Não faça "trocas aleatórias". Mantenha o exercício base mas varie o detalhe técnico.
      5. VARIEDADE: Aplique o nível de variedade ${profile.psychologicalProfile?.repetitionTolerance === 'baixa' ? 'ALTO' : 'MODERADO'}.
      
      Sua tarefa:
      Gere um objeto JSON contendo um array de 3 dias de treino ('days') e uma 'signature' geral do protocolo.
      Cada dia deve ter:
      - dayName, focus, estimatedDuration, neuralSignature, flowStrategy, safetyWarnings
      - exercises: array de objetos { name, role, sets, reps, rest, progressionStrategy, equipment, station, locationHint, whatToFeel, safetyAlerts, substitutions }
      
      Retorne APENAS o JSON.
    `;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signature: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayName: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  flowStrategy: { type: Type.STRING, enum: ['station-grouped', 'minimum-displacement', 'circuit'] },
                  estimatedDuration: { type: Type.NUMBER },
                  neuralSignature: { type: Type.STRING },
                  safetyWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                  exercises: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        role: { type: Type.STRING, enum: ['main', 'complementary', 'technical', 'metabolic', 'warm-up'] },
                        sets: { type: Type.NUMBER },
                        reps: { type: Type.STRING },
                        rest: { type: Type.STRING },
                        progressionStrategy: { type: Type.STRING },
                        equipment: { type: Type.STRING },
                        station: { type: Type.STRING },
                        locationHint: { type: Type.STRING },
                        whatToFeel: { type: Type.STRING },
                        safetyAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
                        substitutions: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ['days', 'signature']
        }
      }
    });

    const result = JSON.parse(response.text);
    
    return {
        userId: profile.userId,
        name: "Bio-Adaptive Protocol",
        signature: result.signature,
        status: 'active',
        createdAt: new Date().toISOString(),
        days: result.days
    };
}

export async function adaptWorkout(profile: UserProfile, workout: Workout, sessionData: Partial<Session>, history: Session[], progression: any): Promise<WorkoutDay> {
    return workout.days[sessionData.dayIndex || 0];
}

export async function checkPhaseTransition(profile: UserProfile, feedback: string): Promise<{ suggestedPhase: 'protection' | 'reintroduction' | 'expansion', reason: string, progressUpdates: Record<string, number> }> {
  const ai = getAI();
  const prompt = `
    Analise o feedback do usuário sobre suas dores e estado físico:
    "${feedback}"

    Perfil Atual:
    - Fase: ${profile.currentPhase || 'expansion'}
    - Dores Registradas: ${profile.pains?.join(', ') || 'Nenhuma'}
    - Progresso Atual: ${JSON.stringify(profile.recoveryStatus?.improvementProgress || {})}

    Decida se o usuário deve mudar de fase (protection -> reintroduction -> expansion).
    - Se a dor melhorou significativamente (ex: "ombro não dói mais"), sugira avançar de fase.
    - Se a dor persistir ou piorar, sugira retroceder ou manter na proteção.

    Retorne APENAS um JSON:
    {
      "suggestedPhase": "protection" | "reintroduction" | "expansion",
      "reason": string (justificativa em português),
      "progressUpdates": { "AreaName": 0-100 score } (atualização do nível de recuperação)
    }
  `;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text);
}

export async function analyzeGymImages(images: string[]): Promise<{ identifiedEquipment: string[], gymStyle: string, description: string }> {
  const ai = getAI();
  const model = ai.models.get("gemini-1.5-flash");

  const prompt = `
    Analise estas fotos de uma academia e identifique:
    1. Lista de equipamentos disponíveis (ex: smith, hack squat, leg press, polias, halteres, kettlebells, barras, bancos, etc).
    2. Estilo da academia (classic, hybrid, functional, premium, compact, high-traffic).
    3. Uma breve descrição do ambiente para ajudar na montagem dos treinos.

    Retorne APENAS um JSON:
    {
      "identifiedEquipment": string[],
      "gymStyle": string,
      "description": string
    }
  `;

  const imageParts = images.map(img => {
      const [header, data] = img.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      return {
          inlineData: {
              data,
              mimeType
          }
      };
  });

  const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [prompt, ...imageParts as any],
      config: {
          responseMimeType: "application/json",
      }
  });

  return JSON.parse(response.text);
}
