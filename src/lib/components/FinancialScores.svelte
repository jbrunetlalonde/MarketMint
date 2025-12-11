<script lang="ts">
	interface Props {
		score: {
			piotroskiScore: number | null;
			altmanZScore: number | null;
		} | null;
	}

	let { score }: Props = $props();

	// Piotroski F-Score interpretation (0-9)
	function getPiotroskiLabel(score: number | null): { label: string; color: string } {
		if (score === null) return { label: 'N/A', color: 'muted' };
		if (score >= 7) return { label: 'Strong', color: 'gain' };
		if (score >= 4) return { label: 'Moderate', color: 'neutral' };
		return { label: 'Weak', color: 'loss' };
	}

	// Altman Z-Score interpretation
	// < 1.8 = Distress zone (high bankruptcy risk)
	// 1.8 - 3.0 = Gray zone (uncertain)
	// > 3.0 = Safe zone (low bankruptcy risk)
	function getAltmanLabel(score: number | null): { label: string; color: string } {
		if (score === null) return { label: 'N/A', color: 'muted' };
		if (score > 3) return { label: 'Safe', color: 'gain' };
		if (score >= 1.8) return { label: 'Gray Zone', color: 'neutral' };
		return { label: 'Distress', color: 'loss' };
	}

	const piotroski = $derived(getPiotroskiLabel(score?.piotroskiScore ?? null));
	const altman = $derived(getAltmanLabel(score?.altmanZScore ?? null));

	// Bar width for Piotroski (0-9 scale)
	const piotroskiBarWidth = $derived(() => {
		const val = score?.piotroskiScore;
		if (val === null || val === undefined) return 0;
		return (val / 9) * 100;
	});

	// Bar width for Altman (scaled 0-5 for display, capped)
	const altmanBarWidth = $derived(() => {
		const val = score?.altmanZScore;
		if (val === null || val === undefined) return 0;
		const capped = Math.min(Math.max(val, 0), 5);
		return (capped / 5) * 100;
	});

	// Safe accessors
	const piotroskiValue = $derived(score?.piotroskiScore ?? null);
	const altmanValue = $derived(score?.altmanZScore ?? null);
</script>

<div class="financial-scores">
	<h3 class="section-title">Financial Health</h3>

	<div class="scores-grid">
		<!-- Piotroski F-Score -->
		<div class="score-card">
			<div class="score-header">
				<span class="score-name">Piotroski F-Score</span>
				<span class="score-value">
					{#if piotroskiValue !== null}
						{piotroskiValue}/9
					{:else}
						--
					{/if}
				</span>
			</div>
			<div class="bar-track">
				<div
					class="bar-fill"
					class:gain={piotroski.color === 'gain'}
					class:neutral={piotroski.color === 'neutral'}
					class:loss={piotroski.color === 'loss'}
					style="width: {piotroskiBarWidth()}%"
				></div>
			</div>
			<span
				class="score-label"
				class:gain={piotroski.color === 'gain'}
				class:neutral={piotroski.color === 'neutral'}
				class:loss={piotroski.color === 'loss'}
			>
				{piotroski.label}
			</span>
		</div>

		<!-- Altman Z-Score -->
		<div class="score-card">
			<div class="score-header">
				<span class="score-name">Altman Z-Score</span>
				<span class="score-value">
					{#if altmanValue !== null}
						{altmanValue.toFixed(2)}
					{:else}
						--
					{/if}
				</span>
			</div>
			<div class="bar-track">
				<div
					class="bar-fill"
					class:gain={altman.color === 'gain'}
					class:neutral={altman.color === 'neutral'}
					class:loss={altman.color === 'loss'}
					style="width: {altmanBarWidth()}%"
				></div>
			</div>
			<span
				class="score-label"
				class:gain={altman.color === 'gain'}
				class:neutral={altman.color === 'neutral'}
				class:loss={altman.color === 'loss'}
			>
				{altman.label}
			</span>
		</div>
	</div>
</div>

<style>
	.financial-scores {
		border-top: 1px dotted var(--color-border);
		padding-top: 1.5rem;
		margin-top: 1.5rem;
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink);
		margin-bottom: 0.75rem;
	}

	.scores-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.score-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.75rem;
	}

	.score-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.score-name {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.score-value {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.bar-track {
		height: 6px;
		background: var(--color-newsprint-dark);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.375rem;
	}

	.bar-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.4s ease;
	}

	.bar-fill.gain {
		background: linear-gradient(90deg, var(--color-gain) 0%, #10b981 100%);
	}

	.bar-fill.neutral {
		background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
	}

	.bar-fill.loss {
		background: linear-gradient(90deg, var(--color-loss) 0%, #f87171 100%);
	}

	.score-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.score-label.gain {
		color: var(--color-gain);
	}

	.score-label.neutral {
		color: #f59e0b;
	}

	.score-label.loss {
		color: var(--color-loss);
	}

	.score-label:not(.gain):not(.neutral):not(.loss) {
		color: var(--color-ink-muted);
	}
</style>
