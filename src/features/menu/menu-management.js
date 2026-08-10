// Menu management (port of lib/features/menu/menu_management_page.dart).
//
// Two tabs: Menu Items and Categories. Items support photos (file
// picker + canvas crop to square JPEG), price, category, availability.

import { h, clear, toast, formatMoney0, showModal } from '../../core/ui.js';
import { MenuProvider } from '../../core/providers/menu.js';
import { Category } from '../../core/models/category.js';
import { MenuItem } from '../../core/models/menu_item.js';
import { CsvFilePicker } from '../../core/services/csv.js';
import { MenuCsvImportService } from '../../core/services/menu_csv_import.js';
import { store, CHANNELS } from '../../core/store.js';

export function renderMenuManagement(content) {
  clear(content);

  let _tab = 'items';

  const root = h('div', { style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' } }, []);
  const tabs = h('div', { class: 'tabs' }, [
    h('button', { class: 'tab active', 'data-tab': 'items', onclick: () => { _tab = 'items'; draw(); } }, ['Menu Items']),
    h('button', { class: 'tab', 'data-tab': 'categories', onclick: () => { _tab = 'categories'; draw(); } }, ['Categories']),
  ]);
  const tabContent = h('div', { class: 'tab-content' }, []);
  root.append(tabs, tabContent);
  content.append(root);

  function draw() {
    // Update tab styles
    tabs.querySelectorAll('.tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === _tab);
    });
    clear(tabContent);
    if (_tab === 'items') drawItemsTab();
    else drawCategoriesTab();
  }

  function drawItemsTab() {
    const items = MenuProvider.items;
    const cats = MenuProvider.categories;
    const money = (v) => formatMoney0(v);

    const stack = h('div', { style: { position: 'relative', minHeight: '100%' } }, []);

    const card = h('div', { class: 'card', style: { padding: '0' } }, []);
    if (items.length === 0) {
      card.append(h('div', { class: 'empty-state' }, ['No menu items yet. Tap "+ Add Item" or import a CSV.']));
    } else {
      for (const m of items) {
        const cat = cats.find((c) => c.id === m.categoryId);
        card.append(
          h('div', {
            class: 'list-item',
            onclick: () => showItemEditor(m),
          }, [
            h('div', { class: 'list-item__avatar' }, [
              m.hasPhoto
                ? h('img', { src: m.photoBase64, alt: m.name })
                : (m.name.charAt(0) || '?').toUpperCase(),
            ]),
            h('div', { class: 'list-item__main' }, [
              h('div', { class: 'list-item__title' }, [m.name]),
              h('div', { class: 'list-item__subtitle' }, [
                `${cat?.name || '—'} · ${m.available ? 'Available' : 'Hidden'}`,
              ]),
            ]),
            h('div', { class: 'list-item__trailing' }, [money(m.price)]),
          ]),
        );
      }
    }

    const fabRow = h('div', { style: { display: 'flex', gap: '12px', position: 'sticky', bottom: '12px', marginTop: '16px', justifyContent: 'space-between' } }, [
      h('button', {
        class: 'btn btn--outlined',
        onclick: async () => importCsv(),
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['upload_file']),
        'Import CSV',
      ]),
      h('button', {
        class: 'btn btn--filled',
        onclick: () => showItemEditor(null),
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['add']),
        'Add Item',
      ]),
    ]);

    stack.append(card, fabRow);
    tabContent.append(stack);
  }

  function drawCategoriesTab() {
    const cats = MenuProvider.categories;
    const items = MenuProvider.items;

    const stack = h('div', { style: { position: 'relative', minHeight: '100%' } }, []);
    const card = h('div', { class: 'card', style: { padding: '0' } }, []);
    if (cats.length === 0) {
      card.append(h('div', { class: 'empty-state' }, ['No categories yet. Tap "+ Add Category" to create one.']));
    } else {
      for (const c of cats) {
        const count = items.filter((m) => m.categoryId === c.id).length;
        card.append(
          h('div', { class: 'list-item', onclick: () => showCategoryEditor(c) }, [
            h('div', {
              class: 'list-item__avatar',
              style: { background: `${intToHex(c.colorValue)}1f`, color: intToHex(c.colorValue) },
            }, [
              h('span', { class: 'icon material-symbols-outlined' }, ['category']),
            ]),
            h('div', { class: 'list-item__main' }, [
              h('div', { class: 'list-item__title' }, [c.name]),
              h('div', { class: 'list-item__subtitle' }, [`${count} items · sort ${c.sortOrder}`]),
            ]),
            h('button', {
              class: 'btn btn--icon btn--text',
              style: { color: 'var(--danger)' },
              onclick: async (e) => {
                e.stopPropagation();
                if (count > 0) {
                  toast('Cannot delete a category that still has items.', { type: 'warning' });
                  return;
                }
                await MenuProvider.deleteCategory(c.id);
                toast('Category deleted.', { type: 'success' });
              },
            }, [
              h('span', { class: 'icon material-symbols-outlined' }, ['delete']),
            ]),
          ]),
        );
      }
    }

    const fabRow = h('div', { style: { display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: '12px', marginTop: '16px' } }, [
      h('button', {
        class: 'btn btn--filled',
        onclick: () => showCategoryEditor(null),
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['add']),
        'Add Category',
      ]),
    ]);

    stack.append(card, fabRow);
    tabContent.append(stack);
  }

  function showItemEditor(existing) {
    const cats = MenuProvider.categories;
    const state = {
      name: existing?.name ?? '',
      price: existing ? String(existing.price) : '',
      categoryId: existing?.categoryId ?? (cats[0]?.id ?? ''),
      available: existing?.available ?? true,
      photoBase64: existing?.photoBase64 ?? null,
    };

    const body = h('div', {}, []);

    function refresh() {
      clear(body);
      const photo = h('div', {
        style: {
          width: '88px', height: '88px', borderRadius: '50%',
          background: state.photoBase64 ? `url(${state.photoBase64}) center/cover` : 'var(--bg)',
          border: '1px solid var(--divider)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 4px',
        },
        onclick: async () => {
          try {
            const b64 = await pickPhoto();
            if (b64) {
              state.photoBase64 = b64;
              refresh();
            }
          } catch (e) {
            toast(`Photo pick failed: ${e.message}`, { type: 'error' });
          }
        },
      }, [
        !state.photoBase64
          ? h('span', { class: 'icon material-symbols-outlined', style: { color: 'var(--muted)', fontSize: '28px' } }, ['add_a_photo'])
          : null,
      ]);
      body.append(
        photo,
        h('div', { style: { textAlign: 'center', color: 'var(--muted)', fontSize: '12px', marginBottom: '16px' } }, [
          state.photoBase64 ? 'Tap the photo to change it' : 'Tap to add a photo',
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Name']),
          h('input', {
            class: 'input', type: 'text', value: state.name,
            oninput: (e) => state.name = e.target.value,
          }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Price (KES)']),
          h('input', {
            class: 'input', type: 'number', step: '0.01', value: state.price,
            oninput: (e) => state.price = e.target.value,
          }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Category']),
          h('select', {
            class: 'select',
            onchange: (e) => state.categoryId = e.target.value,
          }, cats.map((c) =>
            h('option', { value: c.id, selected: c.id === state.categoryId }, [c.name]),
          )),
        ]),
        h('label', { class: 'switch' }, [
          h('input', {
            type: 'checkbox', checked: state.available,
            onchange: (e) => state.available = e.target.checked,
          }),
          h('span', { class: 'track' }),
          h('span', {}, ['Available for sale']),
        ]),
      );
    }
    refresh();

    const dlg = showModal({
      title: existing ? 'Edit Item' : 'New Menu Item',
      content: body,
      size: 'sm',
      actions: [],
    });
    dlg.root.querySelector('.modal__actions').append(
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Cancel']),
      h('button', {
        class: 'btn btn--filled',
        onclick: async () => {
          const name = state.name.trim();
          const price = parseFloat(state.price);
          if (!name) {
            toast('Name is required.', { type: 'error' });
            return;
          }
          if (Number.isNaN(price)) {
            toast('Price must be a number.', { type: 'error' });
            return;
          }
          const m = new MenuItem({
            id: existing?.id ?? `m-${Date.now()}`,
            name,
            price,
            categoryId: state.categoryId,
            available: state.available,
            photoBase64: state.photoBase64,
            sortOrder: existing?.sortOrder ?? 99,
          });
          await MenuProvider.upsertMenuItem(m);
          toast(`Item ${existing ? 'updated' : 'created'}.`, { type: 'success' });
          dlg.close();
        },
      }, ['Save']),
    );
  }

  function showCategoryEditor(existing) {
    const state = {
      name: existing?.name ?? '',
      sortOrder: existing ? String(existing.sortOrder) : '1',
      color: existing?.colorValue ?? 0xff1976d2,
      photoBase64: existing?.photoBase64 ?? null,
    };
    const palette = [
      0xff1976d2, 0xfffb8c00, 0xffc0392b, 0xff27ae60, 0xff8e44ad,
      0xff16a085, 0xffd35400, 0xff2c3e50,
    ];

    const body = h('div', {}, []);
    function refresh() {
      clear(body);

      // --- Photo picker (image-first, 9:16 aspect like the dashboard card) ---
      const photoBox = h('div', {
        style: {
          position: 'relative',
          width: '100%',
          aspectRatio: '9 / 16',
          maxHeight: '200px',
          margin: '0 auto 4px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: state.photoBase64
            ? `url(${state.photoBase64}) center/cover`
            : `${intToHex(state.color)}1f`,
          border: '1px solid var(--divider)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        onclick: async () => {
          try {
            const b64 = await pickPhoto(9 / 16);
            if (b64) {
              state.photoBase64 = b64;
              refresh();
            }
          } catch (e) {
            toast(`Photo pick failed: ${e.message}`, { type: 'error' });
          }
        },
      }, [
        !state.photoBase64
          ? h('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: intToHex(state.color),
              },
            }, [
              h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '32px' } }, ['add_a_photo']),
              h('span', { style: { fontSize: '12px', fontWeight: 600 } }, ['Add photo']),
            ])
          : null,
        // Clear-photo button overlay (top-right)
        state.photoBase64
          ? h('button', {
              class: 'btn btn--icon btn--text',
              style: {
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(0,0,0,0.55)',
                color: '#fff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                minHeight: '28px',
                padding: '0',
              },
              onclick: (e) => {
                e.stopPropagation();
                state.photoBase64 = null;
                refresh();
              },
            }, [h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '16px' } }, ['close'])])
          : null,
      ]);

      body.append(
        photoBox,
        h('div', { style: { textAlign: 'center', color: 'var(--muted)', fontSize: '12px', marginBottom: '12px' } }, [
          state.photoBase64 ? 'Tap the photo to change it. Recommended: 9:16 portrait image.' : 'Tap to add a 9:16 portrait photo (used on the dashboard category card).',
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Name']),
          h('input', {
            class: 'input', type: 'text', value: state.name,
            oninput: (e) => state.name = e.target.value,
          }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Sort order']),
          h('input', {
            class: 'input', type: 'number', value: state.sortOrder,
            oninput: (e) => state.sortOrder = e.target.value,
          }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Colour (used as fallback tint when no photo is set)']),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            palette.map((c) =>
              h('div', {
                style: {
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: intToHex(c),
                  border: state.color === c ? '3px solid #000' : '3px solid transparent',
                  cursor: 'pointer',
                },
                onclick: () => { state.color = c; refresh(); },
              }),
            ),
          ),
        ]),
      );
    }
    refresh();

    const dlg = showModal({
      title: existing ? 'Edit Category' : 'New Category',
      content: body,
      size: 'sm',
      actions: [],
    });
    dlg.root.querySelector('.modal__actions').append(
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Cancel']),
      h('button', {
        class: 'btn btn--filled',
        onclick: async () => {
          const name = state.name.trim();
          if (!name) {
            toast('Name is required.', { type: 'error' });
            return;
          }
          const c = new Category({
            id: existing?.id ?? `c-${Date.now()}`,
            name,
            sortOrder: parseInt(state.sortOrder, 10) || 1,
            colorValue: state.color,
            photoBase64: state.photoBase64,
          });
          await MenuProvider.upsertCategory(c);
          toast(`Category ${existing ? 'updated' : 'created'}.`, { type: 'success' });
          dlg.close();
        },
      }, ['Save']),
    );
  }

  async function importCsv() {
    let error = null;
    const text = await CsvFilePicker.pickCsvText({ onError: (m) => (error = m) });
    if (text == null) {
      if (error) toast(error, { type: 'error' });
      return;
    }
    const result = MenuCsvImportService.parse(text, MenuProvider.categories);
    if (result.items.length === 0) {
      toast(
        result.errors.length > 0
          ? result.errors.join('\n')
          : 'No valid rows found. Expected columns: name, price, category.',
        { type: 'warning' },
      );
      return;
    }
    // Confirm dialog
    const body = h('div', {}, [
      h('p', {}, [
        `${result.items.length} item(s) will be added` +
          (result.newCategories.length === 0
            ? ''
            : `, creating ${result.newCategories.length} new categor${result.newCategories.length === 1 ? 'y' : 'ies'}.`),
      ]),
    ]);
    if (result.errors.length > 0) {
      body.append(
        h('div', { style: { marginTop: '12px' } }, [
          h('strong', {}, [`${result.errors.length} row(s) skipped:`]),
          h('div', { style: { fontSize: '12px', color: 'var(--muted)' } },
            result.errors.slice(0, 5).map((e) => h('div', {}, [`• ${e}`])),
          ),
            result.errors.length > 5
              ? h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, [`…and ${result.errors.length - 5} more.`])
              : null,
          ]),
        );
      }

    const dlg = showModal({
      title: 'Import menu items?',
      content: body,
      size: 'sm',
      actions: [],
    });
    dlg.root.querySelector('.modal__actions').append(
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Cancel']),
      h('button', {
        class: 'btn btn--filled',
        onclick: async () => {
          for (const c of result.newCategories) await MenuProvider.upsertCategory(c);
          for (const m of result.items) await MenuProvider.upsertMenuItem(m);
          toast(`Imported ${result.items.length} item(s).`, { type: 'success' });
          dlg.close();
        },
      }, ['Import']),
    );
  }

  draw();

  // Re-render when the menu store channel bumps.
  const unsub = store.subscribe(CHANNELS.menu, draw);
  const obs = new MutationObserver(() => {
    if (!content.contains(root)) {
      unsub();
      obs.disconnect();
    }
  });
  obs.observe(content, { childList: true });
}

