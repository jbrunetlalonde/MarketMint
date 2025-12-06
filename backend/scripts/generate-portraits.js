import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { generateBatch } from '../src/services/portrait.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_OFFICIALS = [
  { name: 'Satya Nadella', company: 'Microsoft', title: 'CEO', category: 'ceo' },
  { name: 'Sundar Pichai', company: 'Alphabet', title: 'CEO', category: 'ceo' },
  { name: 'Tim Cook', company: 'Apple', title: 'CEO', category: 'ceo' },
  { name: 'Elon Musk', company: 'Tesla', title: 'CEO', category: 'ceo' },
  { name: 'Mark Zuckerberg', company: 'Meta', title: 'CEO', category: 'ceo' },
  { name: 'Alexandria Ocasio-Cortez', state: 'New York', title: 'Representative', category: 'house' },
  { name: 'Kevin McCarthy', state: 'California', title: 'Representative', category: 'house' },
  { name: 'Chuck Schumer', state: 'New York', title: 'Senator', category: 'senate' },
  { name: 'Mitch McConnell', state: 'Kentucky', title: 'Senator', category: 'senate' }
];

async function main() {
  console.log('Starting portrait generation...\n');
  console.log(`Total to generate: ${SAMPLE_OFFICIALS.length}\n`);

  const portraitDir = path.join(__dirname, '../portraits');
  const dataDir = path.join(__dirname, '../data');

  const startTime = Date.now();
  const results = await generateBatch(SAMPLE_OFFICIALS, portraitDir);

  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  await fs.mkdir(dataDir, { recursive: true });
  const resultsPath = path.join(dataDir, 'generation-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const cost = (SAMPLE_OFFICIALS.length * 0.005).toFixed(3);

  console.log(`
Generation complete!
  Successful: ${successful}
  Failed: ${failed}
  Results: ${resultsPath}
  Images: ${portraitDir}/

Total cost: $${cost}
Time elapsed: ${elapsed} seconds
`);
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
