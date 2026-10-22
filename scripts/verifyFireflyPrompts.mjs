/** Verify the current Firefly video prompts fit the user's paste limit. No dependencies or writes. */
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../creative/firefly-demo-pairs-v3/', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const consolidated = await readFile(resolve(root, 'PROMPTS.md'), 'utf8');
const limit = 2500;
if (manifest.maxVideoPromptChars !== limit) throw new Error('Manifest must declare the 2500-character video prompt limit.');
if (manifest.demos.length !== 13 || new Set(manifest.demos.map(demo => demo.id)).size !== 13) throw new Error('Expected all 13 unique demos.');
let longest = 0;
for (const demo of manifest.demos) {
  const file = resolve(root, demo.promptFile);
  if (!file.startsWith(resolve(root) + sep)) throw new Error(`Prompt outside kit: ${demo.id}`);
  const text = await readFile(file, 'utf8');
  if (!text.trim() || text.length > limit) throw new Error(`${demo.id}: ${text.length} characters, limit ${limit} (includes file whitespace).`);
  if (text.trim() !== demo.prompt || !consolidated.includes(demo.prompt)) throw new Error(`Prompt/manifest/guide mismatch: ${demo.id}`);
  longest = Math.max(longest, text.length);
  console.log(`${demo.id}: ${text.length}/${limit}`);
}
console.log(`PASS: 13 prompts; longest ${longest}/${limit} characters including trailing whitespace.`);
