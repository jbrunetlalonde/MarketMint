import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { portraits } from '../src/models/index.js';
import { closePool } from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    const resultsPath = path.join(__dirname, '../data/generation-results.json');
    const content = await fs.readFile(resultsPath, 'utf-8');
    const results = JSON.parse(content);

    console.log('Syncing portraits to database...\n');

    let synced = 0;
    let skipped = 0;

    for (const result of results) {
      if (result.status === 'failed') {
        console.log(`Skipping ${result.name} (generation failed)`);
        skipped++;
        continue;
      }

      if (!result.localPath) {
        console.log(`Skipping ${result.name} (no local path)`);
        skipped++;
        continue;
      }

      const portraitUrl = `/portraits/${path.basename(result.localPath)}`;

      try {
        if (result.category === 'ceo') {
          await portraits.updateCeoPortrait(result.name, portraitUrl);
        } else {
          await portraits.updateOfficialPortrait(result.name, portraitUrl);
        }
        console.log(`OK: ${result.name}`);
        synced++;
      } catch (error) {
        console.error(`Failed to sync ${result.name}:`, error.message);
        skipped++;
      }
    }

    console.log(`
Database sync complete!
  Synced: ${synced}
  Skipped: ${skipped}
`);

    await closePool();
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
