import { UserProfile, Workout, Session, ProgressionDecision, ExerciseLog } from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { analyzeFatigue, analyzePerformancePatterns, analyzeNeuralSatiety, analyzePsychologicalBehavior, analyzeDurationSustainability, analyzeRecoveryScore, analyzeRegionalRecovery, analyzeBodyComfort } from "./analyticsService";

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function calculateProgression(
  profile: UserProfile, 
  workout: Workout, 
  dayIndex: number,
  history: Session[],
  currentCheckIn: Partial<Session>
): Promise<ProgressionDecision> {
  const ai = getAI();
  const workoutSessions = history.filter(s => s.workoutId === workout.id && s.dayIndex === dayIndex);
  const fatigue = analyzeFatigue(history);
  const patterns = analyzePerformancePatterns(history);
  const satiety = analyzeNeuralSatiety(history);
  const behavior = analyzePsychologicalBehavior(profile, history);
  const sustainability = analyzeDurationSustainability(history);
  const recovery = analyzeRecoveryScore(history);
  const regional = analyzeRegionalRecovery(history);
  const comfort = analyzeBodyComfort(history);
  
  const historyData = workoutSessions.slice(0, 10).map(s => ({
    date: s.createdAt,
    rating: s.rating,
    satisfaction: s.satisfactionScore,
    effort: s.effortScore,
    isCompleted: s.isCompleted,
    energy: s.energyLevel,
    pain: s.painLevel,
    painFelt: s.feltWhere,
    bodyFeel: s.bodyFeel,
    logs: s.logs?.map(l => ({
      name: l.name,
      id: l.exerciseId,
      skipped: l.skipped,
      pain: l.painLevel,
      sets: l.sets.map(st => `${st.reps} reps @ ${st.weight}kg`)
    }))
  }));

  const currentDay = workout.days[dayIndex];

  const now = Date.now();
  const lastSessionDate = history.length > 0 ? new Date(history[0].createdAt).getTime() : now;
  const inactivityDays = Math.floor((now - lastSessionDate) / (1000 * 60 * 60 * 24));

  const prompt = `
    You are an expert Biomechanics and Longevity Coach for the 40+ audience.
    Your task is to analyze training history AND the current state to decide on an INTELLIGENT PROGRESSION.

    USER PROFILE:
    - Age: ${profile.age}
    - Level: ${profile.fitnessLevel}
    - Goal: ${profile.objectives.join(", ")}
    - Baseline Pains: ${profile.pains.join(", ")}

    CURRENT STATE (Check-in right now):
    - Energy Level: ${currentCheckIn.energyLevel}/10
    - Current Pain: ${currentCheckIn.painLevel}/10
    - Area felt: ${currentCheckIn.feltWhere?.join(", ") || "None"}
    - Days since last session: ${inactivityDays} days
    - FATIGUE DETECTOR: ${fatigue.isDetected ? `Type: ${fatigue.type}, Level: ${fatigue.level}, Rec: ${fatigue.recommendation}` : "None detected"}
    - PERFORMANCE PATTERNS: Best Time: ${patterns.bestTimeOfDay}, Best Day: ${patterns.bestDayOfWeek}, Peak Energy: ${patterns.energyPeak}, Insight: ${patterns.insight}
    - NEURAL SATIETY: ${satiety.isSatiated ? `Satiated, Reason: ${satiety.insight}, Recommendation: ${satiety.recommendation}` : "Neural energy stable"}
    - BEHAVIORAL PROFILE: Profile: ${behavior.detectedProfile}, Driver: ${behavior.adherenceDriver}, Risk: ${behavior.abandonmentRisk}, Suggested Complexity: ${behavior.suggestedComplexity}
    - DURATION SUSTAINABILITY: ${sustainability.isSustainable ? "Sustainable" : "Risk Detected"}. Optimal Duration: ${sustainability.optimalDuration} min. Insight: ${sustainability.insight}
    - INFERRED RECOVERY: Score: ${recovery.score} (${recovery.level}%). Insight: ${recovery.insight}. Recommendation: ${recovery.recommendation}
    - REGIONAL RECOVERY MAP:
      * Legs: ${regional.legs}% (${regional.insights.find(i => i.region === 'Membros Inferiores')?.speed} recovery speed)
      * Upper: ${regional.upper}% (${regional.insights.find(i => i.region === 'Membros Superiores')?.speed} recovery speed)
      * Core: ${regional.core}%
      * Joints: ${regional.joints}%
    - BODY COMFORT (SUBJECTIVE):
      * Dominant Feel: ${comfort.dominantFeel}
      * Comfort Trend: ${comfort.comfortTrend}
      * Insight: ${comfort.insight}
    - THOUGHTLESS MODE: ${currentCheckIn.isThoughtlessMode ? "ACTIVE (User is mentally exhausted - minimize cognitive load)" : "Inactive"}
    - ANTI-ABANDONMENT MODE: ${currentCheckIn.isAntiAbandonmentMode ? "ACTIVE (User cannot/won't go to gym - MUST provide Home/Minimal/Restorative alternative)" : "Inactive"}

    WORKOUT: "${workout.title}" - Day: ${currentDay.dayName} (${currentDay.focus})
    EXERCISES: ${currentDay.exercises.map(e => `${e.name} (${e.sets}x${e.reps}, ${e.weight}kg)`).join(" | ")}
    
    CRITICAL REASONING INSTRUCTIONS:
    - REGIONAL RECOVERY ADJUSTMENT: If a specific region (Legs/Upper) has recovery < 50%, you MUST pivot the focus or significantly reduce intensity for THAT REGION. For example, if focus is "Legs" but Legs recovery is 30%, pivot to "Active Recovery" or "Upper Mobility".
    - JOINTS PROTECTION: If Joints recovery is < 60%, avoid high-impact movements or max weights.
    - RECOVERY SPEED LEARNING: If a region shows "Slow" speed, increase rest intervals and reduce weekly frequency for that region in your long-term plan.
    - SUBJECTIVE COMFORT LEARNING: Use the "Body Comfort" data to refine prescription.
      * If user feels "rígido" or "travado" recurrently: Include more mobility/flow exercises and decrease high-tension loads.
      * If user feels "fluido" or "encaixado": Maintain the current stimulation pattern as it is biomechanically compatible.
      * Aim for "Atlético" and "Fluido" as target sensations.
    - ANTI-ABANDONMENT (CRITICAL): If Anti-Abandonment is ACTIVE, you MUST:
      1. Switch location to 'Casa'.
      2. Simplify exercises to "No Equipment" or "Minimal Equipment".
      3. Focus on "Mobilidade" or "Restaurativo" or "Circuito Rápido".
      4. Reduce duration to ~20min.
      5. Strategy MUST be "Reduce" or "Vary".
    - THOUGHTLESS MODE (CRITICAL): If Thoughtless Mode is ACTIVE, you MUST prioritize "Maintain" or "Reduce". Do NOT add complexity or technical variations. Keep the session fluid and easy to follow. Choose the simplest execution paths.
    - RECOVERY-BASED ADJUSTMENT: If Recovery is "Baixa", you MUST choose "Reduce" or "Vary" (Restorative). Reduce intensity AND volume. Change signature to "restaurativo" or "mobilidade". If Recovery is "Moderada", prioritize "Maintain" or "Reduce" to keep momentum without overloading.
    - SUSTAINABLE TIME ADJUSTMENT: If "Duration Sustainability" shows risk, you MUST reduce total sets or exercises to reach the "Optimal Duration". Do NOT ignore this; a 60min workout that causes abandonment is a failure.
    - If Fatigue is detected: prioritize "Reduce" or "Maintain".
    - If Neural Satiety is detected: MUST prioritize "Vary" or "Restructure" to disrupt patterns.
    - If Behavioral Risk is High: prioritize "Reduce" volume but keep "PleasureSource" exercises to improve adherence. Use lower complexity to reduce cognitive friction.
    - COMPATIBILITY: Ensure the strategy matches the "detectedProfile". Challenge-seekers need "Progression", technique-seekers need "Maintain" with focus on "whatToFeel".
    - If Current Pain > 0 or Current Energy < 4: DO NOT PROGRESS. Recommend "Reduce" or "Maintain".
    - If Recurrent Pain detected in history (same area 2+ times): Avoid intensity in that area.
    - RETURN MODE: If inactivityDays >= 5, prioritize "Maintain" or "Reduce". If inactivityDays >= 15, prioritize "Restructure" or "Reduce" to reintegrate the user safely. Do not increase load after more than 7 days off.
    - FATIGUE HANDLING: If Fatigue is detected, you MUST prioritize "Reduce", "Vary" (Restorative), or "Restructure" (Shorten). If Neural Fatigue, reduce cognitive load (fewer complex exercises). If Physical Fatigue, reduce volume (fewer sets). If Mental Satiety, change the signature/style entirely for today.
    - TIME-BASED ADJUSTMENT: If the current time of day is NOT the user's "Best Time" or has "Low Energy" pattern, favor "Reduce" or "Maintain" to prevent burnout. Adjust the "Signature" of the session to match the energy peak (e.g., more technical when energy is high, more restorative when energy is low).
    - NEURAL SATIETY HANDLING: If Neural Satiety is detected, you MUST "Vary" everything. Change the order of exercises, change the "signature" (e.g., if it was all 'força', make it 'potência' or 'atlético'), and change the rest periods. Do not allow the user to feel they are doing "the same thing with different clothes".

    PROGRESSION RULES (FOR 40+):
    1. PROGREDIR (Progression): If consistent, rating is "Fácil demais" or "Perfeito", no joint pain, and technique is stable.
       - Types: Load (+2-5% max), Reps (+1-2), Sets (+1 per cycle), Density (less rest), or Technical (complex variation).
    2. MANTER (Maintain): If in adaptation (1-2 sessions) or intensity is optimal.
    3. REDUZIR (Reduce): If "Pesado demais", energy is low, or initial signs of overreaching.
    4. VARIAR (Vary): If "Chato" (boredom) or repeated 6+ times without progression.
    5. REESTRUTURAR (Restructure): If recurrent pain, high abandonment, or duration > planned time.

    IMPORTANT: For 40+, prioritize stability and control. Progression must be REFINED, not BRUTAL.

    OUTPUT LOGIC:
    - Decide on a general "Type" for the session.
    - Provide a "Reason" for the user (mature, empathetic tone).
    - Provide a "Internal Logic" for coaches/auditors (detailed reasoning).
    - List specific "Adjustments" for exercises.

    Response must be JSON according to the schema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['load', 'reps', 'sets', 'control', 'density', 'technical', 'maintain', 'reduce', 'restructure', 'vary'] },
          reason: { type: Type.STRING },
          internalLogic: { type: Type.STRING },
          adjustments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                exerciseId: { type: Type.STRING },
                exerciseName: { type: Type.STRING },
                change: { type: Type.STRING },
                insight: { type: Type.STRING }
              },
              required: ["exerciseId", "exerciseName", "change", "insight"]
            }
          }
        },
        required: ["type", "reason", "internalLogic", "adjustments"]
      }
    }
  });

  const decision = JSON.parse(response.text || "{}");
  
  return {
    ...decision,
    userId: profile.userId,
    workoutId: workout.id,
    dayIndex,
    createdAt: new Date().toISOString()
  };
}
