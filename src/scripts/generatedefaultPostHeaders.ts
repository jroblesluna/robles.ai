import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateDefaultPostHeaders() {
  const editorsPath = path.resolve(__dirname, '../../server/data/editors.json');
  const headersDir = path.resolve(__dirname, '../../public/avatars');

  await fs.mkdir(headersDir, { recursive: true });

  const editorsData = JSON.parse(await fs.readFile(editorsPath, 'utf-8'));
  const editors = editorsData.editors;

  for (const editor of editors) {
    if ([17].includes(editor.id)) {
      const prompt = `
Create a clean, minimalistic and stylish blog header background for an article.
The mood should match the vibe: "${editor.signature}".
Use as color palette for the design: ${editor.colorPalette.join(', ')}.
Avoid any text, logos, symbols, or UI elements.
It should be elegant, slightly abstract, and evoke creativity and professionalism.
Image should be bright and modern, clean aesthetic.
No characters, only background art.
`;

      console.log(`🎨 Generating default post header for ${editor.name}...`);
      try {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1792x1024", // WIDE aspect ratio for blog headers
          response_format: "url",
        });

        const imageUrl = response.data?.[0]?.url;

        if (!imageUrl) {
          console.error(`❌ No image URL returned for ${editor.name}. Skipping.`);
          continue;
        }

        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        const filename = path.join(headersDir, `defaultPostHeader-${editor.id}.png`);
        await fs.writeFile(filename, imageResponse.data);

        console.log(`✅ Default post header saved for ${editor.name} as defaultPostHeader-${editor.id}.png`);
      } catch (error) {
        console.error(`❌ Error generating post header for ${editor.name}:`, error);
      }
    }
  }

  // Generate also a generic one (defaultPostHeader.png)
  console.log('🎨 Generating global defaultPostHeader.png...');
  try {
    const genericPrompt = `
Create a clean, elegant, minimalistic and stylish blog header background for a tech blog.
Use tones of blue, violet and light gray.
Avoid any text, logos, symbols, or UI elements.
The image should be creative, smooth, and professional.
It should evoke innovation and inspiration, suitable for AI, Cloud, and Digital Transformation topics.
No characters, only abstract background.
`;
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: genericPrompt,
      n: 1,
      size: "1792x1024",
      response_format: "url",
    });

    const imageUrl = response.data?.[0]?.url;

    if (imageUrl) {
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const filename = path.join(headersDir, `defaultPostHeader.png`);
      await fs.writeFile(filename, imageResponse.data);

      console.log(`✅ Global defaultPostHeader.png saved.`);
    } else {
      console.error(`❌ No image URL returned for defaultPostHeader.`);
    }
  } catch (error) {
    console.error(`❌ Error generating global defaultPostHeader.png:`, error);
  }

  console.log('🎉 All default post headers generated!');
}

generateDefaultPostHeaders();