// Mock financials data for fallback when FMP API is unavailable

export const MOCK_FINANCIALS = {
  AAPL: {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    marketCap: 2780000000000,
    peRatio: 28.5,
    eps: 6.26,
    dividend: 0.96,
    dividendYield: 0.54,
    revenue: 383285000000,
    netIncome: 96995000000,
    profitMargin: 25.31,
    roe: 160.58,
    debtToEquity: 199.42,
    isMock: true
  },
  MSFT: {
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    sector: 'Technology',
    industry: 'Software - Infrastructure',
    marketCap: 2810000000000,
    peRatio: 35.2,
    eps: 10.76,
    dividend: 3.00,
    dividendYield: 0.79,
    revenue: 211915000000,
    netIncome: 72361000000,
    profitMargin: 34.15,
    roe: 38.60,
    debtToEquity: 42.15,
    isMock: true
  }
};

export function getMockFinancials(ticker) {
  if (MOCK_FINANCIALS[ticker]) {
    return MOCK_FINANCIALS[ticker];
  }
  return {
    ticker,
    companyName: `${ticker} Inc.`,
    sector: 'Unknown',
    industry: 'Unknown',
    isMock: true
  };
}
