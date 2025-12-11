import { config } from '../config/env.js';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

async function fetchFMP(endpoint) {
  if (!config.fmpApiKey) {
    throw new Error('FMP_API_KEY not configured');
  }

  const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${config.fmpApiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getTreasuryRates() {
  try {
    const data = await fetchFMP('/treasury-rates');

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Get the most recent entry
    const latest = data[0];

    return {
      date: latest.date,
      month1: latest.month1,
      month2: latest.month2,
      month3: latest.month3,
      month6: latest.month6,
      year1: latest.year1,
      year2: latest.year2,
      year3: latest.year3,
      year5: latest.year5,
      year7: latest.year7,
      year10: latest.year10,
      year20: latest.year20,
      year30: latest.year30
    };
  } catch (err) {
    console.error('Treasury rates fetch error:', err.message);
    throw new Error('Failed to fetch treasury rates');
  }
}

export async function getEconomicIndicator(indicator) {
  try {
    const data = await fetchFMP(`/economic-indicators?name=${indicator}`);

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Return the most recent values (last 12 entries for historical context)
    return data.slice(0, 12).map(item => ({
      date: item.date,
      value: item.value
    }));
  } catch (err) {
    console.error(`Economic indicator (${indicator}) fetch error:`, err.message);
    throw new Error(`Failed to fetch ${indicator} data`);
  }
}

export async function getEconomicCalendar(from, to) {
  try {
    const data = await fetchFMP(`/economic-calendar?from=${from}&to=${to}`);

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(item => ({
      date: item.date,
      event: item.event,
      country: item.country,
      actual: item.actual,
      previous: item.previous,
      estimate: item.estimate,
      impact: item.impact
    }));
  } catch (err) {
    console.error('Economic calendar fetch error:', err.message);
    throw new Error('Failed to fetch economic calendar');
  }
}

export async function getAllEconomicIndicators() {
  try {
    const [treasury, gdp, cpi, unemployment] = await Promise.all([
      getTreasuryRates().catch(() => null),
      getEconomicIndicator('GDP').catch(() => null),
      getEconomicIndicator('CPI').catch(() => null),
      getEconomicIndicator('unemploymentRate').catch(() => null)
    ]);

    return {
      treasury,
      gdp: gdp?.[0] || null,
      cpi: cpi?.[0] || null,
      unemployment: unemployment?.[0] || null,
      gdpHistory: gdp || [],
      cpiHistory: cpi || [],
      unemploymentHistory: unemployment || []
    };
  } catch (err) {
    console.error('Economic indicators fetch error:', err.message);
    throw new Error('Failed to fetch economic indicators');
  }
}

export default {
  getTreasuryRates,
  getEconomicIndicator,
  getEconomicCalendar,
  getAllEconomicIndicators
};
