// Re-export from modular API structure for backward compatibility
import { authApi } from './api/auth';
import { quotesApi } from './api/quotes';
import { watchlistApi } from './api/watchlist';
import { financialsApi } from './api/financials';
import { newsApi } from './api/news';
import { politicalApi } from './api/political';
import { insiderApi } from './api/insider';
import { economicApi } from './api/economic';
import { chartsApi } from './api/charts';
import { alertsApi } from './api/alerts';
import { ideasApi } from './api/ideas';
import { portfolioApi } from './api/portfolio';
import { newsletterApi } from './api/newsletter';
import { searchApi } from './api/search';
import { screenerApi } from './api/screener';

// Re-export types
export type { ApiOptions, ApiResponse } from './api/request';

// Compose unified API object for backward compatibility
export const api = {
	// Auth
	login: authApi.login,
	register: authApi.register,
	refresh: authApi.refresh,
	logout: authApi.logout,
	getMe: authApi.getMe,

	// Quotes
	getQuote: quotesApi.getQuote,
	getBulkQuotes: quotesApi.getBulkQuotes,
	getHistory: quotesApi.getHistory,
	getMovers: quotesApi.getMovers,

	// Watchlist
	getWatchlist: watchlistApi.getWatchlist,
	addToWatchlist: watchlistApi.addToWatchlist,
	removeFromWatchlist: watchlistApi.removeFromWatchlist,
	updateWatchlistNotes: watchlistApi.updateWatchlistNotes,

	// Financials
	getFinancials: financialsApi.getFinancials,
	getProfile: financialsApi.getProfile,
	getIncomeStatement: financialsApi.getIncomeStatement,
	getBalanceSheet: financialsApi.getBalanceSheet,
	getCashFlow: financialsApi.getCashFlow,
	getRevenueSegments: financialsApi.getRevenueSegments,
	getInstitutionalHolders: financialsApi.getInstitutionalHolders,
	getHistoricalPrices: financialsApi.getHistoricalPrices,
	getExecutives: financialsApi.getExecutives,
	getRating: financialsApi.getRating,
	getDCF: financialsApi.getDCF,
	getPriceTarget: financialsApi.getPriceTarget,
	getPeers: financialsApi.getPeers,
	getDividends: financialsApi.getDividends,
	getSplits: financialsApi.getSplits,
	getFullFinancials: financialsApi.getFullFinancials,
	getEarningsCalendar: financialsApi.getEarningsCalendar,
	getEarningsHistory: financialsApi.getEarningsHistory,
	getSecFilings: financialsApi.getSecFilings,
	getAnalystGrades: financialsApi.getAnalystGrades,
	getStockNews: financialsApi.getStockNews,
	getKeyMetrics: financialsApi.getKeyMetrics,
	getRevenueSegmentsV2: financialsApi.getRevenueSegmentsV2,

	// News
	getNews: newsApi.getNews,
	getNewsTrending: newsApi.getNewsTrending,
	getTickerNews: newsApi.getTickerNews,
	getNewsSummary: newsApi.getNewsSummary,

	// Political
	getPoliticalTrades: politicalApi.getPoliticalTrades,
	getPoliticalTradesByTicker: politicalApi.getPoliticalTradesByTicker,
	getPoliticalOfficials: politicalApi.getPoliticalOfficials,
	getPoliticalOfficial: politicalApi.getPoliticalOfficial,
	getSenateStats: politicalApi.getSenateStats,
	getHouseStats: politicalApi.getHouseStats,
	getOfficialStats: politicalApi.getOfficialStats,

	// Insider
	getInsiderTrades: insiderApi.getInsiderTrades,
	getInsiderTradesByTicker: insiderApi.getInsiderTradesByTicker,
	getInsiderStats: insiderApi.getInsiderStats,

	// Economic
	getEconomicIndicators: economicApi.getEconomicIndicators,
	getEconomicDashboard: economicApi.getEconomicDashboard,
	getEconomicSeries: economicApi.getEconomicSeries,
	getAvailableEconomicSeries: economicApi.getAvailableEconomicSeries,

	// Charts
	getOHLC: chartsApi.getOHLC,
	getIndicators: chartsApi.getIndicators,
	getDataFreshness: chartsApi.getDataFreshness,

	// Alerts
	getAlerts: alertsApi.getAlerts,
	getUnreadAlertCount: alertsApi.getUnreadAlertCount,
	markAlertRead: alertsApi.markAlertRead,
	markAllAlertsRead: alertsApi.markAllAlertsRead,
	getIdeaAlerts: alertsApi.getIdeaAlerts,
	getUnreadIdeaAlertCount: alertsApi.getUnreadIdeaAlertCount,
	markIdeaAlertRead: alertsApi.markIdeaAlertRead,

	// Ideas
	getTradingIdeas: ideasApi.getTradingIdeas,
	getTradingIdea: ideasApi.getTradingIdea,
	createTradingIdea: ideasApi.createTradingIdea,
	updateTradingIdea: ideasApi.updateTradingIdea,
	closeTradingIdea: ideasApi.closeTradingIdea,
	deleteTradingIdea: ideasApi.deleteTradingIdea,
	getTradingIdeasStats: ideasApi.getTradingIdeasStats,
	exportTradingIdeas: ideasApi.exportTradingIdeas,
	exportTradingIdeasPDF: ideasApi.exportTradingIdeasPDF,

	// Portfolio
	getPortfolio: portfolioApi.getPortfolio,
	getPortfolioSummary: portfolioApi.getPortfolioSummary,
	addPortfolioHolding: portfolioApi.addPortfolioHolding,
	updatePortfolioHolding: portfolioApi.updatePortfolioHolding,
	deletePortfolioHolding: portfolioApi.deletePortfolioHolding,

	// Newsletter
	subscribeNewsletter: newsletterApi.subscribeNewsletter,
	unsubscribeNewsletter: newsletterApi.unsubscribeNewsletter,

	// Search
	searchSymbols: searchApi.searchSymbols,

	// Screener
	screenStocks: screenerApi.screenStocks,
	getScreenerSectors: screenerApi.getSectors,
	getScreenerExchanges: screenerApi.getExchanges
};

export default api;
