import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { interpretVoiceCommand, generateWorkout } from "./src/services/geminiService";
import { calculateProgression } from "./src/services/progressionEngine";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/gemini/voice-interpret", async (req, res) => {
    try {
      const { profile, workout, currentDayIndex, transcript, currentExercise } = req.body;
      const result = await interpretVoiceCommand(profile, workout, currentDayIndex, transcript, currentExercise);
      res.json(result);
    } catch (error: any) {
      console.error("Voice interpretation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/generate-workout", async (req, res) => {
    try {
      const { profile, history, strategy } = req.body;
      const result = await generateWorkout(profile, history, strategy);
      res.json(result);
    } catch (error: any) {
      console.error("Workout generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/calculate-progression", async (req, res) => {
    try {
      const { profile, workout, dayIndex, history, currentCheckIn } = req.body;
      const result = await calculateProgression(profile, workout, dayIndex, history, currentCheckIn);
      res.json(result);
    } catch (error: any) {
      console.error("Progression calculation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
