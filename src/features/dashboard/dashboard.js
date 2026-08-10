// Dashboard — hero carousel + 3×n category grid + quick-selection rows.
//
// Layout (top to bottom):
//   1. Hero carousel — auto-rotating featured category every 5s with
//      fade + scale animation. Each slide uses the category photo as
//      a full-bleed background, with name + item count + "Tap to start"
//      CTA overlaid at the bottom. Pagination dots + tap to navigate.
//   2. Slim summary bar (categories, items, orders today, sales today
//      for admin/cashier).
//   3. "Quick add" row — horizontally scrollable chips of every
//      available menu item, tap to add straight to cart (no navigation).
//   4. "Popular today" row — top 4 most-sold items today, with photo,
//      name, qty sold, and a quick-add button.
//   5. 3×n category grid — 9:16 portrait cards with image background,
//      name + count overlaid at bottom.
//   6. (Admin/cashier only) Recent orders list with Paid/Unpaid badges.

import { h, clear, formatMoney, formatMoney0, formatDate, toast } from '../../core/ui.js';
import { MenuProvider, CartProvider } from '../../core/providers/menu.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
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
  const availableItems = allItems.filter((i) => i.available);

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

  // -------- 3. Quick-add chips --------
  if (availableItems.length > 0) {
    root.append(renderQuickAddRow(availableItems));
  }

  // -------- 4. Popular today --------
  const popular = computePopularToday(completed);
  if (popular.length > 0) {
    root.append(renderPopularRow(popular));
  }

  // -------- 5. Category grid header + grid --------
  root.append(
    h('div', { style: { padding: '16px 16px 0', maxWidth: '1100px', margin: '0 auto', width: '100%' } }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 4px' } }, ['Categories']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', margin: '0' } }, [
        'Tap a category to start a new sale with that category pre-selected.',
      ]),
    ]),
  );

  const grid = h('div', { class: 'category-grid' }, []);
  if (cats.length === 0) {
    grid.append(
      h('div', { class: 'empty-state', style: { gridColumn: '1 / -1' } }, [
        'No categories yet.',
        h('br'),
        canSeeFinancials && user?.isAdmin
          ? 'Go to Menu → Categories to create your first category.'
          : 'Ask an admin to set up the menu.',
      ]),
    );
  } else {
    for (const c of cats) {
      grid.append(renderCategoryCard(c, allItems));
    }
  }
  root.append(grid);

  // -------- 6. Recent orders (admin/cashier only) --------
  if (canSeeFinancials) {
    root.append(renderRecentOrders(completed));
  }

  content.append(root);

  // Re-render when menu or orders change.
  const unsubMenu = store.subscribe(CHANNELS.menu, () => renderDashboard(content));
  const unsubOrders = store.subscribe(CHANNELS.orders, () => renderDashboard(content));
  const unsubAuth = store.subscribe(CHANNELS.auth, () => renderDashboard(content));
  const unsubCart = store.subscribe(CHANNELS.cart, () => renderDashboard(content));
  const obs = new MutationObserver(() => {
    if (!content.contains(root)) {
      unsubMenu();
      unsubOrders();
      unsubAuth();
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
  const obs = new MutationObserver(() => {
    if (!document.body.contains(carousel)) {
      if (_timer) clearInterval(_timer);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  return carousel;
}

// ------------------ Quick-add row ------------------

function renderQuickAddRow(items) {
  const row = h('div', { class: 'quick-add-row' }, []);
  for (const item of items) {
    const chip = h('button', {
      class: 'quick-add-chip',
      onclick: () => {
        CartProvider.addItem(item);
        toast(`Added ${item.name} to cart`, { type: 'success', duration: 1200 });
      },
    }, [
      h('span', { class: 'quick-add-chip__name' }, [item.name]),
      h('span', { class: 'quick-add-chip__price' }, [formatMoney0(item.price)]),
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '16px' } }, ['add']),
    ]);
    row.appendChild(chip);
  }

  return h('div', { class: 'quick-add-section' }, [
    h('div', { class: 'quick-add-header' }, [
      h('span', { class: 'section-title', style: { margin: '0' } }, ['Quick add']),
      h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, ['Tap to add to cart']),
    ]),
    row,
  ]);
}

// ------------------ Popular today ------------------

function computePopularToday(completedOrders) {
  // Aggregate item sales for today only.
  const now = new Date();
  const today = completedOrders.filter((o) => {
    if (!o.completedAt) return false;
    const c = new Date(o.completedAt);
    return c.getFullYear() === now.getFullYear() &&
           c.getMonth() === now.getMonth() &&
           c.getDate() === now.getDate();
  });

  const totals = new Map();
  for (const o of today) {
    for (const it of o.items) {
      const cur = totals.get(it.menuItemId) ?? { item: null, qty: 0, revenue: 0 };
      if (!cur.item) {
        const m = MenuProvider.items.find((x) => x.id === it.menuItemId);
        if (!m) continue;
        cur.item = m;
      }
      cur.qty += it.quantity;
      cur.revenue += it.lineTotal;
      totals.set(it.menuItemId, cur);
    }
  }
  return [...totals.values()]
    .filter((x) => x.item)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);
}

