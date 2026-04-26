import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Validation Helpers
function validateText(text: any) {
    if (typeof text !== 'string' || text.length < 100) return 'Syllabus must be at least 100 characters';
    return null;
}

async function safeGenerate(systemMessage: string, userPrompt: string, maxRetries = 2) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing from environment variables.");

    const url = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "QuizForge"
    };
    
    const body = {
        model: "google/gemini-flash-1.5-8b",
        messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userPrompt }
        ]
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            let responseText = data.choices[0].message.content;
            
            if (responseText.includes('```json')) {
                responseText = responseText.replace(/```json|```/g, '').trim();
            }
            
            return JSON.parse(responseText);
        } catch (err: any) {
            if (attempt === maxRetries) throw err;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, keySet: !!process.env.OPENROUTER_API_KEY });
});

app.post('/api/modules', async (req, res) => {
    try {
        const { text } = req.body;
        const err = validateText(text);
        if (err) return res.status(400).json({ error: err });
        
        const data = await safeGenerate(
            "You are an expert academic curriculum analyzer.",
            `Analyze the following content and extract distinct modules. Return ONLY valid JSON:
{ "modules": [{ "id": "m1", "name": "Name", "description": "Desc", "subtopics": ["A"] }] }
Content: ${text.substring(0, 20000)}`
        );
        res.json(data);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate', async (req, res) => {
    try {
        const { modules, level } = req.body;
        // Hard: 50, Intermediate: 30, Easy: 20
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
        
        // Safety check to ensure we always have an array
        if (!data || !data.questions) {
            throw new Error("AI returned invalid data structure (missing 'questions' array)");
        }
        
        res.json(data);
    } catch (error: any) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/analytics', async (req, res) => {
    try {
        const { attempt } = req.body;
        const prompt = `Student Results: ${JSON.stringify(attempt)}. Generate a markdown report.`;
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-flash-1.5-8b:free",
                messages: [{ role: "user", content: prompt }]
            })
        });
        
        const data = await response.json();
        res.json({ markdown: data.choices[0].message.content });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default app;
