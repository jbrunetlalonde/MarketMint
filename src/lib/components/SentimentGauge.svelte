<script lang="ts">
	interface Props {
		ratingScore?: number | null;
		grades?: Array<{ action: string }>;
		priceTarget?: {
			targetConsensus: number;
			targetHigh?: number;
			targetLow?: number;
		} | null;
		currentPrice?: number | null;
		insiderTrades?: Array<{
			transactionType: string;
			securitiesTransacted?: number;
		}>;
	}

	let {
		ratingScore = null,
		grades = [],
		priceTarget = null,
		currentPrice = null,
		insiderTrades = []
	}: Props = $props();

	// Calculate individual scores (0-100)
	const breakdown = $derived.by(() => {
		// 1. Analyst Rating (0-5 scale -> 0-100)
		let analystScore = 50;
		if (ratingScore !== null && ratingScore !== undefined) {
			analystScore = (ratingScore / 5) * 100;
		}

		// 2. Recent Momentum (upgrades vs downgrades)
		let momentumScore = 50;
		if (grades.length > 0) {
			const upgrades = grades.filter(
				(g) => g.action?.toLowerCase() === 'upgrade'
			).length;
			const downgrades = grades.filter(
				(g) => g.action?.toLowerCase() === 'downgrade'
			).length;
			const total = upgrades + downgrades || 1;
			momentumScore = ((upgrades - downgrades) / total + 1) * 50;
		}

		// 3. Price Target Upside/Downside
		let targetScore = 50;
		if (priceTarget?.targetConsensus && currentPrice && currentPrice > 0) {
			const upside =
				((priceTarget.targetConsensus - currentPrice) / currentPrice) * 100;
			// Clamp upside between -50% and +50% for scoring
			const clampedUpside = Math.max(-50, Math.min(50, upside));
			targetScore = clampedUpside + 50;
		}

		// 4. Insider Activity (net buying vs selling)
		let insiderScore = 50;
		if (insiderTrades.length > 0) {
			let netBuying = 0;
			for (const trade of insiderTrades) {
				const type = trade.transactionType?.toLowerCase() || '';
				if (type.includes('buy') || type === 'p-purchase') {
					netBuying += 1;
				} else if (type.includes('sell') || type === 's-sale') {
					netBuying -= 1;
				}
			}
			// Normalize: more buying = higher score
			const ratio = netBuying / insiderTrades.length;
			insiderScore = (ratio + 1) * 50;
		}

		return {
			analystRating: Math.round(analystScore),
			recentMomentum: Math.round(momentumScore),
			priceTarget: Math.round(targetScore),
			insiderActivity: Math.round(insiderScore)
		};
	});

	// Weighted average score
	const score = $derived(
		Math.round(
			breakdown.analystRating * 0.4 +
				breakdown.recentMomentum * 0.3 +
				breakdown.priceTarget * 0.2 +
				breakdown.insiderActivity * 0.1
		)
	);

	// Label based on score
	const label = $derived(() => {
		if (score >= 70) return 'Very Bullish';
		if (score >= 55) return 'Bullish';
		if (score >= 45) return 'Neutral';
		if (score >= 30) return 'Bearish';
		return 'Very Bearish';
	});

	// Color based on score
	const gaugeColor = $derived(() => {
		if (score >= 70) return '#059669';
		if (score >= 55) return '#10b981';
		if (score >= 45) return '#f59e0b';
		if (score >= 30) return '#f97316';
		return '#dc2626';
	});

	// Needle rotation: 0 = far left (-90deg), 100 = far right (90deg)
	const needleRotation = $derived(() => {
		const angle = (score / 100) * 180 - 90;
		return angle;
	});

	// Check if we have enough data
	const hasData = $derived(
		ratingScore !== null ||
			grades.length > 0 ||
			priceTarget !== null ||
			insiderTrades.length > 0
	);

	let showBreakdown = $state(false);
</script>

