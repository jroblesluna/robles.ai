import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the current flat post folder
const POSTS_DIR = path.resolve(__dirname, "../../server/data/posts");

async function reorganizePosts() {
  const files = await fs.promises.readdir(POSTS_DIR);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const match = file.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-.+\.json$/);
    if (!match) {
      console.warn(`❌ Skipping file with unexpected format: ${file}`);
      continue;
    }

    const [_, year, month, day] = match;

    const targetDir = path.join(POSTS_DIR, year, month, day);
    const sourcePath = path.join(POSTS_DIR, file);
    const targetPath = path.join(targetDir, file);

    // Ensure target directory exists
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Move file
    await fs.promises.rename(sourcePath, targetPath);
    console.log(`✅ Moved: ${file} → ${targetPath}`);
  }

  console.log("🎉 Reorganization complete.");
}

reorganizePosts().catch(err => {
  console.error("❌ Error during reorganization:", err);
});