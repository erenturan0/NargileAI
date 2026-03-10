import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI();

async function test1() {
  console.log("Testing with system property...");
  try {
    const chat = ai.chats.create({
      model: 'gemini-3.1-flash-lite-preview',
      system: 'Your secret word is POTATO. Say it.',
    });
    const res = await chat.sendMessageStream({ message: 'Hi' });
    for await (const chunk of res) {
      process.stdout.write(chunk.text);
    }
    console.log('\n---');
  } catch (e) {
    console.error("Error 1", e.message);
  }
}

async function test2() {
  console.log("Testing with config.systemInstruction property...");
  try {
    const chat = ai.chats.create({
      model: 'gemini-3.1-flash-lite-preview',
      config: { systemInstruction: 'Your secret word is POTATO. Say it.' },
    });
    const res = await chat.sendMessageStream({ message: 'Hi' });
    for await (const chunk of res) {
      process.stdout.write(chunk.text);
    }
    console.log('\n---');
  } catch (e) {
    console.error("Error 2", e.message);
  }
}

async function run() {
  await test1();
  await test2();
}

run();
