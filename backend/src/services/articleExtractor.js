import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';
import { query } from '../config/database.js';

// Memory cache for hot articles
const memoryCache = new Map();
const MEMORY_TTL = 300000; // 5 minutes
const ARTICLE_CACHE_TTL_DAYS = 7;

// Video source patterns - URLs that are video content
const VIDEO_PATTERNS = [
  // Video platforms
  /youtube\.com\/watch/i,
  /youtube\.com\/shorts\//i,  // YouTube Shorts
  /youtu\.be\//i,
  /vimeo\.com\/\d+/i,
  /dailymotion\.com\/video/i,
  /twitch\.tv\//i,
  /tiktok\.com\//i,
  // News video sections
  /cnbc\.com\/video/i,
  /bloomberg\.com\/news\/videos/i,
  /reuters\.com\/video/i,
  /foxbusiness\.com\/video/i,
  /foxnews\.com\/video/i,
  /cnn\.com\/videos/i,
  /msnbc\.com\/.*\/watch\//i,
  /yahoo\.com\/.*\/video/i,
  /finance\.yahoo\.com\/video/i,
  /benzinga\.com\/.*video/i,
  /marketwatch\.com\/video/i,
  // Podcast/audio
  /podcasts\.apple\.com/i,
  /spotify\.com\/episode/i,
  /anchor\.fm/i
];

/**
 * Check if URL is a video source
 */
function isVideoSource(url) {
  return VIDEO_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Extract video platform name from URL
 */
function getVideoPlatform(url) {
  if (/youtube|youtu\.be/i.test(url)) return 'YouTube';
  if (/vimeo/i.test(url)) return 'Vimeo';
  if (/cnbc/i.test(url)) return 'CNBC Video';
  if (/bloomberg/i.test(url)) return 'Bloomberg Video';
  if (/reuters/i.test(url)) return 'Reuters Video';
  if (/foxbusiness/i.test(url)) return 'Fox Business Video';
  if (/foxnews/i.test(url)) return 'Fox News Video';
  if (/cnn/i.test(url)) return 'CNN Video';
  if (/yahoo/i.test(url)) return 'Yahoo Video';
  if (/spotify|anchor/i.test(url)) return 'Podcast';
  if (/podcasts\.apple/i.test(url)) return 'Apple Podcasts';
  return 'Video';
}

// Stopwords for keyword extraction
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'stock', 'stocks', 'share', 'shares', 'market', 'markets', 'price',
  'says', 'said', 'could', 'would', 'will', 'can', 'may', 'might',
  'this', 'that', 'these', 'those', 'it', 'its', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'more', 'most', 'some',
  'into', 'over', 'after', 'before', 'between', 'under', 'again',
  'than', 'about', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'other', 'such', 'only', 'own',
  'same', 'so', 'just', 'now', 'also', 'very', 'new', 'first', 'last'
]);

function getMemoryCache(key) {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
}

function setMemoryCache(key, data, ttlMs = MEMORY_TTL) {
  memoryCache.set(key, { data, expires: Date.now() + ttlMs });
}

function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function extractKeywords(title) {
  if (!title) return [];

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word))
    .slice(0, 10);
}

function calculateReadingTime(wordCount) {
  return Math.ceil(wordCount / 200); // Average reading speed
}

