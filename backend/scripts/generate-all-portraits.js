/**
 * Generate ALL portraits for CEOs and Congress members
 *
 * Usage: node scripts/generate-all-portraits.js [--ceos] [--senate] [--house] [--dry-run]
 *
 * Cost estimate: ~$0.005 per image
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { generatePortrait, downloadAndSave } from '../src/services/portrait.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTRAIT_DIR = path.join(__dirname, '../portraits');
const DATA_DIR = path.join(__dirname, '../data');

const RATE_LIMIT_MS = 12000; // 12 seconds between requests

async function loadCEOs() {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'fortune500-ceos.json'), 'utf-8');
    const json = JSON.parse(data);
    return json.ceos.map(ceo => ({
      name: ceo.name,
      company: ceo.company,
      ticker: ceo.ticker,
      category: 'ceo'
    }));
  } catch {
    console.error('Failed to load CEO data, using built-in list');
    return getBuiltInCEOs();
  }
}

async function loadCongress() {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'congress-members.json'), 'utf-8');
    const json = JSON.parse(data);

    const senators = json.senate.map(s => ({
      name: s.name,
      state: s.state,
      party: s.party,
      category: 'senate'
    }));

    const house = json.house.map(h => ({
      name: h.name,
      state: h.state,
      district: h.district,
      party: h.party,
      category: 'house'
    }));

    return { senators, house };
  } catch {
    console.error('Failed to load Congress data, using built-in list');
    return { senators: getBuiltInSenators(), house: getBuiltInHouse() };
  }
}

function getBuiltInCEOs() {
  return [
    { name: 'Tim Cook', company: 'Apple', ticker: 'AAPL', category: 'ceo' },
    { name: 'Satya Nadella', company: 'Microsoft', ticker: 'MSFT', category: 'ceo' },
    { name: 'Sundar Pichai', company: 'Google', ticker: 'GOOGL', category: 'ceo' },
    { name: 'Andy Jassy', company: 'Amazon', ticker: 'AMZN', category: 'ceo' },
    { name: 'Mark Zuckerberg', company: 'Meta', ticker: 'META', category: 'ceo' },
    { name: 'Jensen Huang', company: 'NVIDIA', ticker: 'NVDA', category: 'ceo' },
    { name: 'Elon Musk', company: 'Tesla', ticker: 'TSLA', category: 'ceo' },
  ];
}

function getBuiltInSenators() {
  return [
    { name: 'Chuck Schumer', state: 'NY', party: 'D', category: 'senate' },
    { name: 'Mitch McConnell', state: 'KY', party: 'R', category: 'senate' },
  ];
}

function getBuiltInHouse() {
  return [
    { name: 'Mike Johnson', state: 'LA', party: 'R', category: 'house' },
    { name: 'Hakeem Jeffries', state: 'NY', party: 'D', category: 'house' },
    { name: 'Nancy Pelosi', state: 'CA', party: 'D', category: 'house' },
  ];
}

async function getExistingPortraits() {
  try {
    const files = await fs.readdir(PORTRAIT_DIR);
    return new Set(files.filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
  } catch {
    await fs.mkdir(PORTRAIT_DIR, { recursive: true });
    return new Set();
  }
}

function getFilename(person) {
  const name = person.name.replace(/\s+/g, '-').toLowerCase();
  return `${person.category}-${name}`;
}

async function generateForList(people, existingPortraits, dryRun = false) {
  const toGenerate = people.filter(p => !existingPortraits.has(getFilename(p)));

  console.log(`\nFound ${toGenerate.length} portraits to generate (${people.length - toGenerate.length} already exist)`);

  if (toGenerate.length === 0) {
    console.log('All portraits already generated!');
    return { success: 0, failed: 0, skipped: people.length };
  }

  console.log(`Estimated cost: ~$${(toGenerate.length * 0.005).toFixed(2)}`);
  console.log(`Estimated time: ~${Math.ceil(toGenerate.length * 12 / 60)} minutes\n`);

  if (dryRun) {
    console.log('Portraits to generate:');
    toGenerate.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (${p.category})`));
    return { success: 0, failed: 0, skipped: people.length, dryRun: true };
  }

  const results = { success: 0, failed: 0, skipped: people.length - toGenerate.length };

  for (let i = 0; i < toGenerate.length; i++) {
    const person = toGenerate[i];
    console.log(`[${i + 1}/${toGenerate.length}] Generating ${person.name}...`);

    try {
      const imageUrl = await generatePortrait(person);

      if (imageUrl) {
        const filename = getFilename(person);
        await downloadAndSave(imageUrl, filename, PORTRAIT_DIR);
        results.success++;
        console.log(`  Success: ${filename}.png`);
      } else {
        results.failed++;
        console.log(`  Failed: No image returned`);
      }
    } catch (err) {
      results.failed++;
      console.log(`  Failed: ${err.message}`);
    }

    if (i < toGenerate.length - 1) {
      console.log(`  Waiting ${RATE_LIMIT_MS / 1000}s...`);
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const generateCeos = args.includes('--ceos') || args.length === 0 || (args.length === 1 && dryRun);
  const generateSenate = args.includes('--senate') || args.length === 0 || (args.length === 1 && dryRun);
  const generateHouse = args.includes('--house') || args.length === 0 || (args.length === 1 && dryRun);

  console.log('='.repeat(60));
  console.log('Portrait Generator');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Generate: ${[generateCeos && 'CEOs', generateSenate && 'Senate', generateHouse && 'House'].filter(Boolean).join(', ')}`);

  const existingPortraits = await getExistingPortraits();
  console.log(`\nExisting portraits: ${existingPortraits.size}`);

  const totalResults = { success: 0, failed: 0, skipped: 0 };

  if (generateCeos) {
    console.log('\n' + '='.repeat(40));
    console.log('Fortune 500 CEOs');
    console.log('='.repeat(40));
    const ceos = await loadCEOs();
    console.log(`Loaded ${ceos.length} CEOs from data file`);
    const results = await generateForList(ceos, existingPortraits, dryRun);
    totalResults.success += results.success;
    totalResults.failed += results.failed;
    totalResults.skipped += results.skipped;
  }

  if (generateSenate) {
    console.log('\n' + '='.repeat(40));
    console.log('US Senate (100 members)');
    console.log('='.repeat(40));
    const { senators } = await loadCongress();
    console.log(`Loaded ${senators.length} Senators from data file`);
    const results = await generateForList(senators, existingPortraits, dryRun);
    totalResults.success += results.success;
    totalResults.failed += results.failed;
    totalResults.skipped += results.skipped;
  }

  if (generateHouse) {
    console.log('\n' + '='.repeat(40));
    console.log('US House of Representatives (435+ members)');
    console.log('='.repeat(40));
    const { house } = await loadCongress();
    console.log(`Loaded ${house.length} Representatives from data file`);
    const results = await generateForList(house, existingPortraits, dryRun);
    totalResults.success += results.success;
    totalResults.failed += results.failed;
    totalResults.skipped += results.skipped;
  }

  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
  console.log(`Success: ${totalResults.success}`);
  console.log(`Failed: ${totalResults.failed}`);
  console.log(`Skipped (already exist): ${totalResults.skipped}`);
  console.log(`Total portraits: ${existingPortraits.size + totalResults.success}`);
}

main().catch(console.error);
