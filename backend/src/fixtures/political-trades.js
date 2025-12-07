// Mock political trades data for fallback when API is unavailable

function getPortraitUrl(name, chamber) {
  const filename = name.toLowerCase().replace(/\s+/g, '-');
  return `/portraits/${chamber}-${filename}.png`;
}

export const MOCK_TRADES = [
  {
    id: 1,
    officialName: 'Tommy Tuberville',
    party: 'Republican',
    title: 'Senator',
    state: 'AL',
    ticker: 'NVDA',
    assetDescription: 'NVIDIA Corporation - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-12-01',
    reportedDate: '2024-12-04',
    amountDisplay: '$500K - $1M',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Tommy Tuberville', 'senate')
  },
  {
    id: 2,
    officialName: 'Mark Kelly',
    party: 'Democrat',
    title: 'Senator',
    state: 'AZ',
    ticker: 'MSFT',
    assetDescription: 'Microsoft Corporation - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-28',
    reportedDate: '2024-12-02',
    amountDisplay: '$100K - $250K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Mark Kelly', 'senate')
  },
  {
    id: 3,
    officialName: 'Marco Rubio',
    party: 'Republican',
    title: 'Senator',
    state: 'FL',
    ticker: 'AAPL',
    assetDescription: 'Apple Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-25',
    reportedDate: '2024-11-30',
    amountDisplay: '$50K - $100K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Marco Rubio', 'senate')
  },
  {
    id: 4,
    officialName: 'Elizabeth Warren',
    party: 'Democrat',
    title: 'Senator',
    state: 'MA',
    ticker: 'TSLA',
    assetDescription: 'Tesla Inc - Common Stock',
    transactionType: 'SELL',
    transactionDate: '2024-11-22',
    reportedDate: '2024-11-28',
    amountDisplay: '$250K - $500K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Elizabeth Warren', 'senate')
  },
  {
    id: 5,
    officialName: 'Chuck Schumer',
    party: 'Democrat',
    title: 'Senator',
    state: 'NY',
    ticker: 'GOOGL',
    assetDescription: 'Alphabet Inc Class A - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-20',
    reportedDate: '2024-11-26',
    amountDisplay: '$15K - $50K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Chuck Schumer', 'senate')
  },
  {
    id: 6,
    officialName: 'Mitch McConnell',
    party: 'Republican',
    title: 'Senator',
    state: 'KY',
    ticker: 'BA',
    assetDescription: 'Boeing Company - Common Stock',
    transactionType: 'SELL',
    transactionDate: '2024-11-18',
    reportedDate: '2024-11-24',
    amountDisplay: '$100K - $250K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Mitch McConnell', 'senate')
  },
  {
    id: 7,
    officialName: 'Nancy Mace',
    party: 'Republican',
    title: 'Representative',
    state: 'SC',
    ticker: 'META',
    assetDescription: 'Meta Platforms Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-15',
    reportedDate: '2024-11-22',
    amountDisplay: '$50K - $100K',
    chamber: 'house',
    portraitUrl: getPortraitUrl('Nancy Mace', 'house')
  },
  {
    id: 8,
    officialName: 'Josh Gottheimer',
    party: 'Democrat',
    title: 'Representative',
    state: 'NJ',
    ticker: 'AMZN',
    assetDescription: 'Amazon.com Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-12',
    reportedDate: '2024-11-19',
    amountDisplay: '$250K - $500K',
    chamber: 'house',
    portraitUrl: getPortraitUrl('Josh Gottheimer', 'house')
  },
  {
    id: 9,
    officialName: 'Tim Scott',
    party: 'Republican',
    title: 'Senator',
    state: 'SC',
    ticker: 'JPM',
    assetDescription: 'JPMorgan Chase & Co - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-10',
    reportedDate: '2024-11-17',
    amountDisplay: '$15K - $50K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Tim Scott', 'senate')
  },
  {
    id: 10,
    officialName: 'Rand Paul',
    party: 'Republican',
    title: 'Senator',
    state: 'KY',
    ticker: 'NVDA',
    assetDescription: 'NVIDIA Corporation - Common Stock',
    transactionType: 'SELL',
    transactionDate: '2024-11-08',
    reportedDate: '2024-11-15',
    amountDisplay: '$1M - $5M',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Rand Paul', 'senate')
  },
  {
    id: 11,
    officialName: 'Amy Klobuchar',
    party: 'Democrat',
    title: 'Senator',
    state: 'MN',
    ticker: 'AAPL',
    assetDescription: 'Apple Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-05',
    reportedDate: '2024-11-12',
    amountDisplay: '$50K - $100K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Amy Klobuchar', 'senate')
  },
  {
    id: 12,
    officialName: 'Dan Crenshaw',
    party: 'Republican',
    title: 'Representative',
    state: 'TX',
    ticker: 'XOM',
    assetDescription: 'Exxon Mobil Corporation - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-02',
    reportedDate: '2024-11-10',
    amountDisplay: '$100K - $250K',
    chamber: 'house',
    portraitUrl: getPortraitUrl('Dan Crenshaw', 'house')
  }
];

export function getMockTrades(options = {}) {
  const { party, ticker, chamber, transactionType, limit = 50 } = options;

  let trades = [...MOCK_TRADES];

  if (party) {
    trades = trades.filter(t => t.party.toLowerCase().includes(party.toLowerCase()));
  }

  if (ticker) {
    trades = trades.filter(t => t.ticker.toUpperCase() === ticker.toUpperCase());
  }

  if (chamber) {
    trades = trades.filter(t => t.chamber === chamber.toLowerCase());
  }

  if (transactionType) {
    trades = trades.filter(t => t.transactionType === transactionType.toUpperCase());
  }

  return trades.slice(0, Number(limit)).map(t => ({ ...t, isMock: true }));
}
