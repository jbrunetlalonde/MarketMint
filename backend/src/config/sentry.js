import * as Sentry from '@sentry/node';
import { config } from './env.js';

export function initializeSentry(app) {
  if (!config.sentryDsn) {
    console.log('Sentry DSN not configured, error monitoring disabled');
    return false;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    sampleRate: 1.0,
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration({ app })
    ],
    beforeSend(event, hint) {
      // Don't send 4xx errors to Sentry
      if (hint.originalException?.statusCode && hint.originalException.statusCode < 500) {
        return null;
      }
      return event;
    }
  });

  return true;
}

// Sentry request handler (must be first middleware)
export function sentryRequestHandler() {
  if (!config.sentryDsn) {
    return (req, res, next) => next();
  }
  return Sentry.expressRequestHandler();
}

// Sentry error handler (must be before other error handlers)
export function sentryErrorHandler() {
  if (!config.sentryDsn) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.expressErrorHandler();
}

// Manually capture an exception
export function captureException(error, context = {}) {
  if (!config.sentryDsn) return;
  Sentry.captureException(error, { extra: context });
}

// Manually capture a message
export function captureMessage(message, level = 'info', context = {}) {
  if (!config.sentryDsn) return;
  Sentry.captureMessage(message, { level, extra: context });
}

export default {
  initializeSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureException,
  captureMessage
};
