import puppeteer from 'puppeteer';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'IBM Plex Mono', monospace;
    background: #f5f2e9;
    color: #1a1a1a;
    padding: 40px;
    font-size: 12px;
    line-height: 1.5;
  }

  .header {
    text-align: center;
    border-bottom: 3px double #1a1a1a;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }

  .header h1 {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .header .subtitle {
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #666;
  }

  .header .date {
    font-size: 11px;
    margin-top: 10px;
    color: #888;
  }

  .stats-row {
    display: flex;
    justify-content: space-between;
    border: 1px solid #1a1a1a;
    margin-bottom: 30px;
    background: #fff;
  }

  .stat-box {
    flex: 1;
    padding: 15px;
    text-align: center;
    border-right: 1px solid #1a1a1a;
  }

  .stat-box:last-child {
    border-right: none;
  }

  .stat-box .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #666;
    margin-bottom: 5px;
  }

  .stat-box .value {
    font-size: 24px;
    font-weight: 700;
  }

  .stat-box .value.positive {
    color: #059669;
  }

  .stat-box .value.negative {
    color: #dc2626;
  }

  .section-title {
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 8px;
    margin-bottom: 15px;
  }

  .ideas-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
    background: #fff;
  }

  .ideas-table th {
    background: #1a1a1a;
    color: #fff;
    padding: 10px 8px;
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .ideas-table td {
    padding: 12px 8px;
    border-bottom: 1px solid #ddd;
    font-size: 11px;
  }

  .ideas-table tr:nth-child(even) {
    background: #f9f9f9;
  }

  .ticker {
    font-weight: 700;
    font-size: 13px;
  }

  .sentiment {
    display: inline-block;
    padding: 2px 8px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sentiment.bullish {
    background: #dcfce7;
    color: #166534;
  }

  .sentiment.bearish {
    background: #fee2e2;
    color: #991b1b;
  }

  .sentiment.neutral {
    background: #f3f4f6;
    color: #374151;
  }

  .status {
    display: inline-block;
    padding: 2px 8px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status.open {
    background: #dbeafe;
    color: #1e40af;
  }

  .status.closed {
    background: #f3f4f6;
    color: #374151;
  }

  .status.target_hit {
    background: #dcfce7;
    color: #166534;
  }

  .status.stopped_out {
    background: #fee2e2;
    color: #991b1b;
  }

  .pnl {
    font-weight: 600;
  }

  .pnl.positive {
    color: #059669;
  }

  .pnl.negative {
    color: #dc2626;
  }

  .price {
    font-weight: 500;
  }

  .thesis-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #ccc;
    text-align: center;
    font-size: 10px;
    color: #888;
  }

  .footer .disclaimer {
    font-style: italic;
    margin-top: 10px;
  }

  .no-data {
    text-align: center;
    padding: 40px;
    color: #666;
    font-style: italic;
  }
`;

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatPrice(price) {
  if (price === null || price === undefined) return '-';
  return `$${parseFloat(price).toFixed(2)}`;
}

function formatPercent(percent) {
  if (percent === null || percent === undefined) return '-';
  const value = parseFloat(percent);
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function generateHTML(ideas, stats) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const openIdeas = ideas.filter(i => i.status === 'open');
  const closedIdeas = ideas.filter(i => i.status !== 'open');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${STYLES}</style>
</head>
<body>
  <div class="header">
    <h1>MarketMint</h1>
    <div class="subtitle">Trading Ideas Report</div>
    <div class="date">${dateStr}</div>
  </div>

  <div class="stats-row">
    <div class="stat-box">
      <div class="label">Total Ideas</div>
      <div class="value">${stats?.totalIdeas || ideas.length}</div>
    </div>
    <div class="stat-box">
      <div class="label">Open Positions</div>
      <div class="value">${stats?.openIdeas || openIdeas.length}</div>
    </div>
    <div class="stat-box">
      <div class="label">Closed Trades</div>
      <div class="value">${stats?.closedIdeas || closedIdeas.length}</div>
    </div>
    <div class="stat-box">
      <div class="label">Win Rate</div>
      <div class="value ${stats?.winRate >= 50 ? 'positive' : 'negative'}">${stats?.winRate ? stats.winRate.toFixed(1) + '%' : '-'}</div>
    </div>
    <div class="stat-box">
      <div class="label">Avg P&L</div>
      <div class="value ${stats?.avgPnlPercent >= 0 ? 'positive' : 'negative'}">${stats?.avgPnlPercent ? formatPercent(stats.avgPnlPercent) : '-'}</div>
    </div>
  </div>

  ${openIdeas.length > 0 ? `
  <div class="section-title">Open Positions</div>
  <table class="ideas-table">
    <thead>
      <tr>
        <th>Ticker</th>
        <th>Sentiment</th>
        <th>Entry</th>
        <th>Target</th>
        <th>Stop</th>
        <th>Thesis</th>
        <th>Created</th>
      </tr>
    </thead>
    <tbody>
      ${openIdeas.map(idea => `
        <tr>
          <td class="ticker">${idea.ticker}</td>
          <td><span class="sentiment ${idea.sentiment || 'neutral'}">${idea.sentiment || 'Neutral'}</span></td>
          <td class="price">${formatPrice(idea.entry_price)}</td>
          <td class="price">${formatPrice(idea.target_price)}</td>
          <td class="price">${formatPrice(idea.stop_loss)}</td>
          <td class="thesis-cell" title="${idea.thesis || ''}">${idea.title || (idea.thesis?.substring(0, 40) + '...') || '-'}</td>
          <td>${formatDate(idea.created_at)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  ${closedIdeas.length > 0 ? `
  <div class="section-title">Closed Trades</div>
  <table class="ideas-table">
    <thead>
      <tr>
        <th>Ticker</th>
        <th>Status</th>
        <th>Entry</th>
        <th>Exit</th>
        <th>P&L</th>
        <th>Thesis</th>
        <th>Closed</th>
      </tr>
    </thead>
    <tbody>
      ${closedIdeas.map(idea => {
        let pnl = null;
        let pnlPercent = null;
        if (idea.entry_price && idea.actual_exit_price) {
          if (idea.sentiment === 'bearish') {
            pnl = idea.entry_price - idea.actual_exit_price;
          } else {
            pnl = idea.actual_exit_price - idea.entry_price;
          }
          pnlPercent = (pnl / idea.entry_price) * 100;
        }
        return `
        <tr>
          <td class="ticker">${idea.ticker}</td>
          <td><span class="status ${idea.status}">${idea.status.replace('_', ' ')}</span></td>
          <td class="price">${formatPrice(idea.entry_price)}</td>
          <td class="price">${formatPrice(idea.actual_exit_price)}</td>
          <td class="pnl ${pnlPercent >= 0 ? 'positive' : 'negative'}">${formatPercent(pnlPercent)}</td>
          <td class="thesis-cell" title="${idea.thesis || ''}">${idea.title || (idea.thesis?.substring(0, 40) + '...') || '-'}</td>
          <td>${idea.closed_at ? formatDate(idea.closed_at) : '-'}</td>
        </tr>
      `}).join('')}
    </tbody>
  </table>
  ` : ''}

  ${ideas.length === 0 ? '<div class="no-data">No trading ideas to display</div>' : ''}

  <div class="footer">
    <div>Generated by MarketMint on ${now.toLocaleString()}</div>
    <div class="disclaimer">This report is for personal record-keeping only. Past performance does not guarantee future results.</div>
  </div>
</body>
</html>
  `;
}

export async function generatePDF(ideas, stats = null) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const html = generateHTML(ideas, stats);

    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return pdf;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default {
  generatePDF
};
