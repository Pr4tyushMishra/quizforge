import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Use the provided API key from environment variables
// Validation Helpers
function validateText(text: any) {
    if (typeof text !== 'string' || text.length < 100) return 'Syllabus must be at least 100 characters';
    return null;
}

async function safeGenerate(systemMessage: string, userPrompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from environment variables.");
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        
        const fullPrompt = `${systemMessage}\n\n${userPrompt}`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const responseText = response.text();
        
        try {
            return JSON.parse(responseText);
        } catch (parseErr) {
            console.error("JSON Parse Error. Raw Response:", responseText);
            throw new Error("AI returned invalid JSON format. Please try again.");
        }
    } catch (err: any) {
        console.error("Gemini Generation Error:", err);
        throw err;
    }
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, keySet: !!process.env.GEMINI_API_KEY, provider: 'Google Gemini' });
});

app.post('/api/modules', async (req, res) => {
    try {
        const { text } = req.body;
        const err = validateText(text);
        if (err) return res.status(400).json({ error: err });
        
        const data = await safeGenerate(
            "You are an expert academic curriculum analyzer.",
            `Analyze the following content and extract distinct modules. Return ONLY valid JSON in this format:
{ "modules": [{ "id": "m1", "name": "Name", "description": "Desc", "subtopics": ["A", "B"] }] }
Content: ${text.substring(0, 30000)}`
        );
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate', async (req, res) => {
    try {
        const { modules, level } = req.body;
        const count = level === 'hard' ? 50 : (level === 'intermediate' ? 30 : 20);
        
        const data = await safeGenerate(
            `You are an expert academic quiz designer specializing in ${level} level assessments.`,
            `Generate exactly ${count} unique multiple-choice questions for the following modules: ${JSON.stringify(modules)}.
            
            Return ONLY valid JSON in this exact format:
            {
              "questions": [
                {
                  "id": "q1",
                  "type": "mcq",
                  "question": "Question text?",
                  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
                  "correct": "A",
                  "explanation": "Why A is correct",
                  "topic": "Module Name",
                  "difficulty": "${level}"
                }
              ]
            }`
        );
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/analytics', async (req, res) => {
    try {
        const { attempt } = req.body;
        const systemMsg = "You are an expert academic performance coach.";
        const prompt = `Student Results: ${JSON.stringify(attempt)}. Generate a comprehensive markdown report.`;
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent(`${systemMsg}\n\n${prompt}`);
        const response = await result.response;
        res.json({ markdown: response.text() });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default app;
