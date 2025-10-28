<script>
  import { slide } from 'svelte/transition';

  let { history = [], onResend = () => {} } = $props();

  function truncateUrl(url, maxLength = 32) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  function handleResend(item) {
    onResend(item.url);
  }
</script>

<div class="history-container">
  {#if history.length > 0}
    <div class="history-list">
      {#each history as item, index (item.id)}
        <div class="history-item" transition:slide={{ duration: 200 }}>
          <div class="item-status">
            {#if item.status === 'success'}
              <div class="status-icon success">✓</div>
            {:else if item.status === 'error'}
              <div class="status-icon error">✕</div>
            {:else if item.status === 'browser_fallback'}
              <div class="status-icon browser">📥</div>
            {:else}
              <div class="status-icon pending">•</div>
            {/if}
          </div>
          
          <div class="item-content">
            <div class="item-url" title={item.url}>
              🔗 {truncateUrl(item.url)}
            </div>
            <div class="item-meta">
              <span class="item-domain">{getDomain(item.url)}</span>
              <span class="item-time">{getRelativeTime(item.timestamp)}</span>
            </div>
          </div>
          
          <button onclick={() => handleResend(item)} class="resend-btn">
            ↗
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">No downloads yet</p>
      <p class="empty-help">History will appear here</p>
    </div>
  {/if}
</div>

<style>
  .history-container {
    height: 100%;
    padding: var(--spacing-md);
    overflow: hidden;
  }

  .history-list {
    max-height: 280px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .history-list::-webkit-scrollbar {
    display: none;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    transition: var(--transition);
  }

  .history-item:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }

  .item-status {
    flex-shrink: 0;
  }

  .status-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
  }

  .status-icon.success {
    background: var(--accent-primary);
    color: white;
  }

  .status-icon.error {
    background: var(--accent-danger);
    color: white;
  }

  .status-icon.browser {
    background: var(--accent-warning);
    color: white;
  }

  .status-icon.pending {
    background: var(--accent-warning);
    color: white;
  }

  .item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .item-url {
    font-size: 12px;
    color: var(--text-primary);
    font-family: monospace;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 10px;
  }

  .item-domain {
    color: var(--accent-primary);
    font-weight: 600;
    background: rgba(0, 212, 160, 0.1);
    padding: 2px var(--spacing-xs);
    border-radius: 3px;
  }

  .item-time {
    color: var(--text-muted);
    font-weight: 500;
    margin-left: auto;
  }

  .resend-btn {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    background: var(--accent-secondary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: var(--transition);
  }

  .resend-btn:hover {
    transform: scale(1.1);
    background: #326bc7;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--text-muted);
    min-height: 120px;
  }

  .empty-icon {
    font-size: 24px;
    margin-bottom: var(--spacing-sm);
    opacity: 0.6;
  }

  .empty-text {
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 var(--spacing-xs) 0;
    color: var(--text-secondary);
  }

  .empty-help {
    font-size: 11px;
    margin: 0;
    opacity: 0.7;
  }
</style>
