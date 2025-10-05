// Motrix Control - Background Service Worker
// Manages downloads, storage, and communication with Motrix RPC

class MotrixManager {
  constructor() {
    this.downloadQueue = new Map();
    this.downloadHistory = [];
    this.activeDownloads = new Set();
    this.duplicateTracker = new Set();
    this.settings = {
      minSizeMB: 5,
      skipNext: false,
      motrixUrl: 'http://localhost:16800/jsonrpc',
      maxHistoryItems: 100
    };
    
    this.initializeListeners();
    this.loadSettings();
  }

  // Initialize all event listeners
  initializeListeners() {
    // Download interception
    chrome.downloads.onCreated.addListener(this.handleDownloadCreated.bind(this));
    chrome.downloads.onChanged.addListener(this.handleDownloadChanged.bind(this));
    
    // Message handling from popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Extension startup
    chrome.runtime.onStartup.addListener(this.onStartup.bind(this));
    chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
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
      
      // Restore download queue
      if (result.downloadQueue) {
        this.downloadQueue = new Map(result.downloadQueue);
      }
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
        downloadHistory: this.downloadHistory.slice(-this.settings.maxHistoryItems),
        downloadQueue: Array.from(this.downloadQueue.entries())
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
        console.log('Skipping download due to skip mode');
        return;
      }

      // Check file size and type
      if (!this.shouldInterceptDownload(downloadItem)) {
        return;
      }

      // Prevent duplicates
      if (this.duplicateTracker.has(downloadItem.url)) {
        console.log('Duplicate download detected, skipping');
        return;
      }

      this.duplicateTracker.add(downloadItem.url);
      
      // Cancel the browser download
      await chrome.downloads.cancel(downloadItem.id);
      await chrome.downloads.erase({ id: downloadItem.id });

      // Add to Motrix
      const success = await this.sendToMotrix(downloadItem.url, downloadItem.filename);
      
      if (success) {
        this.addToHistory(downloadItem.url, downloadItem.filename, 'success');
        this.showNotification('Download sent to Motrix successfully! 🎉', 'success');
      } else {
        this.addToHistory(downloadItem.url, downloadItem.filename, 'error');
        this.showNotification('Failed to send download to Motrix', 'error');
      }

    } catch (error) {
      console.error('Error handling download:', error);
      this.showNotification('Error processing download', 'error');
    }
  }

  // Handle download state changes
  handleDownloadChanged(downloadDelta) {
    if (downloadDelta.state && downloadDelta.state.current === 'complete') {
      // Clean up completed downloads from tracking
      setTimeout(() => {
        this.duplicateTracker.delete(downloadDelta.url);
      }, 30000); // Clean up after 30 seconds
    }
  }

  // Check if download should be intercepted
  shouldInterceptDownload(downloadItem) {
    // Check file size (if available)
    if (downloadItem.totalBytes && downloadItem.totalBytes > 0) {
      const sizeMB = downloadItem.totalBytes / (1024 * 1024);
      if (sizeMB < this.settings.minSizeMB) {
        return false;
      }
    }

    // Check file extension
    const url = downloadItem.url || downloadItem.finalUrl || '';
    const filename = downloadItem.filename || '';
    
    const supportedExtensions = [
      '.zip', '.rar', '.7z', '.tar', '.gz',
      '.mp4', '.avi', '.mkv', '.mov', '.wmv',
      '.mp3', '.wav', '.flac', '.aac',
      '.exe', '.msi', '.dmg', '.deb', '.rpm',
      '.iso', '.img', '.bin',
      '.torrent'
    ];

    const isSupportedFile = supportedExtensions.some(ext => 
      filename.toLowerCase().includes(ext) || url.toLowerCase().includes(ext)
    );

    // Also check for magnet links
    const isMagnetLink = url.startsWith('magnet:');
    
    return isSupportedFile || isMagnetLink;
  }

  // Send download to Motrix via RPC
  async sendToMotrix(url, filename = '') {
    try {
      const rpcCall = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'aria2.addUri',
        params: [[url], {
          'out': filename || undefined,
          'max-connection-per-server': '16',
          'split': '16',
          'continue': 'true'
        }]
      };

      const response = await fetch(this.settings.motrixUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcCall)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`RPC Error: ${result.error.message}`);
      }

      return !!result.result;
    } catch (error) {
      console.error('Error sending to Motrix:', error);
      return false;
    }
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
      console.log('Popup not available for history update notification');
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
    console.log('Motrix Control: Service worker started');
    this.loadSettings();
  }

  // Extension installation
  onInstalled(details) {
    if (details.reason === 'install') {
      console.log('Motrix Control: Extension installed');
      this.showNotification('Motrix Control installed successfully!', 'success');
    } else if (details.reason === 'update') {
      console.log('Motrix Control: Extension updated');
      this.showNotification('Motrix Control updated to v3.0!', 'info');
    }
  }
}

// Initialize the manager
const motrixManager = new MotrixManager();

// Export for potential use in other contexts
self.motrixManager = motrixManager;
