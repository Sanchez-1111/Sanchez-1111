/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { fallbackQuotes } from "./src/data/fallbackQuotes";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized GoogleGenAI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY",
  });
});

// API endpoint to generate motivational quote
app.post("/api/generate-quote", async (req, res) => {
  const { category, mood, customTopic } = req.body;

  const selectedCategory = category || "general";
  const selectedMood = mood || "general";
  const extraTopic = customTopic ? `specifically focusing on "${customTopic}"` : "";

  const ai = getGeminiClient();

  if (ai) {
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    
    for (const modelName of modelsToTry) {
      try {
        const prompt = `You are an elite, warm, and deeply empathetic life coach and philosopher. 
        Generate a powerful, original, and deeply moving motivational quote tailored specifically for someone who is feeling "${selectedMood}" with a focus topic of "${selectedCategory}" ${extraTopic}.
        
        Requirements:
        1. quote: An inspiring, original quote (1-2 lines). Keep it authentic, powerful, and free from typical AI cliches (like 'unleash your potential', 'unlock', etc.). Let it feel like genuine ancient wisdom or a brilliant modern truth.
        2. author: A fitting author name (can be a famous historical philosopher, an imaginary wise persona like "The Zen Wanderer", or "Anonymous Coach").
        3. explanation: A supportive, warm coaching message (2-3 sentences) explaining how this quote applies to feeling "${selectedMood}". It should be highly direct, conversational, and non-preachy, offering actionable peace or energy.
        
        Generate this as a clean JSON object matching the requested schema.`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: "You are a world-class motivator, empathetic guide, and master of concise inspiration. Avoid generic corporate jargon. Speak with soul, authenticity, and light.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quote: { type: Type.STRING, description: "The original motivational quote text." },
                author: { type: Type.STRING, description: "The author of the quote." },
                explanation: { type: Type.STRING, description: "Empathic life-coaching message explaining why this helps current mood and category." }
              },
              required: ["quote", "author", "explanation"]
            }
          }
        });

        const responseText = response.text;
        if (responseText) {
          const result = JSON.parse(responseText.trim());
          return res.json({
            id: `ai-${Date.now()}`,
            text: result.quote,
            author: result.author,
            category: selectedCategory,
            mood: selectedMood,
            explanation: result.explanation,
            isCustom: true,
            timestamp: Date.now(),
            generatedBy: modelName
          });
        }
      } catch (error) {
        console.warn(`[Pocket Motivation Server] Model ${modelName} failed or busy. Trying next model if available. Error:`, error);
      }
    }
  }

  // Fallback if Gemini isn't configured, or fails
  const matchedQuotes = fallbackQuotes.filter(
    (q) => q.category === selectedCategory || q.mood === selectedMood
  );

  const pool = matchedQuotes.length > 0 ? matchedQuotes : fallbackQuotes;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selectedQuote = pool[randomIndex];

  return res.json({
    ...selectedQuote,
    id: `fb-fallback-${Date.now()}`,
    isCustom: false,
    timestamp: Date.now()
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Pocket Motivation Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
