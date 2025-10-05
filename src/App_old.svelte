<script>
  import { fade } from 'svelte/transition';
  import History from './components/History.svelte';

  // --- Svelte 5 State Management ---
  let minSizeMB = $state(5);
  let motrixStatus = $state('unknown'); // 'online', 'offline', 'unknown'
  let skipNext = $state(false);
  let notification = $state({ show: false, message: '', type: 'info' });
  let isTestingConnection = $state(false);
  let history = $state([]);

  // --- Effects ---
  $effect(() => {
    // Wait for Chrome API to be available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      loadInitialData();
    }
  });

  $effect(() => {
    // Auto-save settings when they change
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handler = setTimeout(() => {
        chrome.storage.local.set({ minSizeMB, skipNext });
      }, 500);
      return () => clearTimeout(handler);
    }
  });

  // Safety check: Reset loading state if it gets stuck
  $effect(() => {
    if (isTestingConnection) {
      const safetyTimeout = setTimeout(() => {
        if (isTestingConnection) {
          console.warn('Resetting stuck connection test');
          isTestingConnection = false;
          motrixStatus = 'unknown';
        }
      }, 10000); // 10 second safety net
      return () => clearTimeout(safetyTimeout);
    }
  });

  // Load initial data from storage
  async function loadInitialData() {
    try {
      const result = await chrome.storage.local.get(['minSizeMB', 'skipNext']);
      minSizeMB = result.minSizeMB ?? 5;
      skipNext = result.skipNext ?? false;
      
      // Get history from background script
      await loadHistoryFromBackground();
      
      // Test connection after a small delay
      setTimeout(() => {
        testMotrixConnection();
      }, 100);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  // Load history from background script
  async function loadHistoryFromBackground() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getHistory' });
      if (response && response.success) {
        history = response.data || [];
        console.log('History loaded:', history.length, 'items');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      history = [];
    }
  }

  // Refresh history manually
  async function refreshHistory() {
    await loadHistoryFromBackground();
    showNotification('History refreshed', 'info');
  }

  // --- Functions ---
  function showNotification(message, type = 'info', duration = 3000) {
    notification = { show: true, message, type };
    setTimeout(() => {
      notification = { show: false, message: '', type: 'info' };
    }, duration);
  }

  function toggleSkipNext() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const newValue = !skipNext;
      skipNext = newValue;
      chrome.storage.local.set({ skipNext: newValue });
      showNotification(
        newValue ? 'Next download will be skipped' : 'Download redirection is active',
        'info'
      );
    } else {
      showNotification('Chrome API not available', 'error');
    }
  }

  async function testMotrixConnection() {
    if (isTestingConnection) return; // Prevent multiple simultaneous tests
    
    isTestingConnection = true;
    motrixStatus = 'unknown';
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isTestingConnection) {
        isTestingConnection = false;
        motrixStatus = 'offline';
        showNotification('Connection test timed out', 'error');
      }
    }, 5000); // 5 second timeout
    
    try {
      const response = await fetch("http://localhost:16800/jsonrpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "ping",
          method: "aria2.getVersion",
          params: []
        }),
      });
      
      if (!response.ok) throw new Error('RPC call failed');
      await response.json();
      
      motrixStatus = 'online';
      showNotification('Motrix connected successfully! 🎉', 'success');
    } catch (error) {
      console.error('Motrix connection error:', error);
      motrixStatus = 'offline';
      showNotification('Could not connect to Motrix', 'error');
    } finally {
      clearTimeout(timeoutId);
      isTestingConnection = false;
    }
  }

  // Handle re-sending URLs from history
  async function handleResend(url) {
    try {
      const response = await fetch("http://localhost:16800/jsonrpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now().toString(),
          method: "aria2.addUri",
          params: [[url]]
        }),
      });
      
      if (!response.ok) throw new Error('RPC call failed');
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      showNotification('Download re-sent to Motrix! 🚀', 'success');
    } catch (error) {
      console.error('Error re-sending download:', error);
      showNotification('Failed to re-send download', 'error');
    }
  }

  // Listen for messages from background script
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'historyUpdated') {
        // Reload history when background script updates it
        loadHistoryFromBackground();
        sendResponse({ success: true });
      }
    });
  }
</script>

