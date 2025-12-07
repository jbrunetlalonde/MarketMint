import { ApiError } from '../middleware/errorHandler.js';

/**
 * Validate and sanitize pagination parameters
 * @param {string|number} page - Page number
 * @param {string|number} limit - Items per page
 * @param {object} options - Optional config { maxLimit, maxPage }
 * @returns {{ page: number, limit: number }}
 */
export function validatePagination(page, limit, options = {}) {
  const { maxLimit = 500, maxPage = 1000, defaultLimit = 50 } = options;

  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  const safePage = Number.isNaN(parsedPage) || parsedPage < 0 ? 0 : Math.min(parsedPage, maxPage);
  const safeLimit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? defaultLimit : Math.min(parsedLimit, maxLimit);

  return { page: safePage, limit: safeLimit };
}

/**
 * Validate ticker symbol format
 * @param {string} ticker - Ticker symbol
 * @returns {string} - Uppercase validated ticker
 * @throws {ApiError} - If invalid
 */
export function validateTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') {
    throw new ApiError(400, 'Ticker symbol is required');
  }

  const upper = ticker.toUpperCase().trim();

  if (!/^[A-Z]{1,5}$/.test(upper)) {
    throw new ApiError(400, 'Invalid ticker symbol (1-5 letters required)');
  }

  return upper;
}

/**
 * Sanitize string parameter (prevent injection)
 * @param {string} value - Input value
 * @param {number} maxLength - Max allowed length
 * @returns {string|undefined}
 */
export function sanitizeString(value, maxLength = 100) {
  if (!value || typeof value !== 'string') return undefined;
  return value.trim().slice(0, maxLength);
}
