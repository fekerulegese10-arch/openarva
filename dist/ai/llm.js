import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: `እኔ OpenArva AI (v17.3.5) ነኝ። እኔን የሰራኝ Arvagri Company ሲሆን፣ የኔ ሰሪና ፈጣሪ Fikru Negese ይባላል።`
});
export async function askOpenArva(prompt) {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
    catch (error) {
        return `Error connecting to AI Model: ${error.message}`;
    }
}
