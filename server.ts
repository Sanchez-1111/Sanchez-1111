/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { fallbackQuotes } from "./src/data/fallbackQuotes";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const SHARED_QUOTES_FILE = path.join(process.cwd(), "shared_quotes.json");

// Helper to read shared public quotes
function getSharedQuotes(): any[] {
  try {
    if (fs.existsSync(SHARED_QUOTES_FILE)) {
      const data = fs.readFileSync(SHARED_QUOTES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading shared quotes:", e);
  }
  return [];
}

// Helper to save a public/shared quote
function saveSharedQuote(quote: any) {
  try {
    const quotes = getSharedQuotes();
    quotes.push(quote);
    fs.writeFileSync(SHARED_QUOTES_FILE, JSON.stringify(quotes, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving shared quote:", e);
  }
}

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

// API endpoint to save user-submitted custom quotes for the community
app.post("/api/save-custom-quote", (req, res) => {
  const { text, author, category, mood, explanation } = req.body;
  
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Quote text is required" });
  }

  const newQuote = {
    id: `custom-shared-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    text: text.trim(),
    author: author && author.trim() ? author.trim() : "Anonymous Philanthropist",
    category: category || "general",
    mood: mood || "general",
    explanation: explanation && explanation.trim() ? explanation.trim() : "A piece of shared soul from our global community.",
    isCustom: true,
    isSharedPublicly: true,
    timestamp: Date.now()
  };

  saveSharedQuote(newQuote);
  res.json({ success: true, quote: newQuote });
});

// API endpoint to retrieve all shared community quotes
app.get("/api/shared-quotes", (req, res) => {
  res.json(getSharedQuotes());
});

// API endpoint to generate motivational quote
app.post("/api/generate-quote", async (req, res) => {
  const { category, mood, customTopic, source } = req.body;

  const selectedCategory = category || "general";
  const selectedMood = mood || "general";
  const selectedSource = source || "both"; // 'both' | 'ai' | 'community'
  const extraTopic = customTopic ? `specifically focusing on "${customTopic}"` : "";

  // 1. Check if we should select a community/public quote
  const sharedPool = getSharedQuotes();
  const matchingShared = sharedPool.filter((q) => {
    const matchesCategory = selectedCategory === "general" || q.category === selectedCategory;
    const matchesMood = selectedMood === "general" || q.mood === selectedMood;
    return matchesCategory && matchesMood;
  });

  let selectedFromCommunity = false;
  let chosenQuote: any = null;

  if (selectedSource === "community") {
    if (matchingShared.length > 0) {
      chosenQuote = matchingShared[Math.floor(Math.random() * matchingShared.length)];
      selectedFromCommunity = true;
    } else if (sharedPool.length > 0) {
      // fallback to any community quote if no direct match under selected tags
      chosenQuote = sharedPool[Math.floor(Math.random() * sharedPool.length)];
      selectedFromCommunity = true;
    }
  } else if (selectedSource === "both" && matchingShared.length > 0) {
    // 35% chance to show a high-quality community quote if it matches the current focus
    if (Math.random() < 0.35) {
      chosenQuote = matchingShared[Math.floor(Math.random() * matchingShared.length)];
      selectedFromCommunity = true;
    }
  }

  if (selectedFromCommunity && chosenQuote) {
    return res.json({
      ...chosenQuote,
      id: `shared-gen-${chosenQuote.id}-${Date.now()}`,
      timestamp: Date.now(),
      generatedBy: "Community Shared"
    });
  }

  // 2. Generate with AI model if requested or if community select was skipped
  const ai = getGeminiClient();

  if (ai && selectedSource !== "community") {
    const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    
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

  // 3. Fallback if Gemini isn't configured, fails, or community source is empty
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
