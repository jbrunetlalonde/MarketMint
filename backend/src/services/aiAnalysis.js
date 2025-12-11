import OpenAI from 'openai';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { query } from '../config/database.js';
import fmp from './financialModelPrep.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

// Cache TTL for AI analysis (24 hours)
const ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Check if analysis is cached and not expired
 */
async function getCachedAnalysis(ticker, analysisType) {
  try {
    const result = await query(
      `SELECT data, created_at FROM ai_analysis_cache
       WHERE ticker = $1 AND analysis_type = $2 AND expires_at > NOW()`,
      [ticker.toUpperCase(), analysisType]
    );
    if (result.rows.length > 0) {
      return {
        ...result.rows[0].data,
        cached: true,
        generatedAt: result.rows[0].created_at
      };
    }
    return null;
  } catch (err) {
    console.error('Error checking analysis cache:', err);
    return null;
  }
}

/**
 * Save analysis to cache
 */
async function cacheAnalysis(ticker, analysisType, data) {
  try {
    const expiresAt = new Date(Date.now() + ANALYSIS_CACHE_TTL);
    await query(
      `INSERT INTO ai_analysis_cache (ticker, analysis_type, data, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ticker, analysis_type)
       DO UPDATE SET data = $3, created_at = NOW(), expires_at = $4`,
      [ticker.toUpperCase(), analysisType, JSON.stringify(data), expiresAt]
    );
  } catch (err) {
    console.error('Error caching analysis:', err);
  }
}

/**
 * Generate SWOT analysis for a stock
 */
