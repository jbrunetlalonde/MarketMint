/**
 * Generate AI portraits for Congress members
 *
 * Usage: node scripts/generate-congress-portraits.js [--limit N] [--dry-run]
 *
 * This script:
 * 1. Fetches officials from the database who don't have portraits
 * 2. Generates portraits using Replicate FLUX 1.1 Pro
 * 3. Updates the database with portrait URLs
 *
 * Cost: ~$0.005 per image
 */

import { query, pool } from '../src/config/database.js';
import { generatePortrait } from '../src/services/portrait.js';
import politicalTracker from '../src/services/politicalTracker.js';

const RATE_LIMIT_MS = 12000; // 12 seconds between requests

async function getOfficialsWithoutPortraits(limit = 50) {
  const result = await query(
    `SELECT id, name, title, party, state
     FROM political_officials
     WHERE ai_portrait_url IS NULL
     ORDER BY name
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getAllOfficials() {
  const result = await query(
    `SELECT id, name, title, party, state, ai_portrait_url
     FROM political_officials
     ORDER BY name`
  );
  return result.rows;
}

function determineCategory(title) {
  if (!title) return 'house';
  const t = title.toLowerCase();
  if (t.includes('senator')) return 'senate';
  return 'house';
}

async function generatePortraitForOfficial(official) {
  const category = determineCategory(official.title);

  const portraitData = {
    name: official.name,
    category,
    state: official.state || 'Unknown'
  };

  console.log(`Generating portrait for ${official.name} (${category}, ${official.state || 'Unknown'})...`);

  const imageUrl = await generatePortrait(portraitData);

  if (imageUrl) {
    await politicalTracker.updateOfficialPortrait(official.name, imageUrl);
    console.log(`Saved portrait URL for ${official.name}`);
    return { success: true, name: official.name, url: imageUrl };
  } else {
    console.error(`Failed to generate portrait for ${official.name}`);
    return { success: false, name: official.name, error: 'Generation failed' };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) || 50 : 50;

  console.log('Congress Portrait Generator');
  console.log('===========================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit} officials`);
  console.log('');

  try {
    // Get officials without portraits
    const officials = await getOfficialsWithoutPortraits(limit);

    if (officials.length === 0) {
      console.log('All officials already have portraits.');

      // Show stats
      const allOfficials = await getAllOfficials();
      const withPortrait = allOfficials.filter(o => o.ai_portrait_url);
      console.log(`\nStats: ${withPortrait.length}/${allOfficials.length} officials have portraits`);

      await pool.end();
      return;
    }

    console.log(`Found ${officials.length} officials without portraits:\n`);

    officials.forEach((o, i) => {
      console.log(`  ${i + 1}. ${o.name} (${o.title || 'Unknown'}, ${o.state || '?'})`);
    });

    if (dryRun) {
      console.log('\n[DRY RUN] No portraits generated.');
      console.log(`Estimated cost: ~$${(officials.length * 0.005).toFixed(2)}`);
      await pool.end();
      return;
    }

    console.log(`\nEstimated cost: ~$${(officials.length * 0.005).toFixed(2)}`);
    console.log('Starting portrait generation...\n');

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < officials.length; i++) {
      const official = officials[i];

      const result = await generatePortraitForOfficial(official);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ name: official.name, error: result.error });
      }

      // Rate limiting
      if (i < officials.length - 1) {
        console.log(`Waiting ${RATE_LIMIT_MS / 1000}s for rate limit...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
      }
    }

    console.log('\n===========================');
    console.log('Generation Complete');
    console.log(`Success: ${results.success}`);
    console.log(`Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\nFailed officials:');
      results.errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
