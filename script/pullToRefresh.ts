// pullToRefresh.ts
// 封裝下拉更新（Pull to Refresh）邏輯

export function initPullToRefresh({
  dashboardSelector = '#status-dashboard-section',
  indicatorSelector = '#pull-to-refresh-indicator',
  onRefresh
}: {
  dashboardSelector?: string,
  indicatorSelector?: string,
  onRefresh: () => void
}) {
  const pullIndicator = document.querySelector(indicatorSelector) as HTMLElement;
  const dashboard = document.querySelector(dashboardSelector) as HTMLElement;
  if (!pullIndicator || !dashboard) return;
  const arrowIcon = pullIndicator.querySelector('.arrow-icon') as HTMLElement;
  const spinnerIcon = pullIndicator.querySelector('.spinner-icon') as HTMLElement;
  let startY = 0;
  let pullDistance = 0;
  const PULL_THRESHOLD = 80;
  dashboard.addEventListener('touchstart', (e: TouchEvent) => {
    if ((document.querySelector('#status-card-content') as HTMLElement).scrollTop === 0) {
      startY = e.touches[0].pageY;
    }
  }, { passive: true });
  dashboard.addEventListener('touchmove', (e: TouchEvent) => {
    if (startY === 0) return;
    const currentY = e.touches[0].pageY;
    pullDistance = currentY - startY;
    if (pullDistance > 0) {
      e.preventDefault();
      pullIndicator.style.transform = `translateY(${-50 + pullDistance / 2}px)`;
      if (pullDistance > PULL_THRESHOLD) {
        arrowIcon.style.transform = 'rotate(180deg)';
      } else {
        arrowIcon.style.transform = 'rotate(0deg)';
      }
    }
  }, { passive: false });
  dashboard.addEventListener('touchend', () => {
    if (pullDistance > PULL_THRESHOLD) {
      arrowIcon.style.display = 'none';
      spinnerIcon.classList.remove('hidden');
      pullIndicator.style.transform = `translateY(10px)`;
      if (typeof onRefresh === 'function') onRefresh();
      setTimeout(() => {
        pullIndicator.style.transform = 'translateY(-50px)';
        startY = 0;
        pullDistance = 0;
        setTimeout(() => {
          arrowIcon.style.display = 'block';
          arrowIcon.style.transform = 'rotate(0deg)';
          spinnerIcon.classList.add('hidden');
        }, 300);
      }, 2000);
    } else if (pullDistance > 0) {
      pullIndicator.style.transform = 'translateY(-50px)';
      startY = 0;
      pullDistance = 0;
    }
  });
} 