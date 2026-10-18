// Compatibility entry point: the inventory-based implementation replaces the legacy URL writer.
// Dry-run unless --write --output <directory> is explicitly supplied. No files are deleted.
import { generateSitemaps } from './generateSitemaps.js';
generateSitemaps().then(report => console.log(JSON.stringify(report, null, 2)))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
