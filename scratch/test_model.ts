import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../sampoorna/.env') });

const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});

async function testModel() {
  try {
    console.log('Testing model: googleai/gemini-2.5-flash...');
    const response = await ai.generate('Hello, are you working?');
    console.log('Response:', response.text);
  } catch (error) {
    console.error('Model test failed:', error);
    process.exit(1);
  }
}

testModel();
