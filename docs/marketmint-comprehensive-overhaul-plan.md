<h1 align="center">MarketMint Comprehensive UI/UX Overhaul</h1>

<p align="center">Ticker page redesign, Congress trades pagination, search logos, and earnings calendar</p>

---

## Overview

This plan addresses multiple critical issues across the MarketMint platform:

1. **Ticker Page** - Layout redesign, empty sections showing "nothing", CEO portrait not displaying, financial statements misalignment
2. **Congress Page** - Replace perceived "hardcoded" data with paginated API data, add member search
3. **Search** - Add company logos to search results
4. **Earnings Calendar** - New dedicated page accessible from footer Resources section

**Key Finding**: Many "nothing" sections are due to FMP API data availability (not all stocks have all data types), not code bugs. The fix involves better empty states AND ensuring API calls work correctly.

---

## Phase 1: Ticker Page Data & Empty States

### Problem Analysis

Current sections showing "nothing" for various stocks:

| Section | Component | API Call | Issue |
|---------|-----------|----------|-------|
| Earnings History | `EarningsHistory.svelte` | `getEarningsHistory()` | Data may not exist for all tickers |
| Analyst Activity | `AnalystBreakdown.svelte` | `getAnalystGrades()` | Only covered stocks have data |
| Revenue by Segment | `RevenueSegments.svelte` | `getRevenueSegmentsV2()` | Only ~500 largest companies |
| Stock Splits | `SplitHistory.svelte` | `getSplits()` | Only stocks with split history |
| Institutional Ownership | `InstitutionalOwners.svelte` | `getInstitutionalHolders()` | Not all stocks tracked |
| Sector Peers | `SectorPeers.svelte` | `peers` from full financials | Requires same sector stocks |
| Insider Trading | `InsiderTrades.svelte` | `getInsiderTradesByTicker()` | Reporting varies by stock |
| SEC Filings | `SecFilings.svelte` | `getSecFilings()` | Should always have data |

### Implementation Steps

#### 1.1 Verify API Data Flow
**File**: `src/routes/ticker/[symbol]/+page.svelte`

Check that all API calls are being made correctly (lines 300-423):
```typescript
// Verify these calls return expected data
const [
  earningsHistory,    // line 370
  analystGrades,      // line 371
  revenueSegments,    // line 369
  splits,             // line 364
  institutionalHolders, // line 363
  peers,              // from fullFinancials
  insiderTrades,      // line 366
  secFilings          // line 367
] = await Promise.all([...]);
```

#### 1.2 Fix CEO Portrait Display
**File**: `src/routes/ticker/[symbol]/+page.svelte`

Current code (lines 327-329):
```typescript
if (data.ceoPortrait?.portraitUrl) {
  ceoPortrait = getPortraitUrl(data.ceoPortrait.portraitUrl);
}
```

**Issue**: CEO portrait not showing means either:
- `data.ceoPortrait` is null (API not returning it)
- `getPortraitUrl()` returning incorrect URL
- Image URL is 404ing

**Fix**: Add fallback to key-executives endpoint photo or DiceBear avatar:
```typescript
// In data loading section
const executives = fullFinancials?.executives || [];
const ceo = executives.find(e => e.title?.toLowerCase().includes('ceo'));

// CEO portrait with fallback chain
let ceoPortraitUrl = $state<string | null>(null);
$effect(() => {
  if (data.ceoPortrait?.portraitUrl) {
    ceoPortraitUrl = getPortraitUrl(data.ceoPortrait.portraitUrl);
  } else if (ceo?.name) {
    // Fallback to DiceBear avatar
    ceoPortraitUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ceo.name)}&backgroundColor=374151`;
  }
});
```

#### 1.3 Improve Empty State Messages
**File**: Create/update `src/lib/components/EmptyState.svelte`

Current component exists but needs context-aware messages:
```svelte
<script lang="ts">
  interface Props {
    title?: string;
    description?: string;
    compact?: boolean;
    icon?: 'chart' | 'data' | 'search' | 'calendar' | 'user';
    showReason?: boolean;
    reason?: 'no-data' | 'api-error' | 'not-available' | 'loading';
  }

  let {
    title = 'No data available',
    description = '',
    compact = false,
    icon = 'data',
    showReason = true,
    reason = 'no-data'
  }: Props = $props();

  const reasonMessages = {
    'no-data': 'This data is not available for this stock.',
    'api-error': 'Unable to fetch data. Try refreshing.',
    'not-available': 'This feature is not available for this stock type.',
    'loading': 'Loading data...'
  };
