import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const { EdgeTTS } = require('node-edge-tts') as {
  EdgeTTS: new (options?: {
    voice?: string;
    lang?: string;
    outputFormat?: string;
  }) => {
    ttsPromise(text: string, outputPath: string): Promise<void>;
  };
};

export async function convertTextToSpeech(
  text: string,
  outputPath: string,
): Promise<string> {
  const tts = new EdgeTTS({
    voice: 'en-US-ChristopherNeural',
    lang: 'en-US',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
  });

  const absoluteOutputPath = path.resolve(outputPath);
  await tts.ttsPromise(text, absoluteOutputPath);

  return `Voice file generated at ${absoluteOutputPath}`;
}