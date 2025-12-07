---
id: "026"
status: pending
priority: p3
category: performance
title: Missing Request Batching for Portrait Images
created: 2024-12-07
source: pr-review
pr: 1
---

# Missing Request Batching for Portrait Images

## Problem

The Congress members page loads 535 individual portrait images without batching or progressive loading, causing a burst of 535 HTTP requests on page load.

## Location

`src/routes/political/members/+page.svelte`

```svelte
{#each officials as official}
  <img src={official.portrait_url} alt={official.name} />
{/each}
```

## Impact

- **Performance**: Browser connection limits cause request queuing
- **UX**: All images load simultaneously, none complete quickly
- **Server Load**: 535 concurrent requests per page view
- **Mobile**: Especially slow on cellular connections

## Solution

Implement virtualized list with lazy loading:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let visibleOfficials = $state<typeof officials>([]);
  let observer: IntersectionObserver;

  onMount(() => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '100px' });

    return () => observer.disconnect();
  });
</script>

{#each officials as official}
  <img
    data-src={official.portrait_url}
    src="/placeholder-avatar.svg"
    alt={official.name}
    use:lazyLoad
  />
{/each}
```

Or use a virtual list library:

```svelte
<script>
  import { VirtualList } from 'svelte-virtual-list-ce';
</script>

<VirtualList items={officials} let:item>
  <OfficialCard official={item} />
</VirtualList>
```

## Files Affected

- `src/routes/political/members/+page.svelte`
- `src/lib/components/OfficialCard.svelte` (if exists)

## Testing

- [ ] Verify only visible images load initially
- [ ] Verify scrolling triggers lazy load
- [ ] Verify placeholder shows before load
- [ ] Test on throttled network
