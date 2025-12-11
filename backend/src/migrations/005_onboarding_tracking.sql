-- Migration: Add onboarding tracking to users table
-- Tracks whether a user has completed the interactive onboarding tour

ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Index for efficiently querying users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_users_onboarding_incomplete
ON users(has_completed_onboarding)
WHERE has_completed_onboarding = FALSE;
