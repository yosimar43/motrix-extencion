// Motrix Control - Background Service Worker
// Manages downloads, storage, and communication with Motrix RPC

class MotrixManager {
  constructor() {
    this.downloadQueue = new Map();
    this.downloadHistory = [];
    this.activeDownloads = new Set();
    this.duplicateTracker = new Set();
    this.retryQueue = new Map(); // NEW: Queue for failed downloads
    this.maxDuplicateTrackerSize = 1000; // NEW: Prevent memory leak
    this.settings = {
      minSizeMB: 5,
      skipNext: false,
      motrixUrl: 'http://localhost:16800/jsonrpc',
      maxHistoryItems: 100,
      autoRetry: true, // NEW: Auto-retry failed downloads
      maxRetries: 3 // NEW: Max retry attempts
    };
    
    this.initializeListeners();
    this.loadSettings();
    
    // Clear any old queues on startup
    this.clearOldQueues();
  }

  // Clear old download queues to prevent processing old downloads
  clearOldQueues() {
    this.downloadQueue.clear();
    this.retryQueue.clear();
    this.duplicateTracker.clear();
    console.log('🧹 Cleared old download queues');
  }

  // NEW: Process retry queue periodically
  // Initialize all event listeners
  initializeListeners() {
    // Download interception
    chrome.downloads.onCreated.addListener(this.handleDownloadCreated.bind(this));
    chrome.downloads.onChanged.addListener(this.handleDownloadChanged.bind(this));
    
    // Message handling from popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Storage changes (for real-time settings sync)
    chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
    
    // Extension startup
    chrome.runtime.onStartup.addListener(this.onStartup.bind(this));
    chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
  }

  // Handle storage changes for real-time settings sync
  handleStorageChange(changes, areaName) {
    if (areaName === 'local') {
      if (changes.minSizeMB) {
        this.settings.minSizeMB = changes.minSizeMB.newValue ?? 5;
      }
      if (changes.skipNext) {
        this.settings.skipNext = changes.skipNext.newValue ?? false;
      }
      if (changes.motrixUrl) {
        this.settings.motrixUrl = changes.motrixUrl.newValue ?? 'http://localhost:16800/jsonrpc';
      }
    }
  }