export async function generateSWOT(ticker, forceRefresh = false) {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const upperTicker = ticker.toUpperCase();

  // Check cache first
  if (!forceRefresh) {
    const cached = await getCachedAnalysis(upperTicker, 'swot');
    if (cached) {
      return cached;
    }
  }

  // Fetch financial data
  const [profile, keyMetrics, incomeStatement, earningsHistory] = await Promise.all([
    fmp.getProfile(upperTicker).catch(() => null),
    fmp.getKeyMetrics(upperTicker, 1).catch(() => []),
    fmp.getIncomeStatement(upperTicker, 'annual', 2).catch(() => []),
    fmp.getEarningsSurprises(upperTicker, 4).catch(() => [])
  ]);

  if (!profile) {
    throw new Error(`Could not find profile for ${upperTicker}`);
  }

  // Build context for OpenAI
  const metrics = keyMetrics?.[0] || {};
  const latestIncome = incomeStatement?.[0] || {};
  const previousIncome = incomeStatement?.[1] || {};

  const revenueGrowth = previousIncome.revenue && latestIncome.revenue
    ? ((latestIncome.revenue - previousIncome.revenue) / previousIncome.revenue * 100).toFixed(1)
    : 'N/A';

  const netMargin = latestIncome.revenue && latestIncome.netIncome
    ? ((latestIncome.netIncome / latestIncome.revenue) * 100).toFixed(1)
    : 'N/A';

  const earningsSurprises = earningsHistory?.slice(0, 4).map(e => ({
    date: e.date,
    actual: e.actualEarningResult,
    estimated: e.estimatedEarning,
    surprise: e.actualEarningResult && e.estimatedEarning
      ? ((e.actualEarningResult - e.estimatedEarning) / Math.abs(e.estimatedEarning) * 100).toFixed(1)
      : null
  })) || [];

  const prompt = `Analyze ${profile.companyName || upperTicker} (${upperTicker}) and provide a concise SWOT analysis based on the following data:

Company: ${profile.companyName || upperTicker}
Sector: ${profile.sector || 'Unknown'}
Industry: ${profile.industry || 'Unknown'}
Description: ${profile.description?.slice(0, 500) || 'N/A'}

Key Metrics:
- Market Cap: $${(profile.mktCap / 1e9).toFixed(2)}B
- P/E Ratio: ${metrics.peRatio?.toFixed(2) || 'N/A'}
- Debt to Equity: ${metrics.debtToEquity?.toFixed(2) || 'N/A'}
- ROE: ${metrics.roe ? (metrics.roe * 100).toFixed(1) + '%' : 'N/A'}
- Current Ratio: ${metrics.currentRatio?.toFixed(2) || 'N/A'}

Financial Performance:
- Revenue Growth (YoY): ${revenueGrowth}%
- Net Profit Margin: ${netMargin}%
- Latest Revenue: $${(latestIncome.revenue / 1e9).toFixed(2)}B
- Latest Net Income: $${(latestIncome.netIncome / 1e9).toFixed(2)}B

Recent Earnings (last 4 quarters):
${earningsSurprises.map(e => `- ${e.date}: ${e.surprise ? (e.surprise > 0 ? '+' : '') + e.surprise + '% surprise' : 'N/A'}`).join('\n')}

Provide a SWOT analysis with:
1. Strengths (2-3 bullet points)
2. Weaknesses (2-3 bullet points)
3. Opportunities (2-3 bullet points)
4. Threats (2-3 bullet points)

Keep each point brief (under 25 words). Focus on actionable insights for investors.

Respond in JSON format:
{
  "strengths": ["point 1", "point 2", "point 3"],
  "weaknesses": ["point 1", "point 2"],
  "opportunities": ["point 1", "point 2"],
  "threats": ["point 1", "point 2"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst providing concise SWOT analysis for stocks. Always respond in valid JSON format.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const swotData = JSON.parse(content);

    // Validate structure
    if (!swotData.strengths || !swotData.weaknesses || !swotData.opportunities || !swotData.threats) {
      throw new Error('Invalid SWOT response structure');
    }

    const result = {
      ticker: upperTicker,
      companyName: profile.companyName || upperTicker,
      strengths: swotData.strengths,
      weaknesses: swotData.weaknesses,
      opportunities: swotData.opportunities,
      threats: swotData.threats
    };

    // Cache the result
    await cacheAnalysis(upperTicker, 'swot', result);

    return {
      ...result,
      cached: false,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('OpenAI SWOT generation error:', err);
    throw new Error(`Failed to generate SWOT analysis: ${err.message}`);
  }
}

/**
 * Explain a financial metric in plain English
 */
export async function explainMetric(metric, value, context = {}) {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Explain what a ${metric} of ${value} means for a stock in simple terms.
${context.ticker ? `Stock: ${context.ticker}` : ''}
${context.industry ? `Industry: ${context.industry}` : ''}

Provide a brief (2-3 sentence) explanation that:
1. Explains what the metric measures
2. Whether this value is generally good, bad, or neutral
3. Any important context (industry norms, etc.)

Keep it simple and accessible for retail investors.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial educator explaining metrics to everyday investors. Be concise and avoid jargon.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    return {
      metric,
      value,
      explanation: completion.choices[0]?.message?.content || 'Unable to generate explanation.'
    };
  } catch (err) {
    console.error('OpenAI explain metric error:', err);
    throw new Error(`Failed to explain metric: ${err.message}`);
  }
}

/**
 * Generate explanation for a financial section with caching
 * @param {string} ticker - Stock ticker
 * @param {string} sectionType - Type: cashflow, income, balance, grades, ratings, insider, congress
 * @param {object} data - Relevant data for the section
 * @param {boolean} forceRefresh - Skip cache if true
 */
export async function explainSection(ticker, sectionType, data, forceRefresh = false) {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const upperTicker = ticker.toUpperCase();
  const cacheKey = `section:${sectionType}`;

  // Check cache first
  if (!forceRefresh) {
    const cached = await getCachedAnalysis(upperTicker, cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Build prompt based on section type
  const prompt = buildSectionPrompt(sectionType, upperTicker, data);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial educator helping retail investors understand stock data. Be concise, clear, and avoid jargon. Focus on what the numbers mean for the investment thesis.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    const explanation = completion.choices[0]?.message?.content;
    if (!explanation) {
      throw new Error('No response from OpenAI');
    }

    const result = {
      ticker: upperTicker,
      sectionType,
      explanation
    };

    // Cache the result
    await cacheAnalysis(upperTicker, cacheKey, result);

    return {
      ...result,
      cached: false,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error(`OpenAI section explanation error (${sectionType}):`, err);
    throw new Error(`Failed to generate explanation: ${err.message}`);
  }
}

/**
 * Build prompt based on section type
 */
function buildSectionPrompt(sectionType, ticker, data) {
  const prompts = {
    cashflow: `Explain this cash flow data for ${ticker} in 3-4 sentences:
Operating Cash Flow: ${formatNumber(data.operatingCashFlow)}
Investing Cash Flow: ${formatNumber(data.investingCashFlow)}
Financing Cash Flow: ${formatNumber(data.financingCashFlow)}
Free Cash Flow: ${formatNumber(data.freeCashFlow)}

Focus on: Is the company generating cash from operations? Are they investing in growth or paying down debt? Is the cash flow healthy?`,

    income: `Explain this income statement data for ${ticker} in 3-4 sentences:
Revenue: ${formatNumber(data.revenue)}
Net Income: ${formatNumber(data.netIncome)}
Gross Margin: ${data.grossMargin}%
Operating Margin: ${data.operatingMargin}%
Net Margin: ${data.netMargin}%

Focus on: Is the company profitable? Are margins healthy? Any concerning trends?`,

    balance: `Explain this balance sheet data for ${ticker} in 3-4 sentences:
Total Assets: ${formatNumber(data.totalAssets)}
Total Liabilities: ${formatNumber(data.totalLiabilities)}
Total Equity: ${formatNumber(data.totalEquity)}
Debt to Equity: ${data.debtToEquity}
Current Ratio: ${data.currentRatio}

Focus on: Is the company's financial position strong? Is debt manageable? Can they meet short-term obligations?`,

    grades: `Explain this analyst grade data for ${ticker} in 3-4 sentences:
Recent Actions: ${data.recentGrades || 'N/A'}
Consensus: ${data.consensus || 'N/A'}
Upgrades (90 days): ${data.upgrades || 0}
Downgrades (90 days): ${data.downgrades || 0}

Focus on: What do Wall Street analysts think? Is sentiment improving or declining? What does the consensus suggest?`,

    ratings: `Explain this rating data for ${ticker} in 3-4 sentences:
Rating Score: ${data.ratingScore}/5
Recommendation: ${data.recommendation}
DCF Value: ${formatNumber(data.dcfValue)}
Current Price: ${formatNumber(data.currentPrice)}

Focus on: Is the stock fairly valued? What does the rating suggest about buy/sell/hold? How does DCF compare to price?`,

    insider: `Explain this insider trading data for ${ticker} in 3-4 sentences:
Buy Transactions: ${data.buyCount || 0} (${formatNumber(data.buyValue)})
Sell Transactions: ${data.sellCount || 0} (${formatNumber(data.sellValue)})
Net Position: ${formatNumber(data.netValue)}

Focus on: Are insiders buying or selling? What does this typically signal about management confidence? Any red flags?`,

    congress: `Explain this congressional trading data for ${ticker} in 3-4 sentences:
Recent Trades: ${data.tradeCount || 0}
Buy/Sell: ${data.buys || 0} buys, ${data.sells || 0} sells
Notable Traders: ${data.traders || 'N/A'}

Focus on: Are politicians trading this stock? What might this indicate? Note any potential information advantages.`
  };

  return prompts[sectionType] || `Explain the following data for ${ticker}:\n${JSON.stringify(data, null, 2)}`;
}

