<script lang="ts">
	interface Props {
		logoSrc?: string;
		currentDate: string;
	}

	let { logoSrc = '/market_mint.png', currentDate }: Props = $props();
</script>

<header class="masthead">
	<a href="/" class="masthead-logo-link">
		<img src={logoSrc} alt="MarketMint" class="masthead-logo" />
	</a>
	<p class="masthead-date">{currentDate}</p>
</header>
