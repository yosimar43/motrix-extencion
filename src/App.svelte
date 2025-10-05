<script>
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import History from './components/History.svelte';
  import Welcome from './components/Welcome.svelte';

  // --- Svelte 5 State Management ---
  let minSizeMB = $state(5);
  let motrixStatus = $state('unknown'); // 'online', 'offline', 'unknown'
  let skipNext = $state(false);
  let notification = $state({ show: false, message: '', type: 'info' });
  let isTestingConnection = $state(false);
  let history = $state([]);
  let showWelcome = $state(true);
  let isAppReady = $state(false);
  let isDataLoaded = $state(false);
  let welcomeMinTimeReached = $state(false);
  let isTransitioning = $state(false);

  // --- Effects ---
  $effect(() => {
    // Wait for Chrome API to be available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      initializeApp();
    }
  });

  // Check if we can transition to main app
  $effect(() => {
    if (isDataLoaded && welcomeMinTimeReached && !isTestingConnection && !isTransitioning) {
      console.log('🎬 Starting transition to main app');
      isTransitioning = true;
      
      // Start fade out of welcome
      setTimeout(() => {
        showWelcome = false;
      }, 100);
      
      // Show main interface after welcome fades out
      setTimeout(() => {
        isAppReady = true;
        isTransitioning = false;
        console.log('✅ Transition completed');
      }, 400); // Wait for welcome fade out
    }
  });

  // Initialize app with better flow control
  async function initializeApp() {
    try {
      // Load initial data
      await loadInitialData();
      
      // Test connection in background
      testMotrixConnection();
      
      // Mark data as loaded
      isDataLoaded = true;
      
      // Ensure minimum welcome time (for UX)
      setTimeout(() => {
        welcomeMinTimeReached = true;
      }, 1800); // Reduced from 3500ms to 1800ms
      
    } catch (error) {
      console.error('Error initializing app:', error);
      // Fallback: show main app anyway after short delay
      setTimeout(() => {
        showWelcome = false;
        isAppReady = true;
      }, 2000);
    }
  }

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

  // Handle welcome completion
  function handleWelcomeReady() {
    // Welcome animations completed
    console.log('✨ Welcome component ready');
  }

  // Skip welcome screen
  function skipWelcome() {
    console.log('⏭️ Welcome skipped by user');
    
    if (isTransitioning) return; // Prevent double triggers
    
    // Force conditions and start transition
    welcomeMinTimeReached = true;
    
    if (isDataLoaded && !isTestingConnection) {
      isTransitioning = true;
      setTimeout(() => {
        showWelcome = false;
      }, 100);
      setTimeout(() => {
        isAppReady = true;
        isTransitioning = false;
      }, 400);
    }
  }

  // Load initial data from storage
  async function loadInitialData() {
    try {
      console.log('🔄 Loading initial data...');
      
      const result = await chrome.storage.local.get(['minSizeMB', 'skipNext']);
      minSizeMB = result.minSizeMB ?? 5;
      skipNext = result.skipNext ?? false;
      
      console.log('✅ Settings loaded:', { minSizeMB, skipNext });
      
      // Get history from background script
      await loadHistoryFromBackground();
      
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      throw error; // Re-throw to handle in initializeApp
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
    skipNext = !skipNext;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ skipNext });
      showNotification(
        skipNext ? 'Next download will be skipped' : 'Downloads will be sent to Motrix',
        skipNext ? 'warning' : 'success'
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
  {#if showWelcome}
    <!-- Welcome Screen -->
    <div 
      class="welcome-wrapper"
      in:fade={{ duration: 300 }}
      out:fade={{ duration: 300, easing: quintOut }}
    >
      <Welcome 
        status={motrixStatus} 
        onReady={handleWelcomeReady}
      />
      
      <!-- Skip Button -->
      {#if !isTransitioning}
        <button 
          onclick={skipWelcome}
          class="skip-welcome-btn"
          transition:fade={{ delay: 2000, duration: 300 }}
        >
          Skip ⏭️
        </button>
      {/if}
    </div>
  {/if}

  {#if isAppReady}
    <!-- Main Interface -->
    <div 
      class="main-interface" 
      in:fly={{ y: 20, duration: 500, easing: quintOut, delay: 100 }}
      out:fade={{ duration: 200 }}
    >
      <!-- Improved Header -->
      <div class="header">
        <div class="header-content">
          <div class="brand-mini">
            <div class="mini-logo">⚡</div>
            <div class="brand-text">
              <h1 class="title">Motrix Control</h1>
              <p class="subtitle">Advanced Download Manager</p>
            </div>
          </div>
          <div class="header-status">
            <div class="status-indicator {motrixStatus}">
              {#if motrixStatus === 'online'}
                <div class="status-dot online"></div>
                <span class="status-text">Connected</span>
              {:else if motrixStatus === 'offline'}
                <div class="status-dot offline"></div>
                <span class="status-text">Offline</span>
              {:else}
                <div class="status-dot unknown"></div>
                <span class="status-text">Unknown</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Section -->
      <div class="connection-section">
        <h3 class="section-title">🔗 Connection</h3>
        <button
          onclick={testMotrixConnection}
          disabled={isTestingConnection}
          class="btn {motrixStatus === 'online' ? 'btn-success' : motrixStatus === 'offline' ? 'btn-danger' : 'btn-secondary'} {isTestingConnection ? 'btn-disabled' : ''} btn-full"
        >
          {#if isTestingConnection}
            <span class="spinner"></span>
            Testing...
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

  <!-- Settings Section -->
  <div class="settings-section">
    <h3 class="section-title">⚙️ Settings</h3>
    <div class="settings-content">
      <div class="input-group">
        <label for="min-size" class="input-label">Min Size (MB)</label>
        <input
          type="number"
          id="min-size"
          bind:value={minSizeMB}
          min="1"
          max="1000"
          class="input-field"
        />
      </div>
      <div class="toggle-group">
        <button
          onclick={toggleSkipNext}
          class="btn {skipNext ? 'btn-warning' : 'btn-primary'} btn-sm"
        >
          {skipNext ? '⏸️ Resume' : '⏭️ Skip Next'}
        </button>
        <span class="toggle-status {skipNext ? 'warning' : 'success'}">
          {skipNext ? 'Skipping' : 'Active'}
        </span>
      </div>
    </div>
  </div>

      <!-- History Section -->
      <div class="history-section">
        <div class="history-header">
          <h3 class="section-title">📜 History</h3>
          <button
            onclick={refreshHistory}
            class="btn btn-ghost btn-sm"
            title="Refresh history"
          >
            🔄
          </button>
        </div>
        <div class="history-content">
          <History {history} onResend={handleResend} />
        </div>
      </div>

      <!-- Status Summary -->
      <div class="status-summary">
        <div class="summary-item">
          <span class="summary-label">Min Size</span>
          <span class="summary-value">{minSizeMB} MB</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Mode</span>
          <span class="summary-value {skipNext ? 'warning' : 'success'}">
            {skipNext ? 'Skip' : 'Active'}
          </span>
        </div>
        <div class="summary-item">
          <span class="summary-label">History</span>
          <span class="summary-value">{history.length} items</span>
        </div>
      </div>
    </div>
  {/if}

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
  /* === UNIFIED DESIGN SYSTEM === */
  :root {
    /* Colors - Dark Dashboard Theme */
    --bg-primary: #0d1117;
    --bg-secondary: #1a1f2c;
    --bg-card: #21262d;
    --bg-card-hover: #2d333b;
    --bg-input: #161b22;
    
    --accent-primary: #00d4a0;
    --accent-secondary: #3a7bd5;
    --accent-danger: #f85149;
    --accent-warning: #d29922;
    
    --text-primary: #f0f6fc;
    --text-secondary: #8b949e;
    --text-muted: #656d76;
    
    --border-color: #30363d;
    --border-hover: #484f58;
    --border-accent: rgba(0, 212, 160, 0.3);
    
    /* Spacing System */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 12px;
    --spacing-lg: 16px;
    --spacing-xl: 20px;
    
    /* Radius System */
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 16px;
    
    /* Shadow System */
    --shadow-soft: 0 2px 10px rgba(0, 0, 0, 0.15);
    --shadow-medium: 0 4px 20px rgba(0, 0, 0, 0.25);
    --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.12);
    
    /* Transition System */
    --transition: all 0.25s ease-in-out;
    --transition-fast: all 0.15s ease-in-out;
  }

  /* === MAIN CONTAINER === */
  .motrix-popup {
    width: 380px;
    min-height: 500px;
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
    color: var(--text-primary);
    border-radius: var(--radius-lg);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    box-shadow: var(--shadow-medium);
    border: 1px solid var(--border-color);
    max-height: 600px;
    overflow: hidden;
    position: relative;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
  }

  /* === WELCOME SCREEN === */
  .welcome-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
  }

  .skip-welcome-btn {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 11px;
    cursor: pointer;
    transition: var(--transition);
    z-index: 11;
    backdrop-filter: blur(10px);
  }

  .skip-welcome-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    color: var(--text-primary);
  }

  /* === MAIN INTERFACE === */
  .main-interface {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    max-height: 600px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex: 1;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  .main-interface::-webkit-scrollbar {
    display: none;
  }

  /* === IMPROVED HEADER === */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex: 1;
  }

  .brand-mini {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .mini-logo {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, var(--accent-primary), #00b894);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(0, 212, 160, 0.3);
  }

  .brand-text {
    flex: 1;
  }

  .title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
    letter-spacing: -0.3px;
    line-height: 1.2;
  }

  .subtitle {
    font-size: 11px;
    color: var(--text-muted);
    margin: 2px 0 0 0;
    font-weight: 500;
  }

  .header-status {
    flex-shrink: 0;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: var(--bg-card);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    transition: var(--transition);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    position: relative;
  }

  .status-dot.online {
    background: var(--accent-primary);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  .status-dot.offline {
    background: var(--accent-danger);
  }

  .status-dot.unknown {
    background: var(--accent-warning);
  }

  @keyframes pulse-dot {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }

  .status-text {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  /* === CONNECTION SECTION === */
  .connection-section {
    background: var(--bg-card);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    transition: var(--transition);
  }

  .connection-section:hover {
    border-color: var(--border-hover);
    background: var(--bg-card-hover);
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-md) 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  /* === SETTINGS SECTION === */
  .settings-section {
    background: var(--bg-card);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    transition: var(--transition);
  }

  .settings-section:hover {
    border-color: var(--border-hover);
    background: var(--bg-card-hover);
  }

  .settings-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .input-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input-field {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 13px;
    transition: var(--transition);
  }

  .input-field:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px var(--border-accent);
  }

  .toggle-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .toggle-status {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px var(--spacing-sm);
    border-radius: var(--radius-sm);
  }

  .toggle-status.success { 
    color: var(--accent-primary); 
    background: rgba(0, 212, 160, 0.1);
  }
  .toggle-status.warning { 
    color: var(--accent-warning); 
    background: rgba(210, 153, 34, 0.1);
  }

  /* === HISTORY SECTION === */
  .history-section {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
    transition: var(--transition);
  }

  .history-section:hover {
    border-color: var(--border-hover);
    background: var(--bg-card-hover);
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
  }

  .history-content {
    flex: 1;
    min-height: 200px;
    max-height: 300px;
    overflow: hidden;
  }

  /* === BUTTONS === */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 12px;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition);
    text-decoration: none;
    background: transparent;
    border: 1px solid transparent;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn-full {
    width: 100%;
  }

  .btn-sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 11px;
  }

  .btn-primary {
    background: var(--accent-primary);
    color: white;
    box-shadow: var(--shadow-card);
  }

  .btn-primary:hover {
    background: #00c794;
    box-shadow: var(--shadow-soft);
  }

  .btn-secondary {
    background: var(--accent-secondary);
    color: white;
    box-shadow: var(--shadow-card);
  }

  .btn-secondary:hover {
    background: #326bc7;
    box-shadow: var(--shadow-soft);
  }

  .btn-success {
    background: var(--accent-primary);
    color: white;
    box-shadow: var(--shadow-card);
  }

  .btn-success:hover {
    background: #00c794;
    box-shadow: var(--shadow-soft);
  }

  .btn-danger {
    background: var(--accent-danger);
    color: white;
    box-shadow: var(--shadow-card);
  }

  .btn-danger:hover {
    background: #e6423d;
    box-shadow: var(--shadow-soft);
  }

  .btn-warning {
    background: var(--accent-warning);
    color: white;
    box-shadow: var(--shadow-card);
  }

  .btn-warning:hover {
    background: #bb851c;
    box-shadow: var(--shadow-soft);
  }

  .btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .btn-ghost:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  /* === SPINNER === */
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* === STATUS SUMMARY === */
  .status-summary {
    display: flex;
    justify-content: space-between;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    flex: 1;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    transition: var(--transition);
  }

  .summary-item:hover {
    background: var(--bg-card-hover);
  }

  .summary-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .summary-value {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .summary-value.success { color: var(--accent-primary); }
  .summary-value.warning { color: var(--accent-warning); }

  /* === NOTIFICATIONS === */
  .notification {
    position: fixed;
    top: var(--spacing-lg);
    right: var(--spacing-lg);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    z-index: 1000;
    max-width: 280px;
    backdrop-filter: blur(10px);
    border: 1px solid;
    box-shadow: var(--shadow-medium);
  }

  .notification-success {
    background: rgba(0, 212, 160, 0.1);
    color: var(--accent-primary);
    border-color: rgba(0, 212, 160, 0.3);
  }

  .notification-error {
    background: rgba(248, 81, 73, 0.1);
    color: var(--accent-danger);
    border-color: rgba(248, 81, 73, 0.3);
  }

  .notification-warning {
    background: rgba(210, 153, 34, 0.1);
    color: var(--accent-warning);
    border-color: rgba(210, 153, 34, 0.3);
  }

  .notification-info {
    background: rgba(58, 123, 213, 0.1);
    color: var(--accent-secondary);
    border-color: rgba(58, 123, 213, 0.3);
  }

  /* === RESPONSIVE === */
  @media (max-width: 400px) {
    .motrix-popup {
      width: 100%;
      max-width: 380px;
    }
  }
</style>