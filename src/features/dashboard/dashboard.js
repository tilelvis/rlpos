// Dashboard — hero carousel + summary bar.
//
// Layout (top to bottom):
//   1. Hero carousel — auto-rotating featured category every 5s with
//      fade + scale animation. Each slide uses the category photo as
//      a full-bleed background, with name + item count + "Tap to start"
//      CTA overlaid at the bottom. Pagination dots + tap to navigate.
//   2. Slim summary bar (categories, items, orders today, sales today
//      for admin/cashier).

import { h, clear, formatMoney, formatMoney0, formatDate } from '../../core/ui.js';
import { MenuProvider } from '../../core/providers/menu.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { store, CHANNELS } from '../../core/store.js';
import { navigate } from '../../core/router.js';

export function renderDashboard(content) {
  clear(content);

  const user = AuthProvider.currentUser;
  const canSeeFinancials = !!user && user.canViewFinancials;

  const completed = OrdersProvider.completedOrders;
  const now = new Date();
  const todayCompleted = completed.filter((o) => {
    if (!o.completedAt) return false;
    const c = new Date(o.completedAt);
    return c.getFullYear() === now.getFullYear() &&
           c.getMonth() === now.getMonth() &&
           c.getDate() === now.getDate();
  });
  const salesToday = todayCompleted.reduce((s, o) => s + o.total, 0);
  const ordersToday = todayCompleted.length;

  const cats = MenuProvider.categories;
  const allItems = MenuProvider.items;

  const root = h('div', { style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', overflowY: 'auto' } }, []);

  // -------- 1. Hero carousel --------
  if (cats.length > 0) {
    root.append(renderCarousel(cats));
  }

  // -------- 2. Summary bar --------
  const summary = h('div', { class: 'dashboard-summary' }, []);
  summary.append(
    summaryStat('CATEGORIES', String(cats.length)),
    h('div', { class: 'dashboard-summary__divider' }, []),
    summaryStat('ITEMS', String(allItems.length)),
    h('div', { class: 'dashboard-summary__divider' }, []),
    summaryStat('ORDERS TODAY', String(ordersToday)),
  );
  if (canSeeFinancials) {
    summary.append(
      h('div', { class: 'dashboard-summary__divider' }, []),
      summaryStat('SALES TODAY', formatMoney0(salesToday)),
    );
  }
  root.append(summary);

  content.append(root);

  // Re-render when menu or cart changes. The app shell already
  // subscribes to CHANNELS.orders and CHANNELS.auth and calls
  // drawContent() which re-invokes renderDashboard(). We do NOT
  // subscribe to orders or auth here because:
  //   1. It would cause renderDashboard to run TWICE per change
  //   2. Worse: subscribing to orders INSIDE renderDashboard (which
  //      is triggered by an orders bump) adds a new listener to the
  //      Set DURING iteration — JavaScript's Set iterator visits
  //      newly-added members, causing an infinite loop that wedges
  //      the event loop.
  const unsubMenu = store.subscribe(CHANNELS.menu, () => renderDashboard(content));
  const unsubCart = store.subscribe(CHANNELS.cart, () => renderDashboard(content));
  const obs = new MutationObserver(() => {
    if (!content.contains(root)) {
      unsubMenu();
      unsubCart();
      obs.disconnect();
    }
  });
  obs.observe(content, { childList: true });
}

// ------------------ Carousel ------------------

function renderCarousel(categories) {
  // Only show categories that have a photo OR at least 1 item.
  const slides = categories.filter((c) => {
    const items = MenuProvider.items.filter((m) => m.categoryId === c.id);
    return items.length > 0;
  });
  if (slides.length === 0) return h('div', {}, []);

  let _current = 0;
  let _timer = null;
  let _paused = false;

  const carousel = h('div', { class: 'carousel' }, []);
  const viewport = h('div', { class: 'carousel__viewport' }, []);
  const dots = h('div', { class: 'carousel__dots' }, []);

  function buildSlide(cat, i) {
    const items = MenuProvider.items.filter((m) => m.categoryId === cat.id);
    const availableCount = items.filter((m) => m.available).length;
    const hex = '#' + (cat.colorValue & 0xffffff).toString(16).padStart(6, '0');

    const slide = h('div', {
      class: `carousel__slide ${i === 0 ? 'active' : ''}`,
      'data-index': String(i),
      onclick: () => navigate(`/orders/new?cat=${cat.id}`),
    }, []);

    // Background image (or color tint fallback)
    const bg = h('div', { class: 'carousel__bg' }, []);
    if (cat.hasPhoto) {
      bg.style.backgroundImage = `url(${cat.photoBase64})`;
    } else {
      bg.style.background = `linear-gradient(135deg, ${hex}cc, ${hex}66)`;
    }
    slide.appendChild(bg);

    // Bottom overlay with category info + CTA
    slide.appendChild(
      h('div', { class: 'carousel__overlay' }, [
        h('div', { class: 'carousel__name' }, [cat.name]),
        h('div', { class: 'carousel__meta' }, [
          `${availableCount} available · ${items.length} total`,
        ]),
        h('div', { class: 'carousel__cta' }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '16px' } }, ['arrow_forward']),
          'Tap to start',
        ]),
      ]),
    );

    return slide;
  }

  for (let i = 0; i < slides.length; i++) {
    viewport.appendChild(buildSlide(slides[i], i));
    dots.appendChild(
      h('button', {
        class: `carousel__dot ${i === 0 ? 'active' : ''}`,
        'data-index': String(i),
        'aria-label': `Go to slide ${i + 1}`,
        onclick: () => goTo(i, true),
      }, []),
    );
  }

  carousel.appendChild(viewport);
  carousel.appendChild(dots);

  function goTo(idx, userTriggered = false) {
    if (idx === _current) return;
    _current = (idx + slides.length) % slides.length;
    viewport.querySelectorAll('.carousel__slide').forEach((s) => {
      s.classList.toggle('active', Number(s.dataset.index) === _current);
    });
    dots.querySelectorAll('.carousel__dot').forEach((d) => {
      d.classList.toggle('active', Number(d.dataset.index) === _current);
    });
    if (userTriggered) restartTimer();
  }

  function next() {
    if (_paused) return;
    goTo(_current + 1);
  }

  function restartTimer() {
    if (_timer) clearInterval(_timer);
    _timer = setInterval(next, 5000);
  }
  restartTimer();

  // Pause on hover (desktop) and on touch (mobile).
  carousel.addEventListener('mouseenter', () => { _paused = true; });
  carousel.addEventListener('mouseleave', () => { _paused = false; });

  // Touch swipe support
  let _touchStartX = 0;
  carousel.addEventListener('touchstart', (e) => {
    _touchStartX = e.touches[0].clientX;
    _paused = true;
  }, { passive: true });
  carousel.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - _touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) goTo(_current - 1, true);
      else goTo(_current + 1, true);
    }
    _paused = false;
  }, { passive: true });

  // Clean up the timer when the carousel leaves the DOM.
  // NOTE: we deliberately do NOT use a MutationObserver on document.body
  // with subtree:true — that would fire for every DOM mutation during
  // dashboard re-renders (hundreds of nodes), causing the event loop to
  // wedge. Instead, we poll on a 2-second interval: cheap, reliable, and
  // doesn't block. The carousel element is GC'd once it's removed from
  // the DOM and no references remain.
  const cleanup = setInterval(() => {
    if (!document.body.contains(carousel)) {
      if (_timer) clearInterval(_timer);
      clearInterval(cleanup);
    }
  }, 2000);

  return carousel;
}

// ------------------ Helpers ------------------

function summaryStat(label, value) {
  return h('div', { class: 'dashboard-summary__stat' }, [
    h('div', { class: 'dashboard-summary__stat-label' }, [label]),
    h('div', { class: 'dashboard-summary__stat-value' }, [value]),
  ]);
}
