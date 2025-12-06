# backend/src/services/portrait-service.ts (FINAL - Ready to Deploy)

import Replicate from 'replicate';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface Official {
  name: string;
  company?: string;
  state?: string;
  title: string;
  category: 'ceo' | 'senate' | 'house';
}

interface GenerationResult {
  name: string;
  category: string;
  localPath?: string;
  imageUrl?: string;
  status: 'success' | 'failed';
  error?: string;
}

class PortraitService {
  private replicate: Replicate;
  private portraitDir: string;

  constructor(apiToken: string, portraitDir: string) {
    this.replicate = new Replicate({ auth: apiToken });
    this.portraitDir = portraitDir;
  }

  private buildPrompt(official: Official): string {
    const baseStyle = `A finely detailed black and white engraved portrait in the style of 19th century 
newspaper illustrations. Style: Classical engraving with precise crosshatching, fine line work, 
high contrast, formal composition, vintage newspaper etching quality. Medium: Steel engraving.
Period: Victorian era newspaper portrait. Format: Head and shoulders, professional appearance.`;

    if (official.category === 'ceo') {
      return `${baseStyle}
Subject: ${official.name}, CEO of ${official.company}.
Attire: Professional business formal wear.
Details: Facial features should be clear and dignified, formal business portrait.
Rendering: Pure black and white engraving only. No color whatsoever.`;
    }

    const role = official.category === 'senate' ? 'Senator' : 'Representative';
    return `${baseStyle}
Subject: ${official.name}, United States ${role} from ${official.state}.
Attire: Professional formal business wear.
Details: Clear facial features, dignified formal portrait composition.
Rendering: Pure black and white engraving only. No color whatsoever.`;
  }

  async generatePortrait(official: Official): Promise<string | null> {
    try {
      console.log(`Generating: ${official.name}...`);

      const output = await this.replicate.run(
        'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e51cc0c17ead91e5a559d3a1176cb627',
        {
          input: {
            prompt: this.buildPrompt(official),
            negative_prompt: 'color, colored, color photo, painting, watercolor, artistic, modern, cartoon, digital art, photorealistic, photograph, blurry, soft, contemporary, 3D, rendered, CGI, anime, illustration, sketch, drawing, portrait painting, renaissance, oil painting, acrylic, watercolor, charcoal, pencil drawing, modern art, contemporary art, impressionist, abstract, low quality, oversaturated, distorted',
            num_outputs: 1,
            num_inference_steps: 60,
            guidance_scale: 8.0,
            width: 400,
            height: 500,
            scheduler: 'K_EULER_ANCESTRAL',
          },
        }
      );

      if (!output || output.length === 0) {
        throw new Error('No image generated');
      }

      return output[0];
    } catch (error) {
      console.error(`Failed to generate ${official.name}:`, error);
      return null;
    }
  }

  async downloadAndSave(imageUrl: string, filename: string): Promise<string | null> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      await fs.mkdir(this.portraitDir, { recursive: true });

      const filepath = path.join(this.portraitDir, `${filename}.png`);
      await fs.writeFile(filepath, buffer);

      console.log(`Saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error);
      return null;
    }
  }

  async generateBatch(officials: Official[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];

    for (let i = 0; i < officials.length; i++) {
      const official = officials[i];

      const imageUrl = await this.generatePortrait(official);

      if (imageUrl) {
        const filename = `${official.category}-${official.name.replace(/\s+/g, '-').toLowerCase()}`;
        const localPath = await this.downloadAndSave(imageUrl, filename);

        results.push({
          name: official.name,
          category: official.category,
          localPath: localPath || undefined,
          imageUrl,
          status: 'success',
        });
      } else {
        results.push({
          name: official.name,
          category: official.category,
          status: 'failed',
          error: 'Generation failed',
        });
      }

      if (i < officials.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export default PortraitService;
