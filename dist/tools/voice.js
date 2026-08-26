import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { EdgeTTS } = require('node-edge-tts');
export async function convertTextToSpeech(text, outputPath) {
    const tts = new EdgeTTS({
        voice: 'en-US-ChristopherNeural',
        lang: 'en-US',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    });
    const absoluteOutputPath = path.resolve(outputPath);
    await tts.ttsPromise(text, absoluteOutputPath);
    return `Voice file generated at ${absoluteOutputPath}`;
}