  // Load settings from storage
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'minSizeMB', 'skipNext', 'motrixUrl', 'downloadHistory', 'downloadQueue'
      ]);
      
      this.settings.minSizeMB = result.minSizeMB ?? 5;
      this.settings.skipNext = result.skipNext ?? false;
      this.settings.motrixUrl = result.motrixUrl ?? 'http://localhost:16800/jsonrpc';
      this.downloadHistory = result.downloadHistory ?? [];
      
      // NO cargar downloadQueue desde almacenamiento para evitar descargas viejas
      // this.downloadQueue siempre iniciará vacío
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Save settings to storage
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        minSizeMB: this.settings.minSizeMB,
        skipNext: this.settings.skipNext,
        motrixUrl: this.settings.motrixUrl,
        downloadHistory: this.downloadHistory.slice(-this.settings.maxHistoryItems)
        // NO guardar downloadQueue para evitar persistencia de descargas viejas
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Handle download creation
  async handleDownloadCreated(downloadItem) {
    try {
      // Skip if disabled
      if (this.settings.skipNext) {
        return;
      }

      // Validate URL
      if (!this.isValidDownloadUrl(downloadItem.url)) {
        return;
      }

      // Check file size and type
      if (!this.shouldInterceptDownload(downloadItem)) {
        return;
      }

      // Prevent duplicates
      if (this.duplicateTracker.has(downloadItem.url)) {
        return;
      }

      // Add to tracker with size limit check
      this.addToTracker(downloadItem.url);
      
      // Store download info before canceling (prevent data loss)
      const downloadInfo = {
        url: downloadItem.url,
        filename: downloadItem.filename || this.extractFilenameFromUrl(downloadItem.url),
        timestamp: Date.now(),
        retryCount: 0
      };
      
      // Add to queue first
      this.downloadQueue.set(downloadItem.url, downloadInfo);
      
      // Try to cancel the browser download
      try {
        await chrome.downloads.cancel(downloadItem.id);
        await chrome.downloads.erase({ id: downloadItem.id });
      } catch (cancelError) {
        // Download might already be completed or cancelled
        console.error('Error canceling download:', cancelError);
      }

      // Send to Motrix with retry logic
      const success = await this.sendToMotrixWithRetry(downloadInfo);
      
      if (success) {
        this.addToHistory(downloadInfo.url, downloadInfo.filename, 'success');
        this.showNotification('Download sent to Motrix successfully! 🎉', 'success');
        this.downloadQueue.delete(downloadInfo.url);
      } else {
        this.addToHistory(downloadInfo.url, downloadInfo.filename, 'error');
        this.showNotification('Failed to send download to Motrix', 'error');
        this.downloadQueue.delete(downloadInfo.url);
        // NO agregamos a retry queue para evitar descargas viejas
      }

    } catch (error) {
      console.error('Error handling download:', error);
      this.showNotification('Error processing download', 'error');
    }
  }

  // NEW: Validate download URL
  isValidDownloadUrl(url) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      
      // Block local files
      if (urlObj.protocol === 'file:') return false;
      
      // Block data URIs (usually small embedded files)
      if (urlObj.protocol === 'data:') return false;
      
      // Block chrome:// and chrome-extension:// URIs
      if (urlObj.protocol.startsWith('chrome')) return false;
      
      // Allow http, https, ftp, magnet
      const validProtocols = ['http:', 'https:', 'ftp:', 'magnet:'];
      if (!validProtocols.includes(urlObj.protocol)) return false;
      
      return true;
    } catch {
      // If URL parsing fails, it's probably a magnet link
      return url.startsWith('magnet:');
    }
  }

  // NEW: Add to tracker with size limit
  addToTracker(url) {
    // Prevent memory leak by limiting tracker size
    if (this.duplicateTracker.size >= this.maxDuplicateTrackerSize) {
      // Convert to array, keep last 80%, clear and re-add
      const entries = Array.from(this.duplicateTracker);
      const keepCount = Math.floor(this.maxDuplicateTrackerSize * 0.8);
      this.duplicateTracker.clear();
      entries.slice(-keepCount).forEach(entry => this.duplicateTracker.add(entry));
    }
    
    this.duplicateTracker.add(url);
  }

  // NEW: Send to Motrix with retry logic
  async sendToMotrixWithRetry(downloadInfo) {
    let attempts = 0;
    let lastError = null;
    
    while (attempts <= downloadInfo.retryCount) {
      try {
        const success = await this.sendToMotrix(downloadInfo.url, downloadInfo.filename);
        if (success) {
          return true;
        }
      } catch (error) {
        lastError = error;
      }
      
      attempts++;
      
      // Wait before retry (exponential backoff)
      if (attempts <= downloadInfo.retryCount) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    }
    
    console.error('Failed to send to Motrix after retries:', lastError);
    return false;
  }

  // Handle download state changes
  handleDownloadChanged(downloadDelta) {
    if (downloadDelta.state && downloadDelta.state.current === 'complete') {
      // Clean up completed downloads from tracking after delay
      const url = downloadDelta.url;
      if (url) {
        setTimeout(() => {
          this.duplicateTracker.delete(url);
          this.downloadQueue.delete(url);
        }, 30000); // Clean up after 30 seconds
      }
    }
    
    // Handle errors
    if (downloadDelta.error) {
      const url = downloadDelta.url;
      if (url && this.downloadQueue.has(url)) {
        // Download failed, remove from queue
        this.downloadQueue.delete(url);
      }
    }
  }

  // Check if download should be intercepted
  shouldInterceptDownload(downloadItem) {
    const url = downloadItem.url || downloadItem.finalUrl || '';
    const filename = downloadItem.filename || '';
    
    // Always check for magnet links first (they never have size info)
    const isMagnetLink = url.startsWith('magnet:');
    if (isMagnetLink) {
      return true;
    }

    // Check file extension
    const supportedExtensions = [
      '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
      '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v',
      '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma',
      '.exe', '.msi', '.dmg', '.deb', '.rpm', '.pkg', '.app',
      '.iso', '.img', '.bin', '.vhd', '.vmdk',
      '.torrent', '.pdf', '.epub', '.mobi',
      '.apk', '.ipa'
    ];

    const isSupportedFile = supportedExtensions.some(ext => 
      filename.toLowerCase().includes(ext) || url.toLowerCase().includes(ext)
    );

    // If it's not a supported file type, don't intercept
    if (!isSupportedFile) {
      return false;
    }

    // Check file size - STRICT: Only intercept if size is available and >= 5MB
    if (this.settings.minSizeMB > 0) {
      if (downloadItem.totalBytes && downloadItem.totalBytes > 0) {
        const sizeMB = downloadItem.totalBytes / (1024 * 1024);
        return sizeMB >= this.settings.minSizeMB;
      } else {
        // No size info available - DON'T intercept to be safe
        // This prevents intercepting small files without size info
        return false;
      }
    }
    
    return isSupportedFile;
  }

  // Send download to Motrix via RPC
  async sendToMotrix(url, filename = '') {
    try {
      // Validate inputs
      if (!url) {
        throw new Error('URL is required');
      }

      // Sanitize filename
      const sanitizedFilename = filename ? this.sanitizeFilename(filename) : undefined;

      const rpcCall = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'aria2.addUri',
        params: [[url], {
          'out': sanitizedFilename,
          'max-connection-per-server': '16',
          'split': '16',
          'continue': 'true',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' // Prevent blocking
        }]
      };

      const response = await fetch(this.settings.motrixUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(rpcCall),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`RPC Error: ${result.error.message || 'Unknown error'}`);
      }

      return !!result.result;
    } catch (error) {
      console.error('Error sending to Motrix:', error);
      return false;
    }
  }

  // NEW: Sanitize filename to prevent path traversal
  sanitizeFilename(filename) {
    if (!filename) return undefined;
    
    // Remove path separators and dangerous characters
    return filename
      .replace(/[/\\]/g, '_')  // Replace slashes
      .replace(/[<>:"|?*]/g, '_')  // Replace invalid characters
      .replace(/^\.+/, '_')  // No leading dots
      .trim()
      .substring(0, 255);  // Max filename length
  }

  // Add multiple URLs to Motrix
  async addMultipleDownloads(urls) {
    const results = [];
    
    for (const url of urls) {
      try {
        const success = await this.sendToMotrix(url);
        const filename = this.extractFilenameFromUrl(url);
        
        results.push({
          url,
          filename,
          status: success ? 'success' : 'error',
          timestamp: Date.now()
        });
        
        this.addToHistory(url, filename, success ? 'success' : 'error');
      } catch (error) {
        results.push({
          url,
          filename: this.extractFilenameFromUrl(url),
          status: 'error',
          timestamp: Date.now()
        });
      }
    }
    
    await this.saveSettings();
    return results;
  }

  // Extract filename from URL
  extractFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const filename = path.substring(path.lastIndexOf('/') + 1);
      return filename || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Add to download history
  addToHistory(url, filename, status) {
    const historyItem = {
      id: Date.now().toString(),
      url,
      filename,
      status,
      timestamp: Date.now()
    };
    
    this.downloadHistory.unshift(historyItem);
    
    // Keep only recent items
    if (this.downloadHistory.length > this.settings.maxHistoryItems) {
      this.downloadHistory = this.downloadHistory.slice(0, this.settings.maxHistoryItems);
    }
    
    this.saveSettings();
    
    // Notify popup about history update
    this.notifyHistoryUpdate();
  }

  // Notify popup about history update
  async notifyHistoryUpdate() {
    try {
      await chrome.runtime.sendMessage({ action: 'historyUpdated' });
    } catch (error) {
      // Popup might not be open, which is fine
    }
  }

  // Check Motrix connection
  async checkMotrixConnection() {
    try {
      const response = await fetch(this.settings.motrixUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'ping',
          method: 'aria2.getVersion',
          params: []
        })
      });
      
      if (!response.ok) {
        return { status: 'offline', error: `HTTP ${response.status}` };
      }
      
      const result = await response.json();
      
      if (result.error) {
        return { status: 'offline', error: result.error.message };
      }
      
      return { 
        status: 'online', 
        version: result.result?.version || 'unknown' 
      };
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    try {
      const icons = {
        success: '🟢',
        error: '🔴',
        warning: '🟡',
        info: '🔵'
      };
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Motrix Control',
        message: `${icons[type]} ${message}`
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Handle messages from popup
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSettings':
          sendResponse({ success: true, data: this.settings });
          break;
          
        case 'updateSettings':
          Object.assign(this.settings, request.data);
          await this.saveSettings();
          sendResponse({ success: true });
          break;
          
        case 'checkConnection':
          const connectionStatus = await this.checkMotrixConnection();
          sendResponse({ success: true, data: connectionStatus });
          break;
          
        case 'addDownloads':
          const results = await this.addMultipleDownloads(request.urls);
          sendResponse({ success: true, data: results });
          break;
          
        case 'getHistory':
          sendResponse({ success: true, data: this.downloadHistory });
          break;
          
        case 'clearHistory':
          this.downloadHistory = [];
          await this.saveSettings();
          sendResponse({ success: true });
          break;
          
        case 'getDownloadQueue':
          sendResponse({ 
            success: true, 
            data: Array.from(this.downloadQueue.entries()) 
          });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open
  }

  // Extension startup
  onStartup() {
    this.loadSettings();
  }

  // Extension installation
  onInstalled(details) {
    if (details.reason === 'install') {
      this.showNotification('Motrix Control installed successfully!', 'success');
    } else if (details.reason === 'update') {
      this.showNotification('Motrix Control updated to v3.0!', 'info');
    }
  }
}

// Initialize the manager
const motrixManager = new MotrixManager();

// Export for potential use in other contexts
self.motrixManager = motrixManager;