<div class="sentiment-gauge">
	{#if !hasData}
		<p class="no-data">Insufficient data for sentiment analysis</p>
	{:else}
		<div class="gauge-wrapper">
			<svg viewBox="0 0 200 110" class="gauge-svg">
				<!-- Background arc segments -->
				<path
					d="M 20 100 A 80 80 0 0 1 50 34"
					fill="none"
					stroke="#dc2626"
					stroke-width="12"
					stroke-linecap="round"
				/>
				<path
					d="M 50 34 A 80 80 0 0 1 85 12"
					fill="none"
					stroke="#f97316"
					stroke-width="12"
				/>
				<path
					d="M 85 12 A 80 80 0 0 1 115 12"
					fill="none"
					stroke="#f59e0b"
					stroke-width="12"
				/>
				<path
					d="M 115 12 A 80 80 0 0 1 150 34"
					fill="none"
					stroke="#10b981"
					stroke-width="12"
				/>
				<path
					d="M 150 34 A 80 80 0 0 1 180 100"
					fill="none"
					stroke="#059669"
					stroke-width="12"
					stroke-linecap="round"
				/>

				<!-- Center circle -->
				<circle cx="100" cy="100" r="8" fill="var(--color-ink)" />

				<!-- Needle -->
				<line
					x1="100"
					y1="100"
					x2="100"
					y2="30"
					stroke="var(--color-ink)"
					stroke-width="3"
					stroke-linecap="round"
					transform="rotate({needleRotation()}, 100, 100)"
				/>
			</svg>
		</div>

		<div class="score-display">
			<span class="score-value">{score}</span>
			<span class="score-max">/100</span>
		</div>

		<div class="label-badge" style="background-color: {gaugeColor()}">
			{label()}
		</div>

		<button class="breakdown-toggle" onclick={() => (showBreakdown = !showBreakdown)}>
			{showBreakdown ? 'Hide' : 'Show'} Breakdown
		</button>

		{#if showBreakdown}
			<div class="breakdown">
				<div class="breakdown-row">
					<span class="breakdown-label">Analyst Rating</span>
					<div class="breakdown-bar-container">
						<div
							class="breakdown-bar"
							style="width: {breakdown.analystRating}%; background-color: {breakdown.analystRating >= 50 ? '#10b981' : '#f97316'}"
						></div>
					</div>
					<span class="breakdown-value">{breakdown.analystRating}</span>
				</div>
				<div class="breakdown-row">
					<span class="breakdown-label">Recent Grades</span>
					<div class="breakdown-bar-container">
						<div
							class="breakdown-bar"
							style="width: {breakdown.recentMomentum}%; background-color: {breakdown.recentMomentum >= 50 ? '#10b981' : '#f97316'}"
						></div>
					</div>
					<span class="breakdown-value">{breakdown.recentMomentum}</span>
				</div>
				<div class="breakdown-row">
					<span class="breakdown-label">Price Target</span>
					<div class="breakdown-bar-container">
						<div
							class="breakdown-bar"
							style="width: {breakdown.priceTarget}%; background-color: {breakdown.priceTarget >= 50 ? '#10b981' : '#f97316'}"
						></div>
					</div>
					<span class="breakdown-value">{breakdown.priceTarget}</span>
				</div>
				<div class="breakdown-row">
					<span class="breakdown-label">Insider Activity</span>
					<div class="breakdown-bar-container">
						<div
							class="breakdown-bar"
							style="width: {breakdown.insiderActivity}%; background-color: {breakdown.insiderActivity >= 50 ? '#10b981' : '#f97316'}"
						></div>
					</div>
					<span class="breakdown-value">{breakdown.insiderActivity}</span>
				</div>
				<div class="weights-note">
					Weights: Analyst 40%, Grades 30%, Target 20%, Insider 10%
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.sentiment-gauge {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0;
	}

	.no-data {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
		padding: 1rem 0;
	}

	.gauge-wrapper {
		width: 100%;
		max-width: 200px;
	}

	.gauge-svg {
		width: 100%;
		height: auto;
	}

	.score-display {
		display: flex;
		align-items: baseline;
		margin-top: -0.5rem;
	}

	.score-value {
		font-family: var(--font-mono);
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.score-max {
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--color-ink-muted);
	}

	.label-badge {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		margin-top: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.breakdown-toggle {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		margin-top: 0.75rem;
		padding: 0.25rem 0.5rem;
		transition: color 0.15s;
	}

	.breakdown-toggle:hover {
		color: var(--color-ink);
	}

	.breakdown {
		width: 100%;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px dotted var(--color-border);
	}

	.breakdown-row {
		display: grid;
		grid-template-columns: 90px 1fr 30px;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.breakdown-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.breakdown-bar-container {
		height: 6px;
		background: var(--color-newsprint-dark);
		border-radius: 3px;
		overflow: hidden;
	}

	.breakdown-bar {
		height: 100%;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.breakdown-value {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		text-align: right;
		color: var(--color-ink);
	}

	.weights-note {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		color: var(--color-ink-muted);
		text-align: center;
		margin-top: 0.5rem;
	}
</style>