/**
 * Format number for display in prompts
 */
function formatNumber(value) {
  if (value == null) return 'N/A';
  const num = Number(value);
  if (isNaN(num)) return 'N/A';
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

// Cache TTL for article summaries (7 days - articles don't change)
const SUMMARY_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a hash for cache key from URL or text
 */
function generateCacheKey(url, text) {
  const content = url || text.slice(0, 500);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Get cached article summary
 */
async function getCachedSummary(cacheKey) {
  try {
    const result = await query(
      `SELECT data, created_at FROM ai_analysis_cache
       WHERE ticker = $1 AND analysis_type = 'article_summary' AND expires_at > NOW()`,
      [cacheKey]
    );
    if (result.rows.length > 0) {
      return {
        ...result.rows[0].data,
        cached: true,
        generatedAt: result.rows[0].created_at
      };
    }
    return null;
  } catch (err) {
    console.error('Error checking summary cache:', err);
    return null;
  }
}

/**
 * Cache article summary
 */
async function cacheSummary(cacheKey, data) {
  try {
    const expiresAt = new Date(Date.now() + SUMMARY_CACHE_TTL);
    await query(
      `INSERT INTO ai_analysis_cache (ticker, analysis_type, data, expires_at)
       VALUES ($1, 'article_summary', $2, $3)
       ON CONFLICT (ticker, analysis_type)
       DO UPDATE SET data = $2, created_at = NOW(), expires_at = $3`,
      [cacheKey, JSON.stringify(data), expiresAt]
    );
  } catch (err) {
    console.error('Error caching summary:', err);
  }
}

/**
 * Summarize article content with caching
 */
export async function summarizeArticle(text, title = '', url = null) {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  if (!text || text.trim().length < 100) {
    throw new Error('Article text is too short to summarize');
  }

  // Check cache first
  const cacheKey = generateCacheKey(url, text);
  const cached = await getCachedSummary(cacheKey);
  if (cached) {
    return cached;
  }

  const prompt = `Summarize the following news article in 3-4 sentences. Focus on the key facts, implications, and any market-relevant information.

${title ? `Title: ${title}\n\n` : ''}Article:
${text.slice(0, 6000)}

Provide a clear, factual summary that helps readers quickly understand the main points.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial news analyst providing concise article summaries for investors. Be factual, clear, and focus on market implications.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const result = {
      summary: completion.choices[0]?.message?.content || 'Unable to generate summary.',
      title: title || null
    };

    // Cache the result
    await cacheSummary(cacheKey, result);

    return {
      ...result,
      cached: false,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('OpenAI summarize error:', err);
    throw new Error(`Failed to summarize article: ${err.message}`);
  }
}

/**
 * Check if OpenAI is configured
 */
export function isConfigured() {
  return !!config.openaiApiKey;
}

export default {
  generateSWOT,
  explainMetric,
  explainSection,
  summarizeArticle,
  isConfigured
};
