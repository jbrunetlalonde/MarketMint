# Congress Trades Feature - Complete Implementation Plan

## Overview
Finalize the political/congressional trading feature to showcase House and Senate members with comprehensive trading data, charts, and insider trading information. Build Congress and Insider Trading features **in parallel**.

---

## Design Reference (from screenshots)

### Politicians List Page
- Two-column layout: House (left) | Senate (right)
- Count badges: "House (231)" and "Senate (59)"
- Each row: AI pencil-sketch portrait | Name | "View Trades" link
- Newspaper aesthetic with dotted dividers

### Member Detail Page
- Large AI portrait (pencil sketch style)
- Name + Title (e.g., "Adam B. Schiff - Representative")
- **"Stocks Owned at One Point"** - Cards with company logo, ticker, transaction type, date
- **"Trade Timeline"** - Table with Stock, Type (color-coded), Amount Range, Date

---

## Current Implementation Status

### What Exists
| Feature | Status | Location |
|---------|--------|----------|
| Main trades listing | Done | `/src/routes/political/+page.svelte` |
| Member detail page | Partial | `/src/routes/political/member/[name]/+page.svelte` |
| PoliticalTradeCard | Done | `/src/lib/components/PoliticalTradeCard.svelte` |
| Backend API | Done | `/backend/src/routes/political.js` |
| Finnhub integration | Done | `/backend/src/services/politicalTracker.js` |
| Database schema | Done | `schema.sql` (lines 150-176) |
| Trade alerts | Done | Watchlist integration |

### What's Missing
1. **Politicians List Page** - Two-column House/Senate directory (as shown in design)
2. **Enhanced Member Detail** - Stocks owned cards, trade timeline table
3. **AI Portraits** - Pencil-sketch style portraits for all members
4. **Insider Trading Section** - Corporate insider trades via FMP API
5. **Company Logos** - Stock logos in member detail view
6. **Charts & Visualizations** - Trading patterns (optional enhancement)

---

## Target Feature Set (Based on Requirements)

### Senate Features
- [ ] Latest Senate Financial Disclosures
- [ ] Senate Trading Activity (filtered view)
- [ ] Senate Trades By Member Name
- [ ] Senate Members Directory

### House Features
- [ ] Latest House Financial Disclosures
- [ ] U.S. House Trades (filtered view)
- [ ] House Trades By Member Name
- [ ] House Members Directory

### Insider Trading (Corporate)
- [ ] Latest Insider Trading
- [ ] Search Insider Trades
- [ ] Search by Reporting Name
- [ ] Transaction Types Filter
- [ ] Insider Trade Statistics

---

## Implementation Plan

### Phase 1: Route Structure & Navigation
**Files to Create:**
```
src/routes/political/
  +page.svelte              (exists - enhance)
  senate/
    +page.svelte            (Senate trades)
  house/
    +page.svelte            (House trades)
  members/
    +page.svelte            (All members directory)
  insider/
    +page.svelte            (Insider trading main)
    [name]/+page.svelte     (Insider by reporting name)
  member/[name]/
    +page.svelte            (exists - enhance with charts)
```

**Navigation Update:**
- Add sub-navigation within `/political` layout
- Tabs: All | Senate | House | Members | Insider Trading

### Phase 2: Members Directory Page
**File:** `/src/routes/political/members/+page.svelte`

**Features:**
- Grid view of all members with portraits
- Filter by: Chamber (Senate/House), Party, State
- Search by name
- Click -> member detail page
- Show trade count badge

**UI Components Needed:**
- `MemberCard.svelte` - Portrait, name, party badge, state, trade count
- `MemberGrid.svelte` - Responsive grid layout
- `ChamberFilter.svelte` - Senate/House toggle

### Phase 3: Enhanced Member Detail Page
**File:** `/src/routes/political/member/[name]/+page.svelte`

**Add Chart.js Visualizations:**
1. **Trading Activity Timeline** - Bar chart showing trades over time
2. **Sector Breakdown** - Doughnut chart of traded sectors
3. **Transaction Type Split** - Pie chart (Buy vs Sell)
4. **Top Traded Stocks** - Horizontal bar chart

**Enhanced Stats:**
- Total portfolio value (estimated from trades)
- Most active trading periods
- Average reporting delay
- Sector preferences

### Phase 4: Senate & House Dedicated Pages
**Files:**
- `/src/routes/political/senate/+page.svelte`
- `/src/routes/political/house/+page.svelte`

**Features:**
- Pre-filtered trades by chamber
- Chamber-specific stats (total trades, top traders)
- Recent disclosures
- Most traded stocks in this chamber

### Phase 5: Insider Trading Section (New)
**Backend Changes:**
- Add FMP insider trading API integration
- New endpoints: `/api/insider/trades`, `/api/insider/search`

**Frontend:**
- `/src/routes/political/insider/+page.svelte` - Latest insider trades
- Search by company, reporting name
- Transaction type filter
- Statistics dashboard

---

## Component Architecture

### New Components to Create
```
src/lib/components/
  political/
    MemberCard.svelte         - Member portrait card
    MemberGrid.svelte         - Grid layout for members
    ChamberTabs.svelte        - Senate/House/All tabs
    TradingChart.svelte       - Chart.js trading visualization
    SectorBreakdown.svelte    - Doughnut chart for sectors
    TradeTimeline.svelte      - Activity over time
    TradeStats.svelte         - Statistics cards
    InsiderTradeCard.svelte   - Corporate insider trade display
```

### Existing Components to Enhance
- `PoliticalTradeCard.svelte` - Add more detail, link to member

---

## Backend API Additions

