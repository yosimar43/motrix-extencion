<script>
  import { fade } from 'svelte/transition';

  // --- Svelte 5 State Management ---
  let minSizeMB = $state(5);
  let motrixStatus = $state('unknown'); // 'online', 'offline', 'unknown'
  let skipNext = $state(false);
  let notification = $state({ show: false, message: '', type: 'info' });
  let isTestingConnection = $state(false);

  // --- Effects ---
  $effect(() => {
    // Esperar a que la API de Chrome esté disponible
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['minSizeMB', 'skipNext'], (result) => {
        minSizeMB = result.minSizeMB ?? 5;
        skipNext = result.skipNext ?? false;
      });
      // Pequeño delay para asegurar que todo esté cargado antes de probar conexión
      setTimeout(() => {
        testMotrixConnection();
      }, 100);
    }
  });

  $effect(() => {
    // Solo guardar si Chrome API está disponible
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handler = setTimeout(() => {
        chrome.storage.local.set({ minSizeMB: minSizeMB });
      }, 500);
      return () => clearTimeout(handler);
    }
  });

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
      chrome.storage.local.set({ skipNext: newValue }, () => {
        skipNext = newValue;
        showNotification(
          newValue ? 'Next download will be skipped' : 'Download redirection is active',
          'info'
        );
      });
    } else {
      showNotification('Chrome API not available', 'error');
    }
  }

  async function testMotrixConnection() {
    isTestingConnection = true;
    motrixStatus = 'unknown';
    
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
      showNotification('Motrix connection successful! 🎉', 'success');
    } catch (error) {
      motrixStatus = 'offline';
      showNotification('Motrix connection failed.', 'error');
    } finally {
      isTestingConnection = false;
    }
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
      {#if motrixStatus === 'online'}
        <div class="status-indicator online"></div>
      {:else if motrixStatus === 'offline'}
        <div class="status-indicator offline"></div>
      {:else}
        <div class="status-indicator unknown"></div>
      {/if}
    </div>
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

    <!-- Buttons -->
    <div class="buttons">
      <button
        onclick={toggleSkipNext}
        class="btn {skipNext ? 'btn-warning' : 'btn-primary'}"
      >
        {skipNext ? '⏸️ Resume' : '⏭️ Skip Next'}
      </button>
      
      <button
        onclick={testMotrixConnection}
        disabled={isTestingConnection}
        class="btn btn-secondary {isTestingConnection ? 'btn-disabled' : ''}"
      >
        {isTestingConnection ? '⏳ Testing...' : '🔗 Test'}
      </button>
    </div>

    <!-- Current Settings -->
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
  /* Variables CSS para colores consistentes */
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
  }

  /* Reset global y centrado */
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: var(--bg-primary);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  :global(#app) {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    width: 320px;
    margin: 0;
    padding: 0;
  }
  
  /* Contenedor principal - Más compacto */
  .motrix-popup {
    width: 320px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    padding: 16px;
    min-height: 300px;
    border-radius: 8px;
    margin: 0 auto;
  }
  
  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  
  .header-content {
    text-align: center;
    flex: 1;
  }
  
  .title {
    font-size: 20px;
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
    gap: 8px;
  }
  
  .status-label {
    font-size: 12px;
    color: var(--text-muted);
  }
  
  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  
  .status-indicator.online {
    background-color: var(--color-green);
  }
  
  .status-indicator.offline {
    background-color: var(--color-red);
  }
  
  .status-indicator.unknown {
    background-color: var(--color-yellow);
  }
  
  /* Settings */
  .settings {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .input-section {
    background-color: var(--bg-secondary);
    border-radius: 8px;
    padding: 12px;
  }
  
  .input-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    color: var(--text-secondary);
    text-align: center;
  }
  
  .input-field {
    width: 100%;
    padding: 8px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    text-align: center;
    font-size: 14px;
    box-sizing: border-box;
  }
  
  .input-field:focus {
    outline: none;
    border-color: var(--color-blue);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }
  
  /* Buttons */
  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  
  .btn {
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-primary);
  }
  
  .btn:hover {
    transform: scale(1.05);
  }
  
  .btn:active {
    transform: scale(0.95);
  }
  
  .btn-primary {
    background-color: var(--color-blue);
  }
  
  .btn-primary:hover {
    background-color: var(--color-blue-hover);
  }
  
  .btn-warning {
    background-color: var(--color-yellow);
  }
  
  .btn-warning:hover {
    background-color: var(--color-yellow-hover);
  }
  
  .btn-secondary {
    background-color: var(--bg-tertiary);
  }
  
  .btn-secondary:hover {
    background-color: var(--border-color);
  }
  
  .btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-disabled:hover {
    transform: none;
  }
  
  /* Current Settings */
  .current-settings {
    background-color: var(--bg-secondary);
    border-radius: 8px;
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
    font-size: 13px;
  }
  
  .setting-value {
    font-weight: 500;
    font-size: 13px;
  }
  
  .setting-value.primary {
    color: var(--color-blue);
  }
  
  .setting-value.success {
    color: var(--color-green);
  }
  
  .setting-value.warning {
    color: var(--color-yellow);
  }
  
  /* Notifications */
  .notification {
    margin-top: 12px;
    padding: 8px;
    text-align: center;
    font-size: 12px;
    border-radius: 6px;
    border: 1px solid;
  }
  
  .notification-success {
    background-color: rgba(16, 185, 129, 0.2);
    color: #a7f3d0;
    border-color: rgba(16, 185, 129, 0.5);
  }
  
  .notification-error {
    background-color: rgba(239, 68, 68, 0.2);
    color: #fecaca;
    border-color: rgba(239, 68, 68, 0.5);
  }
  
  .notification-info {
    background-color: rgba(59, 130, 246, 0.2);
    color: #bfdbfe;
    border-color: rgba(59, 130, 246, 0.5);
  }
</style>

