<script lang="ts">
  interface Props {
    name: string;
    title?: string;
    company?: string;
    category?: 'ceo' | 'senate' | 'house';
    class?: string;
  }

  let {
    name,
    title,
    company,
    category = 'ceo',
    class: className = ''
  }: Props = $props();

  let imageError = $state(false);
  let loading = $state(true);

  const portraitUrl = $derived(
    `/portraits/${category}-${name.replace(/\s+/g, '-').toLowerCase()}.png`
  );
  const fallbackUrl = $derived(
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
  );

  function handleImageError(): void {
    imageError = true;
    loading = false;
  }

  function handleImageLoad(): void {
    loading = false;
  }
</script>

<div class="portrait-card {className}">
  <div class="portrait-container">
    {#if loading && !imageError}
      <div class="skeleton"></div>
    {/if}

    {#if !imageError}
      <img
        src={portraitUrl}
        alt={name}
        onload={handleImageLoad}
        onerror={handleImageError}
        class:hidden={loading}
      />
    {:else}
      <img
        src={fallbackUrl}
        alt="{name} fallback"
        class="fallback"
      />
    {/if}
  </div>

  <div class="info">
    <h3 class="name">{name}</h3>
    {#if title}
      <p class="title">{title}</p>
    {/if}
    {#if company}
      <p class="company">{company}</p>
    {/if}
  </div>
</div>

<style>
  .portrait-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'IBM Plex Mono', monospace;
    border: 1px solid #cccccc;
    padding: 0.5rem;
    background: #ffffff;
    text-align: center;
  }

  .portrait-container {
    width: 100%;
    aspect-ratio: 4 / 5;
    max-width: 200px;
    background: #f5f5f0;
    border: 1px solid #ddd;
    overflow: hidden;
    position: relative;
    margin-bottom: 0.5rem;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  img.hidden {
    display: none;
  }

  .skeleton {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    position: absolute;
    top: 0;
    left: 0;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .info {
    width: 100%;
  }

  .name {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #1a1a1a;
  }

  .title {
    margin: 0.25rem 0;
    font-size: 0.75rem;
    color: #666666;
  }

  .company {
    margin: 0.25rem 0;
    font-size: 0.7rem;
    color: #999999;
    font-style: italic;
  }
</style>