<main class="motrix-popup">
  <!-- Header -->
  <div class="header">
    <div class="header-content">
      <h1 class="title">Motrix Control</h1>
      <p class="subtitle">Download Manager Extension</p>
    </div>
    <div class="status">
      <span class="status-label">Status:</span>
      <div class="status-indicator {motrixStatus}">
        {#if motrixStatus === 'online'}
          🟢
        {:else if motrixStatus === 'offline'}
          �
        {:else}
          🟡
        {/if}
      </div>
    </div>
  </div>

  <!-- Connection Test -->
  <div class="connection-section">
    <button
      onclick={testMotrixConnection}
      disabled={isTestingConnection}
      class="btn {motrixStatus === 'online' ? 'btn-success' : motrixStatus === 'offline' ? 'btn-danger' : 'btn-secondary'} {isTestingConnection ? 'btn-disabled' : ''}"
    >
      {#if isTestingConnection}
        <span class="spinner"></span>
        Connecting...
      {:else}
        {#if motrixStatus === 'online'}
          ✅ Connected
        {:else if motrixStatus === 'offline'}
          ❌ Test Connection
        {:else}
          🔗 Test Connection
        {/if}
      {/if}
    </button>
  </div>

  <!-- Settings -->
  <div class="settings">
    <!-- Minimum Size -->
    <div class="input-section">
      <label for="min-size" class="input-label">
        Minimum Download Size (MB)
      </label>
      <input
        type="number"
        id="min-size"
        bind:value={minSizeMB}
        min="1"
        max="1000"
        class="input-field"
      />
    </div>

    <!-- Skip Next Button -->
    <div class="skip-section">
      <button
        onclick={toggleSkipNext}
        class="btn {skipNext ? 'btn-warning' : 'btn-primary'}"
      >
        {skipNext ? '⏸️ Resume Downloads' : '⏭️ Skip Next Download'}
      </button>
      <p class="skip-help">
        {skipNext ? 'Next download will be ignored' : 'All downloads will be sent to Motrix'}
      </p>
    </div>

    <!-- Current Settings Display -->
    <div class="current-settings">
      <h3 class="settings-title">Current Settings</h3>
      <div class="settings-grid">
        <div class="setting-item">
          <span class="setting-label">Min Size:</span>
          <span class="setting-value primary">{minSizeMB} MB</span>
        </div>
        <div class="setting-item">
          <span class="setting-label">Skip Mode:</span>
          <span class="setting-value {skipNext ? 'warning' : 'success'}">
            {skipNext ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- History Panel -->
  <div class="history-section">
    <div class="history-header">
      <h3>Download History</h3>
      <button
        onclick={refreshHistory}
        class="btn btn-secondary btn-sm"
        title="Refresh history"
      >
        🔄
      </button>
    </div>
    <History {history} onResend={handleResend} />
  </div>

  <!-- Notifications -->
  {#if notification.show}
    <div
      transition:fade={{ duration: 300 }}
      class="notification notification-{notification.type}"
    >
      {notification.message}
    </div>
  {/if}
</main>

<style>
  /* CSS Variables */
  :root {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --bg-tertiary: #374151;
    --text-primary: #ffffff;
    --text-secondary: #d1d5db;
    --text-muted: #9ca3af;
    --color-blue: #3b82f6;
    --color-blue-hover: #2563eb;
    --color-green: #10b981;
    --color-red: #ef4444;
    --color-yellow: #f59e0b;
    --color-yellow-hover: #d97706;
    --border-color: #4b5563;
    --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }

  /* Container */
  .motrix-popup {
    width: 320px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    padding: 16px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: var(--shadow);
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .header-content {
    flex: 1;
  }

  .title {
    font-size: 18px;
    font-weight: bold;
    color: var(--color-blue);
    margin: 0 0 2px 0;
  }

  .subtitle {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .status-indicator {
    font-size: 12px;
    display: flex;
    align-items: center;
  }

  /* Connection Section */
  .connection-section {
    margin-bottom: 16px;
  }

  /* Settings */
  .settings {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 16px;
  }

  .input-section {
    background-color: var(--bg-secondary);
    border-radius: 6px;
    padding: 12px;
  }

  .input-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    color: var(--text-secondary);
  }

  .input-field {
    width: 100%;
    padding: 8px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 14px;
    box-sizing: border-box;
    transition: all 0.2s ease-in-out;
  }

  .input-field:focus {
    outline: none;
    border-color: var(--color-blue);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .skip-section {
    text-align: center;
  }

  .skip-help {
    font-size: 11px;
    color: var(--text-muted);
    margin: 6px 0 0 0;
    font-style: italic;
  }

  .current-settings {
    background-color: var(--bg-secondary);
    border-radius: 6px;
    padding: 12px;
    border: 1px solid var(--border-color);
  }

  .settings-title {
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--text-secondary);
    text-align: center;
  }

  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .setting-label {
    color: var(--text-muted);
    font-size: 12px;
  }

  .setting-value {
    font-weight: 500;
    font-size: 12px;
  }

  .setting-value.primary { color: var(--color-blue); }
  .setting-value.success { color: var(--color-green); }
  .setting-value.warning { color: var(--color-yellow); }

  /* Buttons */
  .btn {
    width: 100%;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .btn:hover:not(.btn-disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow);
  }

  .btn:active:not(.btn-disabled) {
    transform: translateY(0);
  }

  .btn-primary {
    background-color: var(--color-blue);
  }

  .btn-primary:hover:not(.btn-disabled) {
    background-color: var(--color-blue-hover);
  }

  .btn-warning {
    background-color: var(--color-yellow);
  }

  .btn-warning:hover:not(.btn-disabled) {
    background-color: var(--color-yellow-hover);
  }

  .btn-secondary {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(.btn-disabled) {
    background-color: var(--border-color);
  }

  .btn-success {
    background-color: var(--color-green);
    border: 1px solid var(--color-green);
    color: white;
  }

  .btn-success:hover:not(.btn-disabled) {
    background-color: #28a745;
  }

  .btn-danger {
    background-color: var(--color-red);
    border: 1px solid var(--color-red);
    color: white;
  }

  .btn-danger:hover:not(.btn-disabled) {
    background-color: #dc3545;
  }

  .btn-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Spinner */
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Notifications */
  .notification {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: var(--shadow);
    z-index: 1000;
    max-width: 300px;
    text-align: center;
  }

  .notification-success {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--color-green);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .notification-error {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--color-red);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .notification-info {
    background-color: rgba(59, 130, 246, 0.1);
    color: var(--color-blue);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  /* History Section */
  .history-section {
    margin-top: 16px;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .history-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
  }
</style>

