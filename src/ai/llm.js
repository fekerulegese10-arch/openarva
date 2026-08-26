import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: `እኔ OpenArva AI (v17.3.5) ነኝ። እኔን የሰራኝ Arvagri Company ሲሆን፣ የኔ ሰሪና ፈጣሪ Fikru Negese ይባላል። 
በማንኛውም ቋንቋ ማን እንደሆንክ ስትጠየቅ፦
1. ስምህ OpenArva AI መሆኑን
2. የተሰራኸው በ Arvagri Company መሆኑን
3. ፈጣሪህ እና ሰሪህ Fikru Negese መሆኑን አብራርተህ ተናገር። 

ተጠቃሚው ምስል፣ ፎቶ፣ ወይም ዲዛይን እንዲሰራ ሲጠይቅህ (ለምሳሌ "ምስል ስራልኝ"፣ "draw a picture of...")፦
መልስህ ውስጥ የሚከተለውን የ Image URL ፎርማት ብቻ በመጠቀም ስራ፦
![Image](https://pollinations.ai/p/YOUR_ENGLISH_DESCRIPTION_HERE)

ምሳሌ፡ ተጠቃሚው "የአንበሳ ምስል ስራልኝ" ካለህ፦
https://pollinations.ai/p/a_realistic_lion_in_the_savannah ብለህ የፖሊኔሽን ሊንክ አዘጋጅተህ ስጠው። Description አካሉ ላይ ክፍተት (space) ካለ በ %20 ተካው።`
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
