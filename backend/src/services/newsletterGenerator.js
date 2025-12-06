import newsAggregator from './newsAggregator.js';
import fred from './fredApi.js';
import fmp from './financialModelPrep.js';

// Major indices to track
const MAJOR_INDICES = ['SPY', 'QQQ', 'DIA', 'IWM'];

export async function generateDailyNewsletter() {
  const [marketData, economicData, newsData] = await Promise.all([
    getMarketSummary(),
    getEconomicSummary(),
    newsAggregator.getMarketSummary()
  ]);

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = generateHtmlTemplate({
    date,
    marketData,
    economicData,
    newsData
  });

  const subject = `MarketMint Daily - ${date}`;

  return { subject, html };
}

async function getMarketSummary() {
  const quotes = [];

  for (const ticker of MAJOR_INDICES) {
    try {
      const quote = await fmp.getQuote(ticker);
      if (quote) {
        quotes.push({
          ticker,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changesPercentage
        });
      }
    } catch {
      // Skip failed quotes
    }
  }

  return { indices: quotes };
}

async function getEconomicSummary() {
  try {
    const indicators = await fred.getAllIndicators();
    return {
      fedFunds: indicators.FEDFUNDS?.latest,
      treasury10Y: indicators.DGS10?.latest,
      vix: indicators.VIXCLS?.latest,
      unemployment: indicators.UNRATE?.latest
    };
  } catch {
    return {};
  }
}

function generateHtmlTemplate({ date, marketData, economicData, newsData }) {
  const formatNumber = (num, decimals = 2) =>
    num != null ? num.toFixed(decimals) : 'N/A';

  const formatChange = (change, changePercent) => {
    if (change == null) return '';
    const arrow = change >= 0 ? '+' : '';
    const color = change >= 0 ? '#2d5016' : '#8b0000';
    return `<span style="color: ${color};">${arrow}${formatNumber(change)} (${arrow}${formatNumber(changePercent)}%)</span>`;
  };

  const indicesHtml = marketData.indices?.length > 0
    ? marketData.indices.map(q => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #d4c4a8; font-weight: bold;">${q.ticker}</td>
          <td style="padding: 8px; border-bottom: 1px solid #d4c4a8;">$${formatNumber(q.price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #d4c4a8;">${formatChange(q.change, q.changePercent)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" style="padding: 8px;">Market data unavailable</td></tr>';

  const economicHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #d4c4a8;">Fed Funds Rate</td>
        <td style="padding: 8px; border-bottom: 1px solid #d4c4a8; text-align: right;">${economicData.fedFunds?.value != null ? formatNumber(economicData.fedFunds.value) + '%' : 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #d4c4a8;">10-Year Treasury</td>
        <td style="padding: 8px; border-bottom: 1px solid #d4c4a8; text-align: right;">${economicData.treasury10Y?.value != null ? formatNumber(economicData.treasury10Y.value) + '%' : 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #d4c4a8;">VIX</td>
        <td style="padding: 8px; border-bottom: 1px solid #d4c4a8; text-align: right;">${economicData.vix?.value != null ? formatNumber(economicData.vix.value) : 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px;">Unemployment</td>
        <td style="padding: 8px; text-align: right;">${economicData.unemployment?.value != null ? formatNumber(economicData.unemployment.value) + '%' : 'N/A'}</td>
      </tr>
    </table>
  `;

  const newsHtml = newsData.headlines?.length > 0
    ? newsData.headlines.map(news => `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #d4c4a8;">
          <h3 style="margin: 0 0 5px 0; font-size: 16px;">
            <a href="${news.url}" style="color: #1a1a1a; text-decoration: none;">${news.title}</a>
          </h3>
          <p style="margin: 0; font-size: 12px; color: #666;">
            ${news.source || 'Unknown Source'} | ${news.publishedAt ? new Date(news.publishedAt).toLocaleString() : ''}
          </p>
        </div>
      `).join('')
    : '<p>No news available</p>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MarketMint Daily</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f1e8; font-family: 'IBM Plex Mono', 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f1e8;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #fffef9; border: 2px solid #1a1a1a; max-width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #fffef9; font-size: 28px; letter-spacing: 4px; font-weight: 700;">
                MARKETMINT
              </h1>
              <p style="margin: 5px 0 0 0; color: #d4c4a8; font-size: 12px; letter-spacing: 2px;">
                DAILY MARKET INTELLIGENCE
              </p>
            </td>
          </tr>

          <!-- Date -->
          <tr>
            <td style="padding: 15px; text-align: center; border-bottom: 2px solid #1a1a1a;">
              <p style="margin: 0; font-size: 14px; color: #666;">${date}</p>
            </td>
          </tr>

          <!-- Market Summary -->
          <tr>
            <td style="padding: 20px;">
              <h2 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">
                MARKET SUMMARY
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f5f1e8;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #1a1a1a;">Index</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #1a1a1a;">Price</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #1a1a1a;">Change</th>
                </tr>
                ${indicesHtml}
              </table>
            </td>
          </tr>

          <!-- Economic Indicators -->
          <tr>
            <td style="padding: 20px; background-color: #f5f1e8;">
              <h2 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">
                ECONOMIC INDICATORS
              </h2>
              ${economicHtml}
            </td>
          </tr>

          <!-- News Headlines -->
          <tr>
            <td style="padding: 20px;">
              <h2 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">
                TOP STORIES
              </h2>
              ${newsHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 20px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #d4c4a8; font-size: 12px;">
                MarketMint - Your Daily Market Intelligence
              </p>
              <p style="margin: 0; color: #888; font-size: 11px;">
                <a href="{{unsubscribe_url}}" style="color: #888;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function previewNewsletter() {
  const newsletter = await generateDailyNewsletter();
  return newsletter;
}

export default {
  generateDailyNewsletter,
  previewNewsletter
};