</script>
```

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/ticker/[symbol]/+page.svelte` | Fix CEO portrait, improve data loading |
| `src/lib/components/EmptyState.svelte` | Add context-aware messages |
| `src/lib/components/EarningsHistory.svelte` | Use improved EmptyState |
| `src/lib/components/RevenueSegments.svelte` | Use improved EmptyState |
| `src/lib/components/SectorPeers.svelte` | Use improved EmptyState |
| `src/lib/components/InsiderTrades.svelte` | Use improved EmptyState |

---

## Phase 2: Ticker Page Layout Redesign

### Current Layout Issues

1. **Visual hierarchy is flat** - All sections have equal weight
2. **Empty sections create gaps** - "Swiss cheese" layout effect
3. **13+ sections cause cognitive overload** - Too much to parse
4. **Mobile responsive issues** - Sidebar disappears awkwardly at 900px

### Proposed Layout Structure

```
+------------------------------------------+
|  HEADER: Symbol, Name, Price, Change     |
+------------------------------------------+
|           CANDLESTICK CHART              |
+------------------------------------------+
| Key Stats | Key Stats | Key Stats | Stats|
+------------------------------------------+
|                                          |
|  PRIMARY CONTENT (60%)  |  SIDEBAR (40%) |
|  - Company Info         |  - About       |
|  - Financials Tabs      |  - Executives  |
|  - News                 |  - Scorecard   |
|                                          |
+------------------------------------------+
|         SECONDARY CONTENT GRID           |
| Earnings | Analyst | Segments | Peers    |
+------------------------------------------+
|         TERTIARY CONTENT GRID            |
| Insider | SEC | Splits | Institutional   |
+------------------------------------------+
| Congress Trades (if any for this ticker) |
+------------------------------------------+
```

### Implementation Steps

#### 2.1 Section Grouping with Collapsible Containers
**File**: `src/routes/ticker/[symbol]/+page.svelte`

Create collapsible section groups:
```svelte
<script lang="ts">
  // Section visibility states
  let expandedSections = $state({
    financials: true,
    analytics: true,
    ownership: false, // Collapsed by default
    filings: false
  });
</script>

<!-- Section Group Component -->
<section class="section-group" data-expanded={expandedSections.analytics}>
  <button
    class="section-header"
    onclick={() => expandedSections.analytics = !expandedSections.analytics}
  >
    <h2>Analytics & Estimates</h2>
    <span class="chevron">{expandedSections.analytics ? '-' : '+'}</span>
  </button>

  {#if expandedSections.analytics}
    <div class="section-content grid grid-cols-2 gap-4">
      {#if earningsHistory?.length > 0}
        <EarningsHistory data={earningsHistory} />
      {/if}
      {#if analystGrades?.length > 0}
        <AnalystBreakdown grades={analystGrades} />
      {/if}
    </div>
  {/if}
</section>
```

#### 2.2 Hide Empty Sections Intelligently
Only show sections that have data:
```svelte
<!-- Only render if data exists -->
{#if revenueSegments?.length > 0}
  <RevenueSegments data={revenueSegments} />
{/if}

{#if splits?.length > 0}
  <SplitHistory data={splits} />
{/if}

<!-- Or show with helpful empty state for expected data -->
{#if !earningsHistory || earningsHistory.length === 0}
  <EmptyState
    title="Earnings History"
    description="No earnings data available for {symbol}"
    reason="not-available"
    compact
  />
{:else}
  <EarningsHistory data={earningsHistory} />
{/if}
```

#### 2.3 Financial Statements Fix
**Files**: `src/lib/components/FinancialChart.svelte`, `src/lib/components/FinancialTable.svelte`

