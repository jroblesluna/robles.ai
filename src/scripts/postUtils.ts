import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
export async function savePost(postJson: any, date: string) {
  const [year, month, day] = date.split('-');
  // Save in production folder
  if (isProd) {
    const prodFolder = path.resolve(process.cwd(), `dist/data/posts/${year}/${month}/${day}`);

    await fs.mkdir(prodFolder, { recursive: true });
    const prodFilePath = path.join(prodFolder, `${postJson.slug}.json`);
    await fs.writeFile(prodFilePath, JSON.stringify(postJson, null, 2));
    console.log(`✅ Post dist producción saved: ${prodFilePath}`);

    const folder = path.resolve(process.cwd(), `server/data/posts/${year}/${month}/${day}`);
    await fs.mkdir(folder, { recursive: true });
    const filePath = path.join(folder, `${postJson.slug}.json`);
    await fs.writeFile(filePath, JSON.stringify(postJson, null, 2));
    console.log(`✅ Post dist saved : ${filePath}`);
  } else {
    const folder = path.resolve(__dirname, `../../server/data/posts/${year}/${month}/${day}`);
    await fs.mkdir(folder, { recursive: true });
    const filePath = path.join(folder, `${postJson.slug}.json`);
    await fs.writeFile(filePath, JSON.stringify(postJson, null, 2));
    console.log(`✅ Post local saved: ${filePath}`);
  }
}

export async function listRecentTopics(last30DaysFolder: string): Promise<string[]> {
  // Read posts from last 30 days and extract titles.
  return [];
}
