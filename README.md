# ⚡ ![Version](https://img.shields.io/badge/version-3.2.1-blue.svg)otrix Control - Advanced Download Manager

**A modern Chrome extension for Motrix download manager with intelligent file filtering, elegant UI animations, and seamless browser integration.**

![Version](https://img.shields.io/badge/version-3.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![Svelte](https://img.shields.io/badge/svelte-5.39-orange.svg)
![Vite](https://img.shields.io/badge/vite-7.1-purple.svg)
![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)

## ✨ Features

### 🎯 **Core Functionality**
- **Automatic Download Interception**: Captures browser downloads and redirects them to Motrix
- **Smart File Filtering**: Configurable minimum file size with improved logic for unknown file sizes
- **Duplicate Prevention**: Advanced URL tracking to prevent duplicate downloads with memory-safe limits
- **Real-time Status Monitoring**: Live connection status with animated indicators
- **Intelligent Skip Mode**: Temporarily disable download interception with visual feedback
- **Auto-Retry System**: Automatic retry for failed downloads with exponential backoff (up to 3 attempts)
- **Download Queue**: Persistent queue prevents data loss even if Motrix is offline
- **URL Validation**: Blocks dangerous protocols (file://, data:, chrome://) for security
- **Filename Sanitization**: Prevents path traversal attacks with complete filename sanitization
- **Request Timeout**: 10-second timeout prevents hanging connections

### 🎨 **Modern UI & UX**
- **Welcome Screen**: Elegant onboarding with animated logo and feature highlights
- **Professional Design**: Dark dashboard theme with unified CSS variable system
- **Smooth Transitions**: Carefully orchestrated animations between screens
- **Interactive Elements**: Hover effects, status indicators, and micro-interactions
- **Responsive Layout**: 380px optimized popup with perfect centering
- **Skip Controls**: Intelligent skip button for advanced users

### � **Download Management**
- **History Tracking**: Complete download history with status indicators (success ✓, error ✕, pending •)
- **URL Truncation**: Smart URL display with domain extraction and tooltips
- **Retry Functionality**: One-click retry for failed downloads
- **Real-time Updates**: Live status updates with Chrome messaging
- **Storage Sync**: Persistent settings and history across browser sessions

### ⚙️ **Advanced Configuration**
- **Size Filtering**: Minimum file size with fallback for unknown sizes
- **File Type Support**: Expanded support for archives, media, software, and torrents
- **Connection Testing**: Built-in Motrix connectivity verification
- **Background Processing**: Service worker for seamless operation
- **Settings Persistence**: Auto-save configuration changes

## 🚀 **Installation & Setup**

### **Prerequisites**
- Chrome browser (latest version)
- Motrix download manager installed and running
- Motrix RPC server enabled (default: localhost:16800)

### **Development Setup**
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd motrix-extencion
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
   - Enable RPC server in Motrix settings (Preferences → Advanced → JSON-RPC)
   - Default RPC URL: `http://localhost:16800/jsonrpc`
   - Verify connection using the "Test Connection" button in the extension

## 🎮 **Usage Guide**

### **First Launch Experience**
1. **Welcome Screen**: Experience the animated welcome with logo and feature highlights
2. **Skip Option**: Use the skip button for immediate access (top-right corner)
3. **Auto-transition**: Wait for automatic transition after initialization completes

### **Basic Usage**
1. **Install and Activate**: Load the extension in Chrome
2. **Test Connection**: Click the extension icon and use "Test Connection" button
3. **Configure Settings**: Set minimum download size (MB) in the settings section
4. **Skip Mode**: Toggle "Skip Next" to temporarily disable interception
5. **Auto-Interception**: Supported downloads will automatically redirect to Motrix

### **Download History**
1. **View History**: Check the history section for all download attempts
2. **Status Indicators**: 
   - ✓ Green circle: Successfully sent to Motrix
   - ✕ Red circle: Failed to send
   - • Yellow circle: Pending/In progress
3. **Retry Downloads**: Click the ↗ button to resend failed downloads
4. **URL Details**: Hover over truncated URLs to see full addresses

### **Settings Management**
1. **Minimum Size**: Set the minimum file size (in MB) for interception
2. **Skip Mode**: Temporarily disable download interception
3. **Real-time Sync**: Settings automatically save and sync
4. **Connection Status**: Monitor Motrix connection with live status indicator

## ⚡ **Supported File Types**

The extension automatically detects and intercepts:
- **Archives**: .zip, .rar, .7z, .tar, .gz, .bz2, .xz
- **Videos**: .mp4, .avi, .mkv, .mov, .wmv, .flv, .webm, .m4v
- **Audio**: .mp3, .wav, .flac, .aac, .ogg, .m4a, .wma
- **Software**: .exe, .msi, .dmg, .deb, .rpm, .pkg, .app
- **Disk Images**: .iso, .img, .bin, .vhd, .vmdk
- **Documents**: .pdf, .epub, .mobi
- **Mobile Apps**: .apk, .ipa
- **Torrents**: .torrent files and magnet: links

### **Smart Size Filtering**
- **Known Sizes**: Files with known sizes are filtered by the minimum size setting
- **Unknown Sizes**: Files without size information are allowed through (common for direct links)
- **Magnet Links**: Always processed regardless of size (no size information available)
- **Heuristic Processing**: Intelligent handling of streaming and dynamic content

## 🔧 **Technical Architecture**

### **Frontend Stack**
- **Framework**: Svelte 5.39 with runes syntax ($state, $effect, $derived)
- **Build System**: Vite 7.1 with optimized Chrome extension configuration
- **Styling**: Pure CSS with CSS Variables design system
- **Components**: Welcome screen, Main interface, History viewer
- **Animations**: Svelte transitions (fade, fly, scale) with custom easing

### **Backend Integration**
- **Service Worker**: Chrome Manifest V3 background script
- **Chrome APIs**: Downloads, Storage, Notifications, Runtime messaging
- **RPC Communication**: JSON-RPC 2.0 protocol for Motrix integration
- **Storage**: Chrome local storage with real-time sync
- **Message Passing**: Background ↔ Popup communication system

### **Design System**
- **Color Palette**: Dark dashboard theme (#0d1117 primary, #00d4a0 accent)
- **Spacing System**: Consistent spacing scale (4px to 20px)
- **Typography**: System fonts with proper hierarchy
- **Component Architecture**: Modular Svelte components
- **Responsive**: 380px optimized popup layout

### **Development Tools**
- **Hot Reload**: Vite development server
- **TypeScript**: JSDoc comments for type safety
- **ESLint**: Code quality and consistency
- **Build Optimization**: Tree shaking and minification

## 🎨 **UI/UX Highlights**

### **Welcome Experience**
- **Animated Logo**: Gradient logo with pulsing rings and shine effects
- **Progressive Disclosure**: Staggered animations reveal content step by step
- **Loading Progress**: Visual progress bar with completion feedback
- **Skip Option**: Intelligent skip button for advanced users
- **Smooth Transitions**: Orchestrated fade-out → fade-in sequence

### **Main Interface**
- **Mini Brand**: Compact logo with live status indicator
- **Section Cards**: Clean card-based layout with hover effects
- **Status Badges**: Animated connection status with pulse effects
- **History Component**: Compact download history with smart URL truncation
- **Responsive Design**: Perfect centering and mobile-optimized layout

### **Micro-Interactions**
- **Button States**: Hover, active, and disabled states with smooth transitions
- **Status Indicators**: Pulsing dots for connection status
- **Loading Spinners**: Custom CSS spinners for connection testing
- **Card Animations**: Subtle lift effects on hover
- **Color Transitions**: Smooth color changes based on state

## 🚦 **Current Status & Features**

### **✅ Completed Features**
- ✅ Automatic download interception with smart filtering
- ✅ Professional welcome screen with animations
- ✅ Real-time connection testing and status monitoring
- ✅ Download history with retry functionality
- ✅ Settings persistence and real-time sync
- ✅ Chrome Manifest V3 compliance
- ✅ Responsive design with perfect centering
- ✅ Error handling and fallback mechanisms

### **🎯 Current Capabilities**
- File size filtering with intelligent fallbacks
- 18+ supported file types including torrents and magnet links
- Real-time storage synchronization between popup and background
- Professional UI transitions and micro-interactions
- Comprehensive error handling and user feedback

## 📄 **License**

MIT License - Built with ❤️ using Svelte 5, Vite, and modern web technologies.
