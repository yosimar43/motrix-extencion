<script>
  import { fade, slide } from 'svelte/transition';

  // Props
  let { history = [], onResend = () => {} } = $props();

  // Truncate URL for display
  function truncateUrl(url, maxLength = 40) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }

  // Get domain from URL
  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }

  // Get relative time
  function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // Handle re-send
  function handleResend(item) {
    onResend(item.url);
  }
</script>

<div class="history-container">
  <div class="history-header">
    <h3 class="history-title">📜 Recent Downloads</h3>
    <span class="history-count">{history.length}/10</span>
  </div>

  {#if history.length > 0}
    <div class="history-list">
      {#each history as item, index (item.id)}
        <div class="history-item" transition:slide={{ duration: 200 }}>
          <div class="status-icon">
            {#if item.status === 'success'}
              ✅
            {:else if item.status === 'error'}
              ❌
            {:else}
              🟡
            {/if}
          </div>
          <div class="url-info">
            <div class="url-text" title={item.url}>
              {truncateUrl(item.url)}
            </div>
            <div class="url-meta">
              <span class="url-domain">{getDomain(item.url)}</span>
              <span class="timestamp">{getRelativeTime(item.timestamp)}</span>
            </div>
            {#if item.filename}
              <div class="filename">{item.filename}</div>
            {/if}
          </div>
          <button
            onclick={() => handleResend(item)}
            class="resend-btn"
            title="Re-send to Motrix"
          >
            �
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">No downloads in history yet</p>
      <p class="empty-help">URLs will appear here after being sent to Motrix</p>
    </div>
  {/if}
</div>

<style>
  .history-container {
    background-color: var(--bg-secondary);
    border-radius: 6px;
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  .history-header {
    padding: 12px 16px;
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .history-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
  }

  .history-count {
    font-size: 11px;
    color: var(--text-muted);
    background-color: var(--bg-primary);
    padding: 2px 6px;
    border-radius: 10px;
  }

  .history-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .history-item {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.2s ease-in-out;
    gap: 8px;
  }

  .status-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .url-info {
    flex: 1;
    min-width: 0;
  }

  .url-text {
    font-size: 12px;
    color: var(--text-primary);
    font-family: 'Courier New', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .url-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2px;
  }

  .url-domain {
    font-size: 10px;
    color: var(--text-muted);
  }

  .timestamp {
    font-size: 9px;
    color: var(--text-muted);
  }

  .filename {
    font-size: 10px;
    color: var(--color-green);
    margin-top: 2px;
    font-style: italic;
  }

  .history-item:hover {
    background-color: var(--bg-tertiary);
  }

  .history-item:last-child {
    border-bottom: none;
  }

  .resend-btn {
    padding: 6px 8px;
    background-color: var(--color-blue);
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    flex-shrink: 0;
  }

  .resend-btn:hover {
    background-color: var(--color-blue-hover);
    transform: scale(1.1);
  }

  .resend-btn:active {
    transform: scale(0.95);
  }

  .empty-state {
    padding: 32px 16px;
    text-align: center;
    color: var(--text-muted);
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .empty-text {
    font-size: 13px;
    font-weight: 500;
    margin: 0 0 4px 0;
    color: var(--text-secondary);
  }

  .empty-help {
    font-size: 11px;
    margin: 0;
    font-style: italic;
  }

  /* Scrollbar */
  .history-list::-webkit-scrollbar {
    width: 4px;
  }

  .history-list::-webkit-scrollbar-track {
    background: var(--bg-secondary);
  }

  .history-list::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }

  .history-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
</style>

