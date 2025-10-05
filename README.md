# 🚀 Motrix Control - Advanced Download Manager

**A modern Chrome extension for Motrix download manager with multi-link support, advanced UI, and seamless browser integration.**

![Version](https://img.shields.io/badge/version-3.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![Svelte](https://img.shields.io/badge/svelte-5-orange.svg)
![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)

## ✨ Features

### 🎯 **Core Functionality**
- **Automatic Download Interception**: Captures browser downloads and redirects them to Motrix
- **Smart File Filtering**: Configurable minimum file size and supported file types
- **Duplicate Prevention**: Advanced tracking to prevent duplicate downloads
- **Real-time Status**: Live connection status with Motrix RPC server

### 📥 **Multi-Link Download Manager**
- **Batch URL Processing**: Add multiple download links at once
- **Smart URL Detection**: Automatically extracts HTTP, HTTPS, magnet, and torrent links
- **Download Queue Management**: Track, start, pause, and delete downloads
- **Progress Tracking**: Visual progress indicators for active downloads
- **Status Monitoring**: Real-time status updates (pending, active, finished, error)

### 📋 **Copy & Paste Zone**
- **Intelligent URL Parsing**: Paste multiple URLs and automatically detect download links
- **Clipboard Integration**: One-click paste from clipboard
- **URL Preview**: Live preview of detected URLs before adding
- **Batch Operations**: Copy all URLs, clear history, and bulk actions

### 📜 **Download History**
- **Complete History Tracking**: Track all download attempts with timestamps
- **Status Filtering**: Filter by success, error, or all downloads
- **Retry Failed Downloads**: One-click retry for failed downloads
- **URL Management**: Copy URLs to clipboard, view full details
- **History Cleanup**: Clear history with confirmation modal

### ⚙️ **Advanced Settings**
- **Configurable Minimum Size**: Set minimum file size for interception
- **Skip Mode**: Temporarily disable download interception
- **Connection Testing**: Test and verify Motrix RPC connection
- **Real-time Sync**: Settings automatically sync between popup and background

### 🎨 **Modern UI & Animations**
- **Tabbed Interface**: Clean navigation between Home, Downloads, and History
- **Dark Theme**: Professional dark theme with CSS variables
- **Smooth Animations**: CSS-only animations (fadeIn, slideUp, scaleIn, pulse)
- **Interactive Elements**: Hover effects, loading states, and transitions
- **Responsive Design**: Optimized for Chrome extension popup (420px width)
- **Status Indicators**: Visual status badges with animated indicators

## 🚀 **Installation & Setup**

### **Prerequisites**
- Chrome browser (latest version)
- Motrix download manager installed and running
- Motrix RPC server enabled (default: localhost:16800)

### **Development Setup**
1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/motrix-control
   cd motrix-control
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development Mode**
   ```bash
   npm run dev
   ```

4. **Build Extension**
   ```bash
   npm run build
   ```

### **Chrome Extension Installation**
1. **Build the Extension**
   ```bash
   npm run build
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the `dist` folder
   - The extension icon should appear in your toolbar

3. **Configure Motrix**
   - Ensure Motrix is running
   - Enable RPC server in Motrix settings
   - Default RPC URL: `http://localhost:16800/jsonrpc`

## 🎮 **Usage Guide**

### **Basic Usage**
1. **Install and Activate**: Load the extension in Chrome
2. **Test Connection**: Click the extension icon and test Motrix connection
3. **Configure Settings**: Set minimum download size and preferences
4. **Auto-Interception**: Downloads will automatically redirect to Motrix

### **Multi-Link Downloads**
1. **Navigate to Downloads Tab**: Click the Downloads tab in the popup
2. **Use Copy & Paste Zone**: Paste multiple URLs in the text area
3. **Add to Motrix**: Click "Add to Motrix" to process all URLs
4. **Monitor Progress**: Track download status and progress

## ⚡ **Supported File Types**

The extension automatically detects and intercepts:
- **Archives**: .zip, .rar, .7z, .tar, .gz
- **Videos**: .mp4, .avi, .mkv, .mov, .wmv
- **Audio**: .mp3, .wav, .flac, .aac
- **Software**: .exe, .msi, .dmg, .deb, .rpm
- **Images**: .iso, .img, .bin
- **Torrents**: .torrent files and magnet links

## 🔧 **Technical Architecture**

Built with modern web technologies:
- **Frontend**: Svelte 5 with new runes syntax ($state, $effect, $derived)
- **Build System**: Vite with custom Chrome extension configuration
- **Styling**: Pure CSS with custom variables and animations
- **Chrome APIs**: Downloads, Storage, Notifications, Runtime messaging
- **RPC Communication**: JSON-RPC 2.0 for Motrix integration

## 📄 **License**

MIT License - Built with ❤️ using Svelte 5, Vite, and modern web technologies.
