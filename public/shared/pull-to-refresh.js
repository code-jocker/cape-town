/* Pull-to-refresh utility — mobile native feel */

export function createPullToRefresh(container, onRefresh, options = {}) {
  const {
    threshold = 80,
    maxPull = 120,
    resistance = 2.5,
    loadingText = 'Release to refresh…',
    pullingText = 'Pull to refresh…',
    refreshText = 'Refreshing…',
  } = options;

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let isRefreshing = false;
  let pullDistance = 0;

  const indicator = document.createElement('div');
  indicator.className = 'ptr-indicator';
  indicator.style.cssText = `
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-muted);
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.2s ease;
    opacity: 0;
  `;
  indicator.textContent = pullingText;

  const spinner = document.createElement('div');
  spinner.className = 'ptr-spinner';
  spinner.style.cssText = `
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-divider);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin-right: 8px;
    display: none;
  `;

  indicator.prepend(spinner);
  container.style.position = 'relative';
  container.prepend(indicator);

  function onTouchStart(e) {
    if (isRefreshing) return;
    if (container.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    isPulling = true;
    indicator.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!isPulling || isRefreshing) return;
    currentY = e.touches[0].clientY;
    pullDistance = Math.max(0, (currentY - startY) / resistance);

    if (pullDistance > 0) {
      e.preventDefault();
      indicator.style.opacity = '1';
      container.style.transform = `translateY(${Math.min(pullDistance, maxPull)}px)`;

      if (pullDistance >= threshold) {
        indicator.textContent = loadingText;
        indicator.style.color = 'var(--color-primary)';
        spinner.style.display = 'block';
      } else {
        indicator.textContent = pullingText;
        indicator.style.color = 'var(--color-text-muted)';
        spinner.style.display = 'none';
      }
    }
  }

  async function onTouchEnd() {
    if (!isPulling || isRefreshing) return;
    isPulling = false;

    if (pullDistance >= threshold) {
      isRefreshing = true;
      indicator.textContent = refreshText;
      spinner.style.display = 'block';
      container.style.transition = 'transform 0.3s var(--ease)';
      container.style.transform = `translateY(50px)`;

      try {
        await onRefresh();
      } finally {
        isRefreshing = false;
        reset();
      }
    } else {
      reset();
    }
  }

  function reset() {
    container.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    container.style.transform = 'translateY(0)';
    indicator.style.transition = 'opacity 0.2s ease';
    indicator.style.opacity = '0';
    pullDistance = 0;
    setTimeout(() => {
      indicator.textContent = pullingText;
      indicator.style.color = 'var(--color-text-muted)';
      spinner.style.display = 'none';
    }, 300);
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd, { passive: true });
  container.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return {
    destroy() {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      indicator.remove();
    },
    trigger: () => {
      if (!isRefreshing) {
        isRefreshing = true;
        indicator.style.opacity = '1';
        indicator.textContent = refreshText;
        spinner.style.display = 'block';
        container.style.transition = 'transform 0.3s var(--ease)';
        container.style.transform = 'translateY(50px)';
        onRefresh().finally(reset);
      }
    },
  };
}

export default createPullToRefresh;