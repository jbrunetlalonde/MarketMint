<script lang="ts">
	import { formatCompact, formatCurrency } from '$lib/utils/formatters';

	interface Executive {
		name: string;
		title: string;
		pay: number | null;
		currencyPay?: string;
		gender?: string;
		yearBorn?: number;
		titleSince?: number;
	}

	interface Props {
		executives: Executive[];
		ceoPortrait?: string;
		loading?: boolean;
	}

	let { executives, ceoPortrait, loading = false }: Props = $props();

	const ceo = $derived(executives.find((e) => e.title?.toLowerCase().includes('ceo')));
	const otherExecs = $derived(executives.filter((e) => e !== ceo).slice(0, 4));
</script>

<div class="executive-card">
	<div class="section-header">
		<h3 class="section-title">Key Executives</h3>
	</div>

	{#if loading}
		<div class="loading">Loading executive data...</div>
	{:else if executives.length === 0}
		<div class="empty">No executive data available</div>
	{:else}
		<div class="content">
			{#if ceo}
				<div class="ceo-section">
					<div class="ceo-portrait">
						{#if ceoPortrait}
							<img src={ceoPortrait} alt={ceo.name} class="portrait-img" loading="lazy" decoding="async" />
						{:else}
							<div class="portrait-placeholder">
								{ceo.name
									.split(' ')
									.map((n) => n[0])
									.join('')
									.slice(0, 2)}
							</div>
						{/if}
					</div>
					<div class="ceo-info">
						<div class="ceo-name">{ceo.name}</div>
						<div class="ceo-title">{ceo.title}</div>
						{#if ceo.pay}
							<div class="ceo-compensation">
								<span class="comp-label">Total Compensation</span>
								<span class="comp-value">${formatCompact(ceo.pay)}</span>
							</div>
						{/if}
						{#if ceo.titleSince}
							<div class="tenure">Since {ceo.titleSince}</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if otherExecs.length > 0}
				<div class="other-execs">
					{#each otherExecs as exec (exec.name)}
						<div class="exec-row">
							<div class="exec-info">
								<span class="exec-name">{exec.name}</span>
								<span class="exec-title">{exec.title}</span>
							</div>
							{#if exec.pay}
								<span class="exec-pay">${formatCompact(exec.pay)}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.executive-card {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.section-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
	}

	.section-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.loading,
	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.content {
		padding: 1rem;
	}

	.ceo-section {
		display: flex;
		gap: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 1rem;
	}

	.ceo-portrait {
		flex-shrink: 0;
	}

	.portrait-img {
		width: 64px;
		height: 64px;
		border-radius: 4px;
		object-fit: cover;
		border: 1px solid var(--color-border);
	}

	.portrait-placeholder {
		width: 64px;
		height: 64px;
		border-radius: 4px;
		background: var(--color-newsprint-dark);
		border: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-ink-muted);
	}

	.ceo-info {
		flex: 1;
	}

	.ceo-name {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.ceo-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-top: 2px;
	}

	.ceo-compensation {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.comp-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.comp-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.tenure {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		margin-top: 4px;
	}

	.other-execs {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.exec-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.exec-row:last-child {
		border-bottom: none;
	}

	.exec-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.exec-name {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink);
	}

	.exec-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.exec-pay {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink);
	}
</style>