async function getArticleFromDB(urlHash) {
  try {
    const result = await query(
      `SELECT * FROM extracted_articles
       WHERE url_hash = $1 AND cache_expires_at > NOW()`,
      [urlHash]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Article DB cache error:', error.message);
    return null;
  }
}

async function saveArticleToDB(article) {
  const expiresAt = new Date(Date.now() + ARTICLE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    const result = await query(
      `INSERT INTO extracted_articles
       (original_url, url_hash, title, content, excerpt, author, site_name,
        published_date, word_count, reading_time_minutes, ticker, keywords,
        extraction_status, extraction_error, extracted_at, cache_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (original_url) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         excerpt = EXCLUDED.excerpt,
         author = EXCLUDED.author,
         site_name = EXCLUDED.site_name,
         word_count = EXCLUDED.word_count,
         reading_time_minutes = EXCLUDED.reading_time_minutes,
         extraction_status = EXCLUDED.extraction_status,
         extraction_error = EXCLUDED.extraction_error,
         extracted_at = EXCLUDED.extracted_at,
         cache_expires_at = EXCLUDED.cache_expires_at
       RETURNING id`,
      [
        article.originalUrl,
        article.urlHash,
        article.title,
        article.content,
        article.excerpt,
        article.author,
        article.siteName,
        article.publishedDate,
        article.wordCount,
        article.readingTimeMinutes,
        article.ticker,
        article.keywords,
        article.extractionStatus,
        article.extractionError,
        new Date(),
        expiresAt
      ]
    );
    return result.rows[0]?.id;
  } catch (error) {
    console.error('Article DB save error:', error.message);
    return null;
  }
}

async function fetchAndExtract(url) {
  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
  };

  const response = await fetch(url, {
    headers: fetchHeaders,
    redirect: 'follow',
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  // Check for paywall indicators
  const paywallIndicators = [
    'subscribe to read', 'subscription required', 'premium content',
    'sign in to continue', 'login to read', 'members only'
  ];
  const htmlLower = html.toLowerCase();
  const isPaywalled = paywallIndicators.some(indicator => htmlLower.includes(indicator));

  if (isPaywalled) {
    throw new Error('PAYWALL: Article is behind a paywall');
  }

  // Parse with jsdom
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Extract with Readability
  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.length < 200) {
    throw new Error('EXTRACTION_FAILED: Could not extract article content');
  }

  return {
    title: article.title,
    content: article.content, // HTML content
    textContent: article.textContent, // Plain text
    excerpt: article.excerpt || article.textContent.substring(0, 200) + '...',
    author: article.byline,
    siteName: article.siteName,
    length: article.length
  };
}

export async function extractArticle(url, options = {}) {
  const { ticker = null, originalTitle = null, fallbackContent = null } = options;

  // 0. Check if URL is a video source - skip extraction entirely
  if (isVideoSource(url)) {
    return {
      originalUrl: url,
      title: originalTitle || 'Video Content',
      content: null,
      excerpt: null,
      siteName: getVideoPlatform(url),
      extractionStatus: 'video',
      isVideo: true,
      ticker
    };
  }

  const urlHash = hashUrl(url);
  const cacheKey = `article:${urlHash}`;

  // 1. Memory cache
  const memCached = getMemoryCache(cacheKey);
  if (memCached) return memCached;

  // 2. Database cache
  const dbCached = await getArticleFromDB(urlHash);
  if (dbCached) {
    const formatted = formatArticle(dbCached);
    setMemoryCache(cacheKey, formatted);
    return formatted;
  }

  // 3. Extract from URL
  try {
    const extracted = await fetchAndExtract(url);
    const keywords = extractKeywords(extracted.title || originalTitle);
    const wordCount = extracted.textContent.split(/\s+/).length;

    const article = {
      originalUrl: url,
      urlHash,
      title: extracted.title || originalTitle,
      content: extracted.content,
      excerpt: extracted.excerpt,
      author: extracted.author,
      siteName: extracted.siteName,
      publishedDate: null, // Could parse from page if available
      wordCount,
      readingTimeMinutes: calculateReadingTime(wordCount),
      ticker,
      keywords,
      extractionStatus: 'success',
      extractionError: null
    };

    const id = await saveArticleToDB(article);
    const result = { ...article, id, extractionStatus: 'success' };
    setMemoryCache(cacheKey, result);
    return result;

  } catch (error) {
    console.error(`Article extraction failed for ${url}:`, error.message);

    // Save failed extraction to prevent repeated attempts
    const failedArticle = {
      originalUrl: url,
      urlHash,
      title: originalTitle,
      content: fallbackContent,
      excerpt: fallbackContent?.substring(0, 200),
      author: null,
      siteName: null,
      publishedDate: null,
      wordCount: fallbackContent ? fallbackContent.split(/\s+/).length : 0,
      readingTimeMinutes: 1,
      ticker,
      keywords: extractKeywords(originalTitle),
      extractionStatus: error.message.startsWith('PAYWALL') ? 'blocked' : 'failed',
      extractionError: error.message
    };

    await saveArticleToDB(failedArticle);

    return {
      ...failedArticle,
      extractionStatus: failedArticle.extractionStatus
    };
  }
}

export async function getRelatedArticles(articleId, limit = 5) {
  try {
    // Get the source article's ticker and keywords
    const sourceResult = await query(
      `SELECT ticker, keywords, site_name FROM extracted_articles WHERE id = $1`,
      [articleId]
    );

    if (sourceResult.rows.length === 0) {
      return [];
    }

    const source = sourceResult.rows[0];
    const { ticker, keywords, site_name } = source;

    // Combined query with scoring
    const result = await query(
      `WITH scored_articles AS (
        SELECT
          id, original_url, title, excerpt, site_name, ticker,
          reading_time_minutes, extracted_at,
          CASE
            WHEN ticker = $1 AND site_name = $3 THEN 5
            WHEN ticker = $1 THEN 3
            WHEN site_name = $3 AND ticker IS NOT NULL THEN 2
            WHEN keywords && $2::text[] THEN COALESCE(array_length(keywords & $2::text[], 1), 0)
            ELSE 0
          END as relevance_score
        FROM extracted_articles
        WHERE id != $4
          AND extraction_status = 'success'
          AND (ticker = $1 OR site_name = $3 OR keywords && $2::text[])
      )
      SELECT * FROM scored_articles
      WHERE relevance_score > 0
      ORDER BY relevance_score DESC, extracted_at DESC
      LIMIT $5`,
      [ticker, keywords || [], site_name, articleId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      url: row.original_url,
      title: row.title,
      excerpt: row.excerpt,
      siteName: row.site_name,
      ticker: row.ticker,
      readingTime: row.reading_time_minutes,
      relevanceScore: row.relevance_score
    }));
  } catch (error) {
    console.error('Related articles query error:', error.message);
    return [];
  }
}