**Issue**: "Line not aligned with revenue" and "only shows 2024"

Investigation needed:
1. Check if `period` toggle (Annual/Quarterly) is working
2. Verify API returns multiple years of data
3. Check chart x-axis configuration

```typescript
// In FinancialChart.svelte - ensure proper data mapping
const chartData = $derived(() => {
  if (!data || data.length === 0) return [];

  // Sort by date ascending for proper chart rendering
  return [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
});

// Ensure chart shows multiple years
const years = $derived(() => {
  return [...new Set(chartData.map(d => new Date(d.date).getFullYear()))];
});
```

#### 2.4 Responsive Breakpoint Improvements
**File**: `src/routes/ticker/[symbol]/+page.svelte` (CSS section)

```css
/* Mobile first */
.ticker-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet (768px-899px) - Key stats as horizontal bar */
@media (min-width: 768px) and (max-width: 899px) {
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .content-area {
    grid-template-columns: 1fr;
  }
}

/* Desktop (900px+) - Sidebar layout */
@media (min-width: 900px) {
  .content-area {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 1.5rem;
  }
}

/* Large desktop (1200px+) */
@media (min-width: 1200px) {
  .content-area {
    grid-template-columns: 1fr 400px;
    gap: 2rem;
  }
}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/ticker/[symbol]/+page.svelte` | Section grouping, layout restructure |
| `src/lib/components/FinancialChart.svelte` | Fix multi-year display, alignment |
| `src/lib/components/FinancialTable.svelte` | Fix multi-year display |
| `src/routes/layout.css` | Add section group styles |

---

## Phase 3: Congress Page Overhaul

### Current State Analysis

**Location**: `src/routes/political/+page.svelte` and `src/routes/political/[chamber]/+page.svelte`

**Current Implementation**:
- Fetches real API data from FMP (`/api/political/trades`)
- Has filters: Party, Transaction Type, Ticker search
- Has view modes: Cards and Table
- **Missing**: Pagination UI (hardcoded `limit: 100`)
- **Missing**: Member name search
- **Missing**: "Last updated" timestamp

**Why user thinks data is "hardcoded"**:
- Same trades appear each visit (no indication of freshness)
- No timestamp showing when data was fetched
- No way to load more/older trades

### Implementation Steps

#### 3.1 Add Server-Side Pagination
**File**: `backend/src/routes/political.js`

Already supports `offset` parameter (line 19). Frontend needs to use it.

**File**: `src/routes/political/[chamber]/+page.svelte`

```svelte
<script lang="ts">
  const BATCH_SIZE = 50;

  let trades = $state<PoliticalTrade[]>([]);
  let offset = $state(0);
  let hasMore = $state(true);
  let loadingMore = $state(false);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    loadingMore = true;

    const response = await api.getPoliticalTrades({
      chamber: config.chamber,
      limit: BATCH_SIZE,
      offset: offset + trades.length
    });

    if (response.success && response.data) {
      trades = [...trades, ...response.data];
      hasMore = response.pagination?.hasMore ?? response.data.length === BATCH_SIZE;
      offset += response.data.length;
    }

    loadingMore = false;
  }
</script>

<!-- Load More Button -->
{#if hasMore && trades.length > 0}
  <div class="text-center mt-6">
    <button onclick={loadMore} class="btn btn-primary" disabled={loadingMore}>
      {loadingMore ? 'Loading...' : 'Load More Trades'}
    </button>
    <p class="text-xs text-ink-muted mt-2">
      Showing {filteredTrades.length} of {trades.length} loaded trades
    </p>
  </div>
{/if}
```

#### 3.2 Add Member Name Search
**File**: `src/routes/political/[chamber]/+page.svelte`

Add search input that filters by `officialName`:
```svelte
<script lang="ts">
  let searchMember = $state('');

  const filteredTrades = $derived.by(() => {
    let result = trades;

    // Existing filters...
    if (filterParty !== 'all') { /* ... */ }
    if (filterType !== 'all') { /* ... */ }
    if (filterTicker.trim()) { /* ... */ }

    // NEW: Member name search
    if (searchMember.trim()) {
      const search = searchMember.trim().toLowerCase();
      result = result.filter(t =>
        t.officialName.toLowerCase().includes(search)
      );
    }

    return result;
  });
</script>

<!-- Member Search Input -->
<div>
  <label for="search-member" class="byline block mb-1">Member</label>
  <input
    type="text"
    id="search-member"
    bind:value={searchMember}
    placeholder="Search by name..."
    class="input"
  />
</div>
```

#### 3.3 Add Last Updated Timestamp
**File**: `src/routes/political/[chamber]/+page.svelte`

```svelte
<script lang="ts">
  let lastUpdated = $state<Date | null>(null);

  async function fetchTrades(append = false) {
    // ... existing fetch logic ...
    lastUpdated = new Date();
  }
</script>

<!-- Timestamp Display -->
{#if lastUpdated}
  <p class="text-xs text-ink-muted">
    Last updated: {lastUpdated.toLocaleTimeString()}
  </p>
{/if}
```

#### 3.4 Fix Portrait Fallbacks
**File**: `src/routes/political/[chamber]/+page.svelte`

Current code already has DiceBear fallback (line 43-45). Ensure it's used in template:
```svelte
<img
  src={getPortraitUrl(trade.officialName)}
  alt={trade.officialName}
  class="w-10 h-12 object-contain border border-ink-light"
  onerror={(e) => {
    const img = e.currentTarget as HTMLImageElement;
    img.onerror = null;
    img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trade.officialName)}&backgroundColor=374151`;
  }}
/>
```

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/political/+page.svelte` | Add pagination, member search, timestamp |
| `src/routes/political/[chamber]/+page.svelte` | Same changes for chamber-specific pages |
| `src/lib/utils/api/political.ts` | Already supports pagination parameters |
| `backend/src/routes/political.js` | Already supports offset (line 19) |

---

## Phase 4: Search Logo Integration

### Current Search Implementation

**File**: `src/lib/components/SearchAutocomplete.svelte` (503 lines)

**Features**:
- Debounced search (300ms)
- Shows: Symbol | Company Name | Exchange badge
- **Missing**: Company logo

### FMP Logo URL Format
```
https://financialmodelingprep.com/image-stock/{TICKER}.png
```

**Note**: No API key required for logos.

### Implementation Steps

#### 4.1 Add Logo to Search Results
**File**: `src/lib/components/SearchAutocomplete.svelte`

```svelte
<script lang="ts">
  // Helper function for logo URL
  function getLogoUrl(symbol: string): string {
    return `https://financialmodelingprep.com/image-stock/${symbol}.png`;
  }

  // Logo error handling state
  let logoErrors = $state<Set<string>>(new Set());

  function handleLogoError(symbol: string, event: Event) {
    logoErrors.add(symbol);
    const img = event.target as HTMLImageElement;
    // Fallback to initials avatar
    img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${symbol}&backgroundColor=6366f1&textColor=ffffff`;
  }
</script>

<!-- In the results dropdown -->
{#each results as result (result.symbol)}
  <button class="autocomplete-item" onclick={() => selectResult(result)}>
    <div class="flex items-center gap-3">
      <!-- Company Logo -->
      <img
        src={getLogoUrl(result.symbol)}
        alt=""
        class="w-8 h-8 rounded object-contain bg-white border border-gray-200"
        loading="lazy"
        onerror={(e) => handleLogoError(result.symbol, e)}
      />

      <!-- Symbol and Name -->
      <div class="flex-1 min-w-0">
        <span class="font-mono font-semibold text-sm">{result.symbol}</span>
        <span class="text-ink-muted text-sm ml-2 truncate">{result.name}</span>
      </div>

      <!-- Exchange Badge -->
      <span class="badge badge-sm">{result.exchangeShortName}</span>
    </div>
  </button>
{/each}
```

#### 4.2 Add CSS for Logo Display
```css
.autocomplete-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s;
}

.autocomplete-item:hover,
.autocomplete-item:focus {
  background-color: var(--color-newsprint-dark);
}

.autocomplete-item img {
  flex-shrink: 0;
}

/* Dark mode adjustments */
[data-theme="dark"] .autocomplete-item img {
  background-color: #2a2a2a;
  border-color: #3d3d3d;
}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/components/SearchAutocomplete.svelte` | Add logo display, error handling |

---

## Phase 5: Earnings Calendar Page

### New Route Creation

**URL**: `/earnings`
**Footer Link**: Resources > Earnings Calendar

### Implementation Steps

#### 5.1 Create Earnings Calendar Route
**File**: `src/routes/earnings/+page.svelte` (NEW)

```svelte
<script lang="ts">
  import api from '$lib/utils/api';
  import { formatDate } from '$lib/utils/formatters';

  interface EarningsEvent {
    symbol: string;
    date: string;
    time: string; // 'bmo' | 'amc' | 'tns'
    epsEstimated: number | null;
    revenueEstimated: number | null;
  }

  let events = $state<EarningsEvent[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let daysAhead = $state(14);

  // Group events by date
  const eventsByDate = $derived.by(() => {
    const grouped: Record<string, EarningsEvent[]> = {};

    events.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });

    // Sort by date
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  });

  function getLogoUrl(symbol: string): string {
    return `https://financialmodelingprep.com/image-stock/${symbol}.png`;
  }

  function getTimeLabel(time: string): string {
    switch (time) {
      case 'bmo': return 'Before Open';
      case 'amc': return 'After Close';
      default: return 'TBD';
    }
  }

  function getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }

  async function fetchEarnings() {
    loading = true;
    error = null;

    try {
      const response = await api.getEarningsCalendar(daysAhead);
      if (response.success) {
        events = response.data || [];
      } else {
        error = 'Failed to load earnings calendar';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load earnings';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    fetchEarnings();
  });
</script>

<svelte:head>
  <title>Earnings Calendar - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
  <section class="col-span-full">
    <h1 class="headline headline-xl">Earnings Calendar</h1>
    <p class="text-ink-muted mt-2">Upcoming earnings announcements</p>
  </section>

  <!-- Controls -->
  <section class="col-span-full">
    <div class="card flex items-center gap-4 flex-wrap">
      <div>
        <label for="days-ahead" class="byline block mb-1">Show Next</label>
        <select id="days-ahead" bind:value={daysAhead} class="input">
          <option value={7}>7 Days</option>
          <option value={14}>14 Days</option>
          <option value={30}>30 Days</option>
        </select>
      </div>
      <button onclick={fetchEarnings} class="btn btn-secondary" disabled={loading}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </section>

  <!-- Calendar Content -->
  <section class="col-span-full">
    {#if loading}
      <div class="card text-center py-8">
        <p class="text-ink-muted">Loading earnings calendar...</p>
      </div>
    {:else if error}
      <div class="card text-center py-8">
        <p class="text-red-600 mb-4">{error}</p>
        <button onclick={fetchEarnings} class="btn btn-primary">Try Again</button>
      </div>
    {:else if events.length === 0}
      <div class="card text-center py-8">
        <p class="text-ink-muted">No earnings scheduled for the next {daysAhead} days</p>
      </div>
    {:else}
      <div class="space-y-6">
        {#each eventsByDate as [date, dayEvents] (date)}
          <div class="card">
            <h2 class="headline headline-md mb-4 pb-2 border-b border-border">
              {getDateLabel(date)}
              <span class="text-ink-muted text-sm font-normal ml-2">
                ({dayEvents.length} {dayEvents.length === 1 ? 'company' : 'companies'})
              </span>
            </h2>

            <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {#each dayEvents as event (event.symbol)}
                <a
                  href="/ticker/{event.symbol}"
                  class="earnings-card"
                >
                  <img
                    src={getLogoUrl(event.symbol)}
                    alt=""
                    class="w-10 h-10 rounded object-contain bg-white border border-gray-200"
                    onerror={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.onerror = null;
                      img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${event.symbol}&backgroundColor=374151`;
                    }}
                  />
                  <div class="flex-1 min-w-0">
                    <div class="font-mono font-semibold">{event.symbol}</div>
                    <div class="text-xs text-ink-muted">{getTimeLabel(event.time)}</div>
                  </div>
                  {#if event.epsEstimated}
                    <div class="text-right">
                      <div class="text-xs text-ink-muted">Est. EPS</div>
                      <div class="font-mono">${event.epsEstimated.toFixed(2)}</div>
                    </div>
                  {/if}
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .earnings-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background-color: var(--color-newsprint-dark);
    border: 1px solid var(--color-border);
    text-decoration: none;
    color: inherit;
    transition: background-color 0.15s;
  }

  .earnings-card:hover {
    background-color: var(--color-newsprint);
  }

  [data-theme="dark"] .earnings-card {
    background-color: #1e1e1e;
  }

  [data-theme="dark"] .earnings-card:hover {
    background-color: #2a2a2a;
  }

  [data-theme="dark"] .earnings-card img {
    background-color: #2a2a2a;
    border-color: #3d3d3d;
  }
</style>
```

#### 5.2 Add Footer Link
**File**: `src/lib/components/Footer.svelte`

Find the Resources section and add:
```svelte
<!-- In Resources section -->
<div>
  <h4 class="byline mb-2">Resources</h4>
  <ul class="space-y-1">
    <li><a href="/markets" class="footer-link">Markets</a></li>
    <li><a href="/political" class="footer-link">Congress Trades</a></li>
    <li><a href="/earnings" class="footer-link">Earnings Calendar</a></li> <!-- NEW -->
    <!-- ... other links -->
  </ul>
</div>
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/routes/earnings/+page.svelte` | Create new page |
| `src/lib/components/Footer.svelte` | Add link in Resources section |

---

## Phase 6: SEC Filings Clarity Improvements

### Current Issues

User says "SEC Filing needs to be more clear" - likely issues:
- Filing type codes (10-K, 10-Q, 8-K) not explained
- Too many filings without categorization
- Dates not clearly labeled

### Implementation Steps

#### 6.1 Add Filing Type Explanations
**File**: `src/lib/components/SecFilings.svelte`

```svelte
<script lang="ts">
  const filingTypeDescriptions: Record<string, string> = {
    '10-K': 'Annual Report',
    '10-Q': 'Quarterly Report',
    '8-K': 'Material Event',
    'DEF 14A': 'Proxy Statement',
    '4': 'Insider Transaction',
    'S-1': 'IPO Registration',
    '13F': 'Institutional Holdings'
  };

  function getFilingDescription(type: string): string {
    return filingTypeDescriptions[type] || type;
  }
</script>

<!-- In the filings list -->
{#each filings as filing (filing.id)}
  <div class="filing-item">
    <div class="filing-type">
      <span class="font-mono font-semibold">{filing.type}</span>
      <span class="text-xs text-ink-muted">{getFilingDescription(filing.type)}</span>
    </div>
    <div class="filing-date">
      <span class="text-xs text-ink-muted">Filed:</span>
      <span>{formatDate(filing.fillingDate)}</span>
    </div>
    <a href={filing.link} target="_blank" rel="noopener" class="btn btn-sm btn-ghost">
      View
    </a>
  </div>
{/each}
```

#### 6.2 Categorize Filings
Group filings by type:
```svelte
<script lang="ts">
  const categorizedFilings = $derived.by(() => {
    const annual = filings.filter(f => f.type === '10-K');
    const quarterly = filings.filter(f => f.type === '10-Q');
    const events = filings.filter(f => f.type === '8-K');
    const other = filings.filter(f => !['10-K', '10-Q', '8-K'].includes(f.type));

    return { annual, quarterly, events, other };
  });
</script>

<!-- Tabbed or sectioned display -->
<div class="filing-categories">
  {#if categorizedFilings.annual.length > 0}
    <div class="filing-category">
      <h4 class="byline">Annual Reports (10-K)</h4>
      {#each categorizedFilings.annual.slice(0, 3) as filing}
        <!-- filing item -->
      {/each}
    </div>
  {/if}

  {#if categorizedFilings.quarterly.length > 0}
    <div class="filing-category">
      <h4 class="byline">Quarterly Reports (10-Q)</h4>
      {#each categorizedFilings.quarterly.slice(0, 4) as filing}
        <!-- filing item -->
      {/each}
    </div>
  {/if}
</div>
```

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/components/SecFilings.svelte` | Add descriptions, categorization |

---

## Implementation Order

```
Phase 1: Data & Empty States (Foundation)
├── Verify all API calls work correctly
├── Fix CEO portrait display with fallback
└── Improve EmptyState component

Phase 2: Ticker Page Layout (High Impact)
├── Implement section grouping
├── Add collapsible sections
├── Fix financial statements display
└── Improve responsive breakpoints

Phase 3: Congress Page (User Request)
├── Add pagination UI
├── Add member name search
├── Add last updated timestamp
└── Ensure real API data flows

Phase 4: Search Logos (Polish)
├── Add logo display to search results
├── Implement error fallback
└── Test with various tickers

Phase 5: Earnings Calendar (New Feature)
├── Create /earnings route
├── Implement calendar UI
├── Add footer link
└── Add logo support

Phase 6: SEC Filings (Clarity)
├── Add filing type descriptions
└── Categorize filings
```

---

## Testing Checklist

### Ticker Page
- [ ] Test with AAPL (large cap, should have all data)
- [ ] Test with TSLA (active insider trading)
- [ ] Test with small cap stock (limited data expected)
- [ ] CEO portrait displays with fallback
- [ ] Financial statements show multiple years
- [ ] Empty sections show helpful messages
- [ ] Mobile responsive works (320px, 768px, 900px, 1200px)
- [ ] Dark mode works correctly

### Congress Page
- [ ] Initial load shows real API data
- [ ] "Load More" button fetches additional trades
- [ ] Member search filters results correctly
- [ ] Party filter works
- [ ] Transaction type filter works
- [ ] Ticker filter works
- [ ] Last updated timestamp displays
- [ ] Portrait fallbacks work

### Search
- [ ] Logos display for common tickers (AAPL, MSFT, GOOGL)
- [ ] Fallback works for tickers without logos
- [ ] No layout shift when logos load
- [ ] Dark mode logo display correct

### Earnings Calendar
- [ ] `/earnings` route loads
- [ ] Events grouped by date correctly
- [ ] "Today" and "Tomorrow" labels work
- [ ] Logos display with fallbacks
- [ ] Footer link navigates correctly
- [ ] Days ahead selector works
- [ ] Refresh button works

### SEC Filings
- [ ] Filing types have descriptions
- [ ] Filings categorized correctly
- [ ] Links open in new tab

---

## Files Summary

| Priority | File | Action | Description |
|----------|------|--------|-------------|
| 1 | `src/routes/ticker/[symbol]/+page.svelte` | Modify | Layout, CEO portrait, section grouping |
| 1 | `src/lib/components/EmptyState.svelte` | Modify | Context-aware messages |
| 2 | `src/lib/components/FinancialChart.svelte` | Modify | Multi-year display fix |
| 2 | `src/lib/components/FinancialTable.svelte` | Modify | Multi-year display fix |
| 3 | `src/routes/political/[chamber]/+page.svelte` | Modify | Pagination, search, timestamp |
| 4 | `src/lib/components/SearchAutocomplete.svelte` | Modify | Add logos |
| 5 | `src/routes/earnings/+page.svelte` | Create | New earnings calendar page |
| 5 | `src/lib/components/Footer.svelte` | Modify | Add earnings link |
| 6 | `src/lib/components/SecFilings.svelte` | Modify | Descriptions, categorization |

---

## Success Metrics

1. **Ticker Page**: User no longer says layout is "very bad"
2. **Empty Sections**: Clear messaging about data availability
3. **CEO Portrait**: Displays with graceful fallback
4. **Financial Statements**: Shows 5 years of data, properly aligned
5. **Congress Page**: Can navigate through 500+ trades with pagination
6. **Search**: 80%+ of searches show company logos
7. **Earnings Calendar**: Accessible from footer, shows upcoming earnings
8. **SEC Filings**: Filing types clearly explained