// ---- Helpers ----

/**
 * Pick a photo from disk and crop it to the given aspect ratio.
 * Default is 1:1 (square, for menu item thumbnails). Pass 9/16 for
 * portrait category images.
 *
 * @param {number} [aspectRatio=1] - width / height (1 = square, 9/16 = portrait)
 * @returns {Promise<string|null>} data URL of the cropped JPEG, or null if cancelled
 */
async function pickPhoto(aspectRatio = 1) {
  return new Promise((resolve, reject) => {
    const input = h('input', { type: 'file', accept: 'image/*' });
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);

      try {
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImage(dataUrl);

        // Compute the crop window for the requested aspect ratio,
        // centered on the image's middle.
        const imgAspect = img.width / img.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAspect > aspectRatio) {
          // Image is wider than target — crop horizontally.
          sw = img.height * aspectRatio;
          sx = (img.width - sw) / 2;
        } else {
          // Image is taller than target — crop vertically.
          sh = img.width / aspectRatio;
          sy = (img.height - sh) / 2;
        }

        // Render at a reasonable resolution — for a 9:16 portrait
        // category image, 540x960 keeps file size manageable while
        // looking crisp on retina screens.
        const targetW = aspectRatio >= 1 ? 480 : Math.round(480 * aspectRatio);
        const targetH = aspectRatio >= 1 ? Math.round(480 / aspectRatio) : 480;
        // Override: for 9/16, use 540x960 explicitly.
        let outW = targetW, outH = targetH;
        if (Math.abs(aspectRatio - 9 / 16) < 0.01) {
          outW = 540; outH = 960;
        } else if (Math.abs(aspectRatio - 1) < 0.01) {
          outW = 400; outH = 400;
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        reject(e);
      }
    });

    input.click();
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Image load failed'));
    img.src = src;
  });
}

// 0xAARRGGBB → "#RRGGBB"
function intToHex(v) {
  const rgb = v & 0xffffff;
  return '#' + rgb.toString(16).padStart(6, '0');
}
