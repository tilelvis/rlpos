// New Order page — menu grid + cart + complete sale
// (port of lib/features/orders/new_order_page.dart).

import { h, clear, toast, formatMoney } from '../../core/ui.js';
import { MenuProvider, CartProvider } from '../../core/providers/menu.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { store, CHANNELS } from '../../core/store.js';
import { navigate } from '../../core/router.js';

export function renderNewOrder(content) {
  clear(content);

  // Local UI state (not persisted).
  let _selectedCategoryId = null;
  let _searchQuery = '';
  let _completing = false;

  const wrap = h('div', { class: 'new-order-wrap' }, []);

  // ----- Menu side -----
  const menuSide = h('div', { class: 'new-order-menu' }, []);
  const searchBar = h('input', {
    class: 'input',
    placeholder: 'Search menu…',
    style: { margin: '12px 16px 8px', width: 'auto' },
    oninput: (e) => {
      _searchQuery = e.target.value;
      drawMenuGrid();
    },
  });
  const chipRow = h('div', {
    style: { display: 'flex', gap: '6px', padding: '0 12px 4px', overflowX: 'auto' },
  }, []);
  const menuGrid = h('div', { class: 'menu-grid' }, []);
  menuSide.append(searchBar, chipRow, menuGrid);

  // ----- Cart side -----
  const cartSide = h('div', { class: 'new-order-cart' }, []);
  const cartHead = h('div', { class: 'cart-head' }, [
    h('span', { class: 'icon material-symbols-outlined' }, ['shopping_cart']),
    h('span', { class: 'cart-head__title' }, ['Current Order']),
    h('div', { class: 'spacer' }, []),
    h('span', { class: 'cart-head__count', style: { color: 'var(--muted)', fontSize: '12px' } }, ['0 items']),
  ]);
  const cartList = h('div', { class: 'cart-list' }, []);
  const cartSummary = h('div', { class: 'cart-summary hidden' }, [
    h('span', { class: 'cart-summary__label' }, ['TOTAL']),
    h('div', { class: 'spacer' }, []),
    h('span', { class: 'cart-summary__total' }, [formatMoney(0)]),
  ]);
  const cartActions = h('div', { class: 'cart-actions hidden' }, []);
  cartSide.append(cartHead, cartList, cartSummary, cartActions);

  wrap.append(menuSide, cartSide);
  content.appendChild(wrap);

  // ----- Drawing helpers -----
  function drawChipRow() {
    clear(chipRow);
    const cats = MenuProvider.categories;
    chipRow.appendChild(makeChip('All', null));
    for (const c of cats) {
      chipRow.appendChild(makeChip(c.name, c.id));
    }
  }

  function makeChip(label, id) {
    const selected = _selectedCategoryId === id;
    return h('button', {
      class: `chip ${selected ? 'active' : ''}`,
      onclick: () => {
        _selectedCategoryId = selected ? null : id;
        drawChipRow();
        drawMenuGrid();
      },
    }, [label]);
  }

  function drawMenuGrid() {
    clear(menuGrid);
    const items = MenuProvider.filtered({
      categoryId: _selectedCategoryId,
      query: _searchQuery,
    });
    if (items.length === 0) {
      menuGrid.appendChild(
        h('div', { class: 'empty-state', style: { gridColumn: '1 / -1' } }, [
          'No items match your search.',
        ]),
      );
      return;
    }
    for (const item of items) {
      const tile = h('div', { class: 'menu-tile', onclick: () => CartProvider.addItem(item) }, []);
      const photo = h('div', { class: 'menu-tile__photo' }, []);
      if (item.hasPhoto) {
        clear(photo);
        photo.appendChild(h('img', { src: item.photoBase64, alt: item.name }));
      } else {
        photo.textContent = item.name;
      }
      tile.append(
        photo,
        h('div', { class: 'menu-tile__name' }, [item.name]),
        h('div', { class: 'menu-tile__row' }, [
          h('span', { class: 'menu-tile__price' }, [formatMoney(item.price, { decimals: 0 })]),
          h('span', { class: 'icon material-symbols-outlined', style: { color: 'var(--primary)' } }, ['add_circle']),
        ]),
      );
      menuGrid.appendChild(tile);
    }
  }

  function drawCart() {
    clear(cartList);
    const items = CartProvider.items;
    const count = CartProvider.itemCount;
    const total = CartProvider.total;

    cartHead.querySelector('.cart-head__count').textContent = `${count} item${count === 1 ? '' : 's'}`;

    if (items.length === 0) {
      cartList.appendChild(
        h('div', { class: 'empty-state' }, [
          'Tap menu items to add them here.',
          h('br'),
          h('br'),
          'Goal: from login to printed receipt in under 30 seconds.',
        ]),
      );
      cartSummary.classList.add('hidden');
      cartActions.classList.add('hidden');
      return;
    }

    for (const item of items) {
      cartList.appendChild(
        h('div', { class: 'cart-line' }, [
          h('div', { style: { flex: '1', minWidth: '0' } }, [
            h('div', { class: 'cart-line__name' }, [item.name]),
            h('div', { class: 'cart-line__price-each' }, [formatMoney(item.unitPrice), ' each']),
          ]),
          h('div', { class: 'cart-line__qty' }, [
            h('button', { onclick: () => CartProvider.decrement(item.menuItemId) }, ['−']),
            h('span', { class: 'num' }, [String(item.quantity)]),
            h('button', { onclick: () => CartProvider.increment(item.menuItemId) }, ['+']),
          ]),
          h('div', { class: 'cart-line__total' }, [formatMoney(item.lineTotal)]),
          h('button', {
            class: 'btn btn--icon btn--text',
            style: { color: 'var(--danger)' },
            'aria-label': 'Remove',
            onclick: () => CartProvider.remove(item.menuItemId),
          }, [h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['delete'])]),
        ]),
      );
    }

    cartSummary.classList.remove('hidden');
    cartSummary.querySelector('.cart-summary__total').textContent = formatMoney(total);
    drawCartActions();
  }

  function drawCartActions() {
    clear(cartActions);
    cartActions.classList.remove('hidden');

    const holdBtn = h('button', { class: 'btn btn--outlined', style: { flex: '1' } }, [
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['pause']),
      'Hold',
    ]);
    const completeBtn = h('button', { class: 'btn btn--filled', style: { flex: '2' } }, [
      _completing ? h('span', { class: 'spinner' }, []) : h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['check']),
      _completing ? 'Completing…' : 'Complete Sale',
    ]);

    holdBtn.addEventListener('click', async () => {
      const items = CartProvider.items;
      if (items.length === 0) return;
      try {
        const order = await OrdersProvider.createFromCart(items);
        await OrdersProvider.holdOrder(order.id);
        toast(`Order ${order.orderNumber} held. Resume it from Orders.`, { type: 'success' });
      } catch (e) {
        toast(`Failed to hold: ${e.message}`, { type: 'error' });
      }
    });

    completeBtn.addEventListener('click', async () => {
      const items = CartProvider.items;
      if (items.length === 0) return;
      _completing = true;
      drawCartActions();
      try {
        const order = await OrdersProvider.createFromCart(items);
        const receipt = await OrdersProvider.completeOrder(order.id);
        toast(`Sale complete — Receipt #${receipt.receiptNumber}`, { type: 'success' });
        navigate(`/receipts/${receipt.id}`);
      } catch (e) {
        toast(`Failed to complete sale: ${e.message}`, { type: 'error' });
        _completing = false;
        drawCartActions();
      }
    });

    cartActions.append(holdBtn, completeBtn);
  }

  // ----- Initial render + subscribe to store changes -----
  drawChipRow();
  drawMenuGrid();
  drawCart();

  // Subscribe so the grid + cart rebuild when menu/cart change.
  const unsubMenu = store.subscribe(CHANNELS.menu, () => {
    drawChipRow();
    drawMenuGrid();
  });
  const unsubCart = store.subscribe(CHANNELS.cart, drawCart);

  // Clean up subscriptions when the content node is removed.
  // MutationObserver fires when the parent clears us.
  const obs = new MutationObserver(() => {
    if (!content.contains(wrap)) {
      unsubMenu();
      unsubCart();
      obs.disconnect();
    }
  });
  obs.observe(content, { childList: true });
}
