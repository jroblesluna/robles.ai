import { promises as fs } from 'fs';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

const postsDir = isProd
  ? path.resolve(process.cwd(), 'dist/data/posts')
  : path.resolve(process.cwd(), 'server/data/posts');

interface Editor {
  id: number;
  name: string;
  specialty: string;
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const daysBack = args[0] ? parseInt(args[0], 10) : 7;

  // Load editors
  const editorsPath = path.resolve(process.cwd(), 'server/data/editors.json');
  const editorsData = JSON.parse(await fs.readFile(editorsPath, 'utf-8'));
  const editors: Editor[] = editorsData.editors;

  // Generate date range
  const dates: string[] = [];
  const today = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().slice(0, 10));
  }

  console.log(`\n📊 Gap Report: Last ${daysBack} days (${dates[0]} to ${dates[dates.length - 1]})`);
  console.log(`📂 Scanning: ${postsDir}\n`);

  // Build a set of existing date-editor combinations
  const existing = new Set<string>();

  for (const dateStr of dates) {
    const [year, month, day] = dateStr.split('-');
    const dayDir = path.join(postsDir, year, month, day);

    try {
      const files = await fs.readdir(dayDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        // Extract hour from filename (position 11-12)
        const hour = parseInt(file.slice(11, 13), 10);
        const editorId = hour + 1;
        existing.add(`${dateStr}|${editorId}`);
      }
    } catch {
      // Directory doesn't exist - all editors missing for this date
    }
  }

  // Find gaps
  const gaps: { date: string; editorId: number; editorName: string }[] = [];

  for (const dateStr of dates) {
    for (const editor of editors) {
      const key = `${dateStr}|${editor.id}`;
      if (!existing.has(key)) {
        gaps.push({ date: dateStr, editorId: editor.id, editorName: editor.name });
      }
    }
  }

  // Summary by date
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Date         │ Present │ Missing │ Coverage');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const dateStr of dates) {
    const dateGaps = gaps.filter((g) => g.date === dateStr);
    const present = editors.length - dateGaps.length;
    const coverage = ((present / editors.length) * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(present / editors.length * 20));
    console.log(` ${dateStr}  │ ${String(present).padStart(7)} │ ${String(dateGaps.length).padStart(7)} │ ${coverage}% ${bar}`);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n Total gaps: ${gaps.length} / ${dates.length * editors.length} slots\n`);

  // Detail: missing editors per date
  if (gaps.length > 0) {
    console.log('📋 Missing editors by date:\n');
    for (const dateStr of dates) {
      const dateGaps = gaps.filter((g) => g.date === dateStr);
      if (dateGaps.length === 0) continue;

      if (dateGaps.length === editors.length) {
        console.log(`  ${dateStr}: ALL editors missing`);
      } else if (dateGaps.length <= 10) {
        const names = dateGaps.map((g) => `${g.editorName} (#${g.editorId})`).join(', ');
        console.log(`  ${dateStr}: ${names}`);
      } else {
        // Show how many and list first few
        const first5 = dateGaps.slice(0, 5).map((g) => `${g.editorName} (#${g.editorId})`).join(', ');
        console.log(`  ${dateStr}: ${dateGaps.length} editors missing (${first5}, ...)`);
      }
    }
  } else {
    console.log('✅ No gaps found! All editors have posts for all dates.');
  }

  console.log('');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
