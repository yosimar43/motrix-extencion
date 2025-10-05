<script>
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut, backOut } from 'svelte/easing';

  let { status = 'unknown', onReady = () => {} } = $props();
  
  let isLoaded = $state(false);
  let showSecondary = $state(false);
  
  // Stagger animations
  $effect(() => {
    setTimeout(() => isLoaded = true, 100);
    setTimeout(() => showSecondary = true, 800);
    setTimeout(() => onReady(), 1200);
  });
</script>

<div class="welcome-container">
  {#if isLoaded}
    <!-- Logo and Brand -->
    <div 
      class="brand-section"
      transition:fly={{ y: -30, duration: 600, easing: quintOut }}
    >
      <div class="logo-container">
        <div class="logo-bg" transition:scale={{ duration: 800, easing: backOut }}>
          <div class="logo-icon">⚡</div>
          <div class="logo-shine"></div>
        </div>
        <div class="logo-rings">
          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
          <div class="ring ring-3"></div>
        </div>
      </div>
      
      <h1 class="brand-title" transition:fly={{ y: 20, duration: 600, delay: 200, easing: quintOut }}>
        Motrix Control
      </h1>
    </div>

    {#if showSecondary}
      <!-- Welcome Message -->
      <div 
        class="welcome-message"
        transition:fade={{ duration: 500 }}
      >
        <h2 class="welcome-title">¡Bienvenido a Motrix Control!</h2>
        <p class="welcome-subtitle">
          Tus descargas ahora están potenciadas con la integración avanzada de Motrix
        </p>
      </div>

      <!-- Status Indicator -->
      <div 
        class="status-display"
        transition:fly={{ y: 20, duration: 500, delay: 200, easing: quintOut }}
      >
        <div class="status-badge {status}">
          <div class="status-pulse {status}"></div>
          <div class="status-icon">
            {#if status === 'online'}
              ✓
            {:else if status === 'offline'}
              ✕
            {:else}
              ◦
            {/if}
          </div>
          <span class="status-text">
            {#if status === 'online'}
              Conectado y Listo
            {:else if status === 'offline'}
              Conectando...
            {:else}
              Inicializando...
            {/if}
          </span>
        </div>
      </div>

      <!-- Feature Highlights -->
      <div 
        class="features"
        transition:fly={{ y: 30, duration: 600, delay: 400, easing: quintOut }}
      >
        <div class="feature-item">
          <div class="feature-icon">🚀</div>
          <span>Intercepta descargas automáticamente</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <span>Filtrado inteligente por tamaño</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📱</div>
          <span>Sincronización en tiempo real</span>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* === WELCOME CONTAINER === */
  .welcome-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl) var(--spacing-lg);
    min-height: 500px;
    height: 100%;
    background: linear-gradient(135deg, var(--bg-primary) 0%, #0a0f1a 100%);
    position: relative;
    overflow: hidden;
    width: 100%;
  }

  .welcome-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 20%, rgba(0, 212, 160, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  /* === BRAND SECTION === */
  .brand-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--spacing-xl);
    z-index: 2;
  }

  .logo-container {
    position: relative;
    margin-bottom: var(--spacing-lg);
  }

  .logo-bg {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, var(--accent-primary), #00b894);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 
      0 10px 30px rgba(0, 212, 160, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 3;
    overflow: hidden;
  }

  .logo-icon {
    font-size: 32px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    z-index: 2;
    position: relative;
  }

  .logo-shine {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%);
    animation: shine 3s ease-in-out infinite;
    transform: rotate(45deg);
  }

  @keyframes shine {
    0%, 100% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    50% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }

  .logo-rings {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  .ring {
    position: absolute;
    border: 2px solid var(--accent-primary);
    border-radius: 50%;
    opacity: 0.3;
    animation: pulse-ring 3s ease-in-out infinite;
  }

  .ring-1 {
    width: 100px;
    height: 100px;
    top: -50px;
    left: -50px;
    animation-delay: 0s;
  }

  .ring-2 {
    width: 120px;
    height: 120px;
    top: -60px;
    left: -60px;
    animation-delay: 1s;
  }

  .ring-3 {
    width: 140px;
    height: 140px;
    top: -70px;
    left: -70px;
    animation-delay: 2s;
  }

  @keyframes pulse-ring {
    0%, 100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.1;
    }
  }

  .brand-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    text-align: center;
    margin: 0;
    background: linear-gradient(135deg, var(--text-primary), var(--accent-primary));
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 8px rgba(0, 212, 160, 0.2);
  }

  /* === WELCOME MESSAGE === */
  .welcome-message {
    text-align: center;
    margin-bottom: var(--spacing-xl);
    z-index: 2;
  }

  .welcome-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-sm) 0;
    line-height: 1.3;
  }

  .welcome-subtitle {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.4;
    max-width: 280px;
  }

  /* === STATUS DISPLAY === */
  .status-display {
    margin-bottom: var(--spacing-xl);
    z-index: 2;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    position: relative;
    overflow: hidden;
  }

  .status-badge.online {
    border-color: var(--accent-primary);
    box-shadow: 0 0 20px rgba(0, 212, 160, 0.2);
  }

  .status-badge.offline {
    border-color: var(--accent-danger);
  }

  .status-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    position: relative;
  }

  .status-pulse.online {
    background: var(--accent-primary);
    animation: pulse-success 2s ease-in-out infinite;
  }

  .status-pulse.offline {
    background: var(--accent-danger);
    animation: pulse-error 2s ease-in-out infinite;
  }

  .status-pulse.unknown {
    background: var(--accent-warning);
    animation: pulse-warning 2s ease-in-out infinite;
  }

  @keyframes pulse-success {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
  }

  @keyframes pulse-error {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
  }

  @keyframes pulse-warning {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
  }

  .status-icon {
    font-size: 12px;
    font-weight: 700;
  }

  .status-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  /* === FEATURES === */
  .features {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    z-index: 2;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--text-muted);
    backdrop-filter: blur(10px);
  }

  .feature-icon {
    font-size: 14px;
    opacity: 0.8;
  }

  /* === RESPONSIVE === */
  @media (max-width: 400px) {
    .welcome-container {
      padding: var(--spacing-lg) var(--spacing-md);
      min-height: 350px;
    }
    
    .logo-bg {
      width: 70px;
      height: 70px;
    }
    
    .logo-icon {
      font-size: 28px;
    }
    
    .brand-title {
      font-size: 24px;
    }
    
    .welcome-title {
      font-size: 16px;
    }
  }
</style>