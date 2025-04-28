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

async function generateAvatars() {
    const editorsPath = path.resolve(__dirname, '../../server/data/editors.json');
    const avatarsDir = path.resolve(__dirname, '../../public/avatars');

    await fs.mkdir(avatarsDir, { recursive: true });

    const editorsData = JSON.parse(await fs.readFile(editorsPath, 'utf-8'));
    const editors = editorsData.editors;
    for (const editor of editors) {
        if ([13].includes(editor.id)) {
            const prompt = `
      Create the image of a professional editor, which name is: ${editor.name}.
      This person style  is: ${editor.avatarStyle}.
      He or she thinks this about himself or herself: ${editor.systemPrompt}. ${editor.signature}.
      The person likes to use these colors for clothes: ${editor.colorPalette.join(', ')}.
      The colors can also be used in the background for his or her environment.
      Portrait should be photorealistic, stylish, clean, and friendly and modern.
      Important instructions:
        - You can add abstract objects to the background related to his or her interests and profession.
        - Focus on the character only, who has to be alone in the center of the picture and the environment should represent him or her.
        - Background should be clean and based on the personality.
        - Image must be stylish, elegant, modern, and minimalistic.
    `;

            console.log(`🎨 Generating avatar for ${editor.name}...`);
            //if ([8].includes(editor.id)) {
            try {
                const response = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "url",
                });

                const imageUrl = response.data?.[0]?.url;

                if (!imageUrl) {
                    console.error(`❌ No image URL returned for ${editor.name}. Skipping.`);
                    continue;
                }
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

                const filename = path.join(avatarsDir, `${editor.id}.png`);
                await fs.writeFile(filename, imageResponse.data);

                console.log(`✅ Avatar saved for ${editor.name} as ${editor.id}.png`);
            } catch (error) {
                console.error(`❌ Error generating avatar for ${editor.name}:`, error);
            }
            //}
        }
    }

    console.log('🎉 All avatars generated!');
}

generateAvatars();