### New Endpoints Needed
```javascript
// Congress member analytics
GET /api/political/officials/:name/stats
  - Returns: trade_count, buy_count, sell_count, sectors, top_stocks

// Chamber-specific
GET /api/political/senate/trades
GET /api/political/house/trades
GET /api/political/senate/stats
GET /api/political/house/stats

// Insider trading (new service)
GET /api/insider/trades
  - Query: ticker, name, transactionType, limit
GET /api/insider/search
  - Query: query (company or person name)
GET /api/insider/stats
  - Returns: aggregate statistics
```

### Service Changes
**File:** `/backend/src/services/politicalTracker.js`
- Add `getOfficialStats(name)` function
- Add `getChamberStats(chamber)` function

**New File:** `/backend/src/services/insiderTracker.js`
- FMP API integration for insider trades
- Cache management
- Search functionality

---

## Database Changes

### New Tables (if needed)
```sql
-- For caching insider trades
CREATE TABLE insider_trades (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  reporting_name VARCHAR(255),
  reporting_cik VARCHAR(20),
  transaction_type VARCHAR(50),
  transaction_date DATE,
  shares_traded BIGINT,
  price_per_share DECIMAL(10,2),
  value BIGINT,
  shares_owned_after BIGINT,
  filing_date DATE,
  form_type VARCHAR(20),
  source_url VARCHAR(500),
  retrieved_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insider_trades_ticker ON insider_trades(ticker);
CREATE INDEX idx_insider_trades_name ON insider_trades(reporting_name);
CREATE INDEX idx_insider_trades_date ON insider_trades(transaction_date DESC);
```

---

## UI/UX Design Guidelines

### Color Scheme
- **Republican**: Red badge `bg-red-100 text-red-800`
- **Democrat**: Blue badge `bg-blue-100 text-blue-800`
- **Buy trades**: Green indicator
- **Sell trades**: Red indicator
- **Insider Buy**: Green
- **Insider Sell**: Red

### Layout Pattern
- Use existing newspaper aesthetic
- Cards with shadows for members
- Tables for trade listings
- Chart.js for visualizations (consistent with ticker page)

### Responsive Design
- Mobile: Stack cards vertically
- Tablet: 2-column grid
- Desktop: 3-4 column grid for members

---

## Implementation Order (Todo List)

### Phase 1: Politicians List Page (Priority: HIGH)
- [ ] Create `/src/routes/political/members/+page.svelte`
- [ ] Build two-column layout (House | Senate)
- [ ] Create `MemberRow.svelte` component (portrait, name, "View Trades" link)
- [ ] Add member count badges ("House (231)", "Senate (59)")
- [ ] Implement search/filter functionality
- [ ] Style with newspaper aesthetic (dotted dividers)

### Phase 2: Enhanced Member Detail Page (Priority: HIGH)
- [ ] Redesign `/src/routes/political/member/[name]/+page.svelte`
- [ ] Add large AI portrait section
- [ ] Create "Stocks Owned at One Point" cards with company logos
- [ ] Build "Trade Timeline" table (Stock, Type, Amount Range, Date)
- [ ] Color-code transaction types (Sale = red, Purchase = green)
- [ ] Fetch company logos from existing profile API

### Phase 3: AI Portraits (Priority: HIGH)
- [ ] Generate pencil-sketch style portraits for congress members
- [ ] Store in `/static/portraits/` directory
- [ ] Naming convention: `{name-slug}.png`
- [ ] Update backend to serve portrait URLs
- [ ] Add fallback for missing portraits (initials)

### Phase 4: Insider Trading (Priority: MEDIUM) - Parallel
- [ ] Create `/backend/src/services/insiderTracker.js` (FMP API)
- [ ] Add `/backend/src/routes/insider.js` endpoints
- [ ] Create `/src/routes/political/insider/+page.svelte`
- [ ] Build InsiderTradeCard component
- [ ] Add search by company/reporting name
- [ ] Transaction type filtering

### Phase 5: Polish & Integration
- [ ] Update main `/political` navigation
- [ ] Test all routes and data loading
- [ ] Loading states and error handling
- [ ] Mobile responsive testing
- [ ] Dark mode compatibility
- [ ] Performance optimization (caching)

---

## Critical Files Summary

### Frontend (to modify/create)
| File | Action | Priority |
|------|--------|----------|
| `src/routes/political/+page.svelte` | Enhance | High |
| `src/routes/political/+layout.svelte` | Create | High |
| `src/routes/political/members/+page.svelte` | Create | High |
| `src/routes/political/senate/+page.svelte` | Create | Medium |
| `src/routes/political/house/+page.svelte` | Create | Medium |
| `src/routes/political/member/[name]/+page.svelte` | Enhance | High |
| `src/routes/political/insider/+page.svelte` | Create | Medium |
| `src/lib/components/political/MemberCard.svelte` | Create | High |
| `src/lib/components/political/TradingChart.svelte` | Create | High |

### Backend (to modify/create)
| File | Action | Priority |
|------|--------|----------|
| `backend/src/routes/political.js` | Enhance | High |
| `backend/src/services/politicalTracker.js` | Enhance | High |
| `backend/src/services/insiderTracker.js` | Create | Medium |
| `backend/src/routes/insider.js` | Create | Medium |

---

## Success Metrics
- All House and Senate members browsable
- Member pages show trading charts
- Can filter by chamber, party, transaction type
- Insider trading section functional
- Mobile-responsive design
- Dark/light mode support
- Page load < 2 seconds

---

## Notes
- FMP (Financial Modeling Prep) is primary source for congress trades
- FMP (Financial Modeling Prep) for insider trading
- Use existing Chart.js setup from FinancialChart component
- Follow IBM Plex Mono typography
- Match existing newspaper aesthetic
