import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../sampoorna/.env') });

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log("Available Models:");
      data.models.forEach((m: any) => {
        console.log(`- ID: ${m.name.replace('models/', '')} | Display: ${m.displayName}`);
      });
    } else {
      console.log("No models returned. API Response:", JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

run();