function renderPopularRow(popular) {
  const cards = popular.map((p) => {
    const card = h('div', {
      class: 'popular-card',
      onclick: () => {
        CartProvider.addItem(p.item);
        toast(`Added ${p.item.name} to cart`, { type: 'success', duration: 1200 });
      },
    }, []);

    const photo = h('div', { class: 'popular-card__photo' }, []);
    if (p.item.hasPhoto) {
      photo.style.backgroundImage = `url(${p.item.photoBase64})`;
    } else {
      photo.style.background = 'linear-gradient(135deg, var(--bg), var(--divider))';
      photo.style.color = 'var(--muted)';
      photo.textContent = p.item.name.charAt(0).toUpperCase();
    }
    card.append(
      photo,
      h('div', { class: 'popular-card__body' }, [
        h('div', { class: 'popular-card__name' }, [p.item.name]),
        h('div', { class: 'popular-card__meta' }, [
          h('span', { class: 'tag tag--success', style: { marginRight: '6px' } }, [`${p.qty} sold`]),
          h('span', { style: { color: 'var(--primary)', fontWeight: 700 } }, [formatMoney0(p.item.price)]),
        ]),
      ]),
    );
    return card;
  });

  return h('div', { class: 'popular-section' }, [
    h('div', { class: 'popular-header' }, [
      h('span', { class: 'section-title', style: { margin: '0' } }, ['Popular today']),
      h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, ['Tap to add to cart']),
    ]),
    h('div', { class: 'popular-grid' }, cards),
  ]);
}

// ------------------ Category card (9:16 portrait) ------------------

function renderCategoryCard(cat, allItems) {
  const items = allItems.filter((m) => m.categoryId === cat.id);
  const availableCount = items.filter((m) => m.available).length;
  const hex = '#' + (cat.colorValue & 0xffffff).toString(16).padStart(6, '0');

  const card = h('div', {
    class: 'category-card',
    onclick: () => navigate(`/orders/new?cat=${cat.id}`),
  }, []);

  // Photo (9:16 aspect, full-bleed)
  const photo = h('div', { class: 'category-card__photo' }, []);
  if (cat.hasPhoto) {
    photo.style.backgroundImage = `url(${cat.photoBase64})`;
  } else {
    photo.style.background = `linear-gradient(160deg, ${hex}cc, ${hex}33)`;
    photo.style.color = '#fff';
    photo.textContent = (cat.name.charAt(0) || '?').toUpperCase();
  }
  card.appendChild(photo);

  // Item-count chip floating at top-right
  card.appendChild(
    h('div', { class: 'category-card__count' }, [
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '12px' } }, ['inventory_2']),
      `${availableCount}/${items.length}`,
    ]),
  );

  // Bottom overlay with name + meta (gradient scrim for readability)
  card.appendChild(
    h('div', { class: 'category-card__overlay' }, [
      h('div', { class: 'category-card__name' }, [cat.name]),
      h('div', { class: 'category-card__meta' }, [
        `${availableCount} available`,
      ]),
    ]),
  );

  return card;
}

// ------------------ Recent orders ------------------

function renderRecentOrders(completed) {
  const section = h('div', { style: { padding: '16px', maxWidth: '1100px', margin: '0 auto', width: '100%' } }, [
    h('h2', { class: 'section-title', style: { margin: '0 0 8px' } }, ['Recent Orders']),
  ]);

  if (completed.length === 0) {
    section.append(
      h('div', { class: 'card' }, [
        h('div', { class: 'list-item' }, [
          h('div', { class: 'list-item__avatar' }, [
            h('span', { class: 'icon material-symbols-outlined' }, ['info']),
          ]),
          h('div', { class: 'list-item__main' }, [
            h('div', { class: 'list-item__title' }, ['No sales yet']),
            h('div', { class: 'list-item__subtitle' }, ['Tap a category above to ring up your first order.']),
          ]),
        ]),
      ]),
    );
    return section;
  }

  const card = h('div', { class: 'card', style: { padding: '0' } }, []);
  for (const o of completed.slice(0, 5)) {
    const receipt = ReceiptsProvider.findByOrderId(o.id);
    card.append(
      h('div', {
        class: 'list-item',
        onclick: () => receipt && navigate(`/receipts/${receipt.id}`),
      }, [
        h('div', { class: 'list-item__avatar' }, [
          h('span', { class: 'icon material-symbols-outlined' }, ['receipt']),
        ]),
        h('div', { class: 'list-item__main' }, [
          h('div', { class: 'list-item__title' }, [
            h('strong', {}, [o.orderNumber]),
            h('span', {
              class: `tag ${o.paid ? 'tag--paid' : 'tag--unpaid'}`,
              style: { marginLeft: '8px' },
            }, [o.paid ? 'Paid' : 'Unpaid']),
          ]),
          h('div', { class: 'list-item__subtitle' }, [
            `${formatDate(o.completedAt)} · ${o.cashierName} · ${o.itemCount} items`,
          ]),
        ]),
        h('div', { class: 'list-item__trailing' }, [formatMoney(o.total)]),
      ]),
    );
  }
  section.append(card);
  return section;
}

// ------------------ Helpers ------------------

function summaryStat(label, value) {
  return h('div', { class: 'dashboard-summary__stat' }, [
    h('div', { class: 'dashboard-summary__stat-label' }, [label]),
    h('div', { class: 'dashboard-summary__stat-value' }, [value]),
  ]);
}
