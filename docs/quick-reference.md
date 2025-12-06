# QUICK REFERENCE - Copy These Commands

## Files You Need

### Files to Copy (from artifacts):
- Artifact 10 → `backend/src/services/portrait-service.ts`
- Artifact 7  → `backend/src/models/portrait.ts`
- Artifact 6  → `backend/scripts/generate-portraits.ts`

### Files to Create (code in deployment-ready-complete.md):
- `backend/src/routes/portraits.ts`
- `backend/scripts/sync-portraits-to-db.ts`
- `src/lib/components/PortraitCard.svelte`

---

## Setup Commands

```bash
# 1. Go to backend
cd backend

# 2. Install dependencies
npm install replicate axios

# 3. Add to .env.production
echo "REPLICATE_API_TOKEN=r8_7s9IAwYzrSqPWp6Jzh9g4Ryi717lPde3zbYE2" >> .env.production

# 4. Verify installation
npm list replicate axios
```

---

## Files to Edit

### 1. backend/src/server.ts
Add at top:
```typescript
import portraitsRouter from './routes/portraits';
import path from 'path';
```

Add after other routes:
```typescript
app.use('/api/portraits', portraitsRouter);
app.use('/portraits', express.static(path.join(__dirname, '../portraits')));
```

### 2. backend/package.json
Add to `"scripts"`:
```json
"generate:portraits": "ts-node scripts/generate-portraits.ts",
"sync:portraits": "ts-node scripts/sync-portraits-to-db.ts"
```

### 3. Run Database Migration
```sql
CREATE TABLE IF NOT EXISTS ceo_profiles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  company VARCHAR(255) NOT NULL,
  title VARCHAR(100) DEFAULT 'CEO',
  ai_generated_portrait VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE political_trades ADD COLUMN IF NOT EXISTS ai_generated_portrait VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_ceo_profiles_name ON ceo_profiles(name);
CREATE INDEX IF NOT EXISTS idx_political_trades_official_name ON political_trades(official_name);
```

---

## Generate & Deploy

```bash
# Generate 9 portraits ($0.045, 2 minutes)
npm run generate:portraits

# Sync to database
npm run sync:portraits

# Test API
curl http://localhost:5000/api/portraits/ceo/Tim%20Cook

# Verify files
ls -la backend/portraits/
```

---

## Use in Frontend

```svelte
<script lang="ts">
  import PortraitCard from '$lib/components/PortraitCard.svelte';
</script>

<PortraitCard name="Tim Cook" company="Apple" category="ceo" />
<PortraitCard name="Chuck Schumer" title="Senator, New York" category="senate" />
```

---

## API Endpoints

```
GET /api/portraits/ceo/:name
GET /api/portraits/official/:name
GET /portraits/[filename].png (static files)
```

---

## Complete Workflow

```
1. Copy 3 files from artifacts
2. Create 3 new files (code from guide)
3. Edit 2 files (server.ts, package.json)
4. Run SQL migration
5. npm run generate:portraits
6. npm run sync:portraits
7. Use <PortraitCard /> in pages
8. Done!
```

---

**Total time: 30 minutes | Total cost: $0.045 for test | Status: PRODUCTION READY**
