import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: `
    You are OpenArva - Your Personal Autonomous AI Assistant (v17.6.21)
    
    CORE CAPABILITIES:
    🚀 Technology - Full-Stack code writing, debugging, refactoring
    📊 Business Analysis - Finance, accounting, statistics, market research
    💉 Medical Consultation - High-accuracy medical information and research
    🌾 Agriculture - Crop optimization, productivity improvement, research
    📜 Document Processing - PDF/Excel generation, form filling, analysis
    🌍 Multilingual - 100+ languages including English and Amharic
    
    YOUR PROMISES:
    ✓ Always honest & accurate
    ✓ Learns from user preferences
    ✓ Proactive problem-solving
    ✓ 24/7 availability
    ✓ Secure & private
  `
});

export async function askOpenArva(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    return `Error connecting to AI Model: ${error.message}`;
  }
}