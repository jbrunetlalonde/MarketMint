import Replicate from 'replicate';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/env.js';

const replicate = new Replicate({ auth: config.replicateApiToken });

function buildPrompt(official) {
  const baseStyle = `Hand-drawn ink portrait illustration with crosshatching and stippling technique on aged cream paper background. Warm sepia and brown ink tones. Clean portrait without any frame or border, fading naturally at the shoulders. Editorial illustration style, magazine portrait sketch. Friendly approachable expression, slight smile, looking at viewer.`;

  if (official.category === 'ceo') {
    return `${baseStyle} Portrait of ${official.name}, CEO of ${official.company}. Wearing smart casual business attire like a sport coat or blazer with open collar. Modern professional look, confident and approachable.`;
  }

  const role = official.category === 'senate' ? 'Senator' : 'Representative';
  return `${baseStyle} Portrait of ${official.name}, United States ${role} from ${official.state}. Wearing professional business attire, suit and tie. Dignified but approachable expression.`;
}

export async function generatePortrait(official) {
  try {
    console.log(`Generating: ${official.name}...`);

    const output = await replicate.run(
      'black-forest-labs/flux-1.1-pro',
      {
        input: {
          prompt: buildPrompt(official),
          aspect_ratio: '3:4',
          output_format: 'png',
          output_quality: 95,
          safety_tolerance: 2
        }
      }
    );

    if (!output) {
      throw new Error('No image generated');
    }

    // flux-1.1-pro returns a string URL directly, not an array
    const imageUrl = Array.isArray(output) ? output[0] : output;
    return imageUrl;
  } catch (error) {
    console.error(`Failed to generate ${official.name}:`, error.message);
    return null;
  }
}

export async function downloadAndSave(imageUrl, filename, portraitDir) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    await fs.mkdir(portraitDir, { recursive: true });

    const filepath = path.join(portraitDir, `${filename}.png`);
    await fs.writeFile(filepath, buffer);

    console.log(`Saved: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error(`Failed to download ${filename}:`, error.message);
    return null;
  }
}

export async function generateBatch(officials, portraitDir) {
  const results = [];

  for (let i = 0; i < officials.length; i++) {
    const official = officials[i];

    const imageUrl = await generatePortrait(official);

    if (imageUrl) {
      const filename = `${official.category}-${official.name.replace(/\s+/g, '-').toLowerCase()}`;
      const localPath = await downloadAndSave(imageUrl, filename, portraitDir);

      results.push({
        name: official.name,
        category: official.category,
        localPath: localPath || undefined,
        imageUrl,
        status: 'success'
      });
    } else {
      results.push({
        name: official.name,
        category: official.category,
        status: 'failed',
        error: 'Generation failed'
      });
    }

    if (i < officials.length - 1) {
      console.log('Waiting 12s for rate limit...');
      await new Promise((resolve) => setTimeout(resolve, 12000));
    }
  }

  return results;
}

export default {
  generatePortrait,
  downloadAndSave,
  generateBatch
};