export async function getArticleById(id) {
  const cacheKey = `article:id:${id}`;

  const memCached = getMemoryCache(cacheKey);
  if (memCached) return memCached;

  try {
    const result = await query(
      `SELECT * FROM extracted_articles WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const article = formatArticle(result.rows[0]);
    setMemoryCache(cacheKey, article);
    return article;
  } catch (error) {
    console.error('Get article by ID error:', error.message);
    return null;
  }
}

export async function getArticleByNewsId(newsId) {
  // First get the news item from fmp_news_cache
  try {
    const newsResult = await query(
      `SELECT id, url, title, content, ticker FROM fmp_news_cache WHERE id = $1`,
      [newsId]
    );

    if (newsResult.rows.length === 0) {
      return null;
    }

    const newsItem = newsResult.rows[0];

    // Check if we already extracted this URL
    const urlHash = hashUrl(newsItem.url);
    const existingArticle = await getArticleFromDB(urlHash);

    if (existingArticle && existingArticle.extraction_status === 'success') {
      return formatArticle(existingArticle);
    }

    // Extract the article
    return await extractArticle(newsItem.url, {
      ticker: newsItem.ticker,
      originalTitle: newsItem.title,
      fallbackContent: newsItem.content
    });
  } catch (error) {
    console.error('Get article by news ID error:', error.message);
    return null;
  }
}

function formatArticle(row) {
  return {
    id: row.id,
    originalUrl: row.original_url,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    author: row.author,
    siteName: row.site_name,
    publishedDate: row.published_date,
    wordCount: row.word_count,
    readingTimeMinutes: row.reading_time_minutes,
    ticker: row.ticker,
    keywords: row.keywords,
    extractionStatus: row.extraction_status,
    extractionError: row.extraction_error,
    extractedAt: row.extracted_at
  };
}

export default {
  extractArticle,
  getRelatedArticles,
  getArticleById,
  getArticleByNewsId
};
