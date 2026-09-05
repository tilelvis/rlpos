// Business settings (port of lib/features/settings/business_settings_page.dart).
//
// Three tabs: Business, Printer, Users.
// Plus a "Full system reset" button.

import { h, clear, toast, showModal } from '../../core/ui.js';
import { BusinessProvider, UserManagement } from '../../core/providers/auth.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { StorageService } from '../../core/services/storage.js';
import { BusinessInfo } from '../../core/models/business_info.js';
import { USER_ROLES } from '../../core/models/user.js';
import { navigate } from '../../core/router.js';
import { usbPrinterConnectionCard } from '../printer/usb-printer-widget.js';
import { store, CHANNELS } from '../../core/store.js';

export function renderSettings(content) {
  clear(content);

  let _tab = 'business';
  const root = h('div', { style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' } }, []);
  const tabs = h('div', { class: 'tabs' }, [
    h('button', { class: 'tab active', 'data-tab': 'business', onclick: () => { _tab = 'business'; draw(); } }, [
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['storefront']),
      'Business',
    ]),
    h('button', { class: 'tab', 'data-tab': 'printer', onclick: () => { _tab = 'printer'; draw(); } }, [
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['usb']),
      'Printer',
    ]),
    h('button', { class: 'tab', 'data-tab': 'users', onclick: () => { _tab = 'users'; draw(); } }, [
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['group']),
      'Users',
    ]),
  ]);
  const tabContent = h('div', { class: 'tab-content' }, []);
  root.append(tabs, tabContent);
  content.append(root);

  function draw() {
    tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === _tab));
    clear(tabContent);
    if (_tab === 'business') drawBusinessTab();
    else if (_tab === 'printer') drawPrinterTab();
    else if (_tab === 'users') drawUsersTab();
  }

  function drawBusinessTab() {
    const b = BusinessProvider.info;
    const state = { ...b.toMap() };

    const card = h('div', { class: 'card' }, []);
    function refresh() {
      clear(card);
      card.append(
        h('h2', { class: 'section-title', style: { margin: '0 0 4px' } }, ['Business profile']),
        h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
          'Shown on every receipt header. Editable at any time — only new receipts reflect the change.',
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Business name']),
          h('input', { class: 'input', value: state.name, oninput: (e) => state.name = e.target.value }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Address']),
          h('input', { class: 'input', value: state.address, oninput: (e) => state.address = e.target.value }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Phone']),
          h('input', { class: 'input', value: state.phone, oninput: (e) => state.phone = e.target.value }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Footer message']),
          h('textarea', { class: 'textarea', oninput: (e) => state.footerMessage = e.target.value }, [state.footerMessage || '']),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Receipt paper width']),
          h('div', { style: { display: 'flex', gap: '8px' } }, [
            h('button', {
              class: `chip ${state.preferredPaper === 'mm58' ? 'active' : ''}`,
              onclick: () => { state.preferredPaper = 'mm58'; refresh(); },
            }, ['58mm (32 cols)']),
            h('button', {
              class: `chip ${state.preferredPaper === 'mm80' ? 'active' : ''}`,
              onclick: () => { state.preferredPaper = 'mm80'; refresh(); },
            }, ['80mm (48 cols)']),
          ]),
        ]),
        h('h3', { class: 'section-title', style: { marginTop: '16px' } }, ['M-Pesa']),
        h('div', { class: 'grid-2' }, [
          h('div', { class: 'field' }, [
            h('label', {}, ['Paybill number']),
            h('input', { class: 'input', value: state.paybillNumber, oninput: (e) => state.paybillNumber = e.target.value }),
          ]),
          h('div', { class: 'field' }, [
            h('label', {}, ['Till number']),
            h('input', { class: 'input', value: state.tillNumber, oninput: (e) => state.tillNumber = e.target.value }),
          ]),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Second-copy label']),
          h('select', {
            class: 'select',
            onchange: (e) => state.secondCopyLabel = e.target.value,
          }, [
            h('option', { value: 'BUSINESS COPY', selected: state.secondCopyLabel === 'BUSINESS COPY' }, ['Business Copy']),
            h('option', { value: 'KITCHEN COPY', selected: state.secondCopyLabel === 'KITCHEN COPY' }, ['Kitchen Copy']),
          ]),
        ]),
        h('div', { class: 'row row--end', style: { marginTop: '12px' } }, [
          h('button', {
            class: 'btn btn--filled',
            onclick: async () => {
              try {
                await BusinessProvider.update(new BusinessInfo(state));
                toast('Business profile saved.', { type: 'success' });
              } catch (e) {
                toast(`Save failed: ${e.message}`, { type: 'error' });
              }
            },
          }, [
            h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['save']),
            'Save',
          ]),
        ]),
      );
    }
    refresh();

    const dangerCard = h('div', { class: 'card', style: { marginTop: '16px', borderColor: 'rgba(192, 57, 43, 0.4)' } }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 4px', color: 'var(--danger)' } }, ['Danger zone']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
        '"Reset" deletes every order, receipt, and menu item on this device, and signs out every user account. Your business profile (M-Pesa numbers, paper size) is kept. This cannot be undone.',
      ]),
      h('div', { class: 'row row--end' }, [
        h('button', {
          class: 'btn btn--danger',
          onclick: () => showPurgeDialog(),
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['warning']),
          'Full system reset…',
        ]),
      ]),
    ]);

    tabContent.append(card, dangerCard);
  }

  function drawPrinterTab() {
    const card = h('div', { class: 'card' }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 4px' } }, ['USB Thermal Printer']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
        'Pair a WebUSB ESC/POS thermal printer (Epson TM, Xprinter, Goojprt, SNBC, Zjiang, etc.) for direct printing — no OS driver needed. Chrome/Edge/Opera only, over HTTPS or localhost.',
      ]),
      h('div', { style: { marginTop: '16px' } }, [usbPrinterConnectionCard()]),
    ]);

    const setupCard = h('div', { class: 'card', style: { marginTop: '16px' } }, [
      h('h3', { class: 'section-title', style: { margin: '0 0 4px' } }, ['First time? Use Zadig to install WinUSB']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
        'On Windows, the printer manufacturer\'s driver claims the USB device, blocking Chrome from accessing it. Replace the driver with WinUSB using Zadig — step-by-step walkthrough:',
      ]),
      h('button', {
        class: 'btn btn--outlined',
        style: { marginTop: '8px' },
        onclick: () => navigate('/settings/printer-setup'),
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['menu_book']),
        'Open Printer Setup Guide',
      ]),
    ]);

    const fallbackCard = h('div', { class: 'card', style: { marginTop: '16px' } }, [
      h('h3', { class: 'section-title', style: { margin: '0 0 4px' } }, ['Alternative: Browser print dialog']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
        'If WebUSB isn\'t available (Firefox/Safari), or you don\'t want to switch drivers, the browser print dialog still works — install the printer\'s OS driver normally and use the "Browser" or "Print Both Copies" button on the receipt preview. This goes through Windows Print Spooler just like any other document.',
      ]),
    ]);

    tabContent.append(card, setupCard, fallbackCard);
  }

  function drawUsersTab() {
    const users = StorageService.users;
    const card = h('div', { class: 'card', style: { padding: '0' } }, []);
    if (users.length === 0) {
      card.append(h('div', { class: 'empty-state' }, ['No users yet.']));
    } else {
      for (const u of users) {
        card.append(
          h('div', { class: 'list-item', onclick: () => showUserEditor(u) }, [
            h('div', { class: 'list-item__avatar' }, [
              h('span', { class: 'icon material-symbols-outlined' }, ['person']),
            ]),
            h('div', { class: 'list-item__main' }, [
              h('div', { class: 'list-item__title' }, [u.displayName]),
              h('div', { class: 'list-item__subtitle' }, [`${u.username} · ${u.roleLabel}`]),
            ]),
            h('span', { class: `tag tag--${u.role === 'admin' ? 'warning' : u.role === 'cashier' ? 'success' : 'muted'}` }, [u.role]),
            h('button', {
              class: 'btn btn--icon btn--text',
              style: { color: 'var(--danger)' },
              onclick: async (e) => {
                e.stopPropagation();
                try {
                  await UserManagement.deleteUser(u);
                  toast(`Deleted ${u.username}.`, { type: 'success' });
                  draw();
                } catch (e) {
                  toast(`Delete failed: ${e.message}`, { type: 'error' });
                }
              },
            }, [h('span', { class: 'icon material-symbols-outlined' }, ['delete'])]),
          ]),
        );
      }
    }

    const fab = h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '16px' } }, [
      h('button', { class: 'btn btn--filled', onclick: () => showUserEditor(null) }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['person_add']),
        'Add User',
      ]),
    ]);

    tabContent.append(card, fab);
  }

  function showUserEditor(existing) {
    const state = {
      username: existing?.username ?? '',
      displayName: existing?.displayName ?? '',
      password: '',
      role: existing?.role ?? 'cashier',
    };

    const body = h('div', {});
    function refresh() {
      clear(body);
      body.append(
        h('div', { class: 'field' }, [
          h('label', {}, ['Display name']),
          h('input', { class: 'input', value: state.displayName, oninput: (e) => state.displayName = e.target.value }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Username']),
          h('input', { class: 'input', value: state.username, oninput: (e) => state.username = e.target.value }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, [existing ? 'New password (leave blank to keep)' : 'Password']),
          h('input', { class: 'input', type: 'password', value: state.password, oninput: (e) => state.password = e.target.value }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Role']),
          h('div', { style: { display: 'flex', gap: '6px' } }, Object.entries(USER_ROLES).map(([role, info]) =>
            h('button', {
              class: `chip ${state.role === role ? 'active' : ''}`,
              onclick: () => { state.role = role; refresh(); },
              title: info.description,
            }, [info.label]),
          )),
        ]),
        h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '8px' } }, [
          USER_ROLES[state.role].description,
        ]),
      );
    }
    refresh();

    const dlg = showModal({
      title: existing ? 'Edit User' : 'New User',
      content: body,
      size: 'sm',
      actions: [],
    });
    dlg.root.querySelector('.modal__actions').append(
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Cancel']),
      h('button', {
        class: 'btn btn--filled',
        onclick: async () => {
          try {
            if (existing) {
              await UserManagement.updateUser({
                existing,
                username: state.username,
                password: state.password,
                displayName: state.displayName,
                role: state.role,
              });
              toast('User updated.', { type: 'success' });
            } else {
              await UserManagement.createUser({
                username: state.username,
                password: state.password,
                displayName: state.displayName,
                role: state.role,
              });
              toast('User created.', { type: 'success' });
            }
            dlg.close();
            draw();
          } catch (e) {
            toast(e.message, { type: 'error' });
          }
        },
      }, ['Save']),
    );
  }

  function showPurgeDialog() {
    const admin = AuthProvider.currentUser;
    if (!admin || !admin.isAdmin) {
      toast('You must be signed in as an admin to do this.', { type: 'error' });
      return;
    }

    const state = { confirm: '', password: '', obscure: true, running: false, error: null };

    const body = h('div', {});
    function refresh() {
      clear(body);
      body.append(
        h('div', {
          style: {
            padding: '12px',
            background: 'rgba(192, 57, 43, 0.08)',
            borderRadius: '8px',
            border: '1px solid rgba(192, 57, 43, 0.3)',
            fontSize: '13px',
            lineHeight: '1.4',
          },
        }, [
          'This permanently deletes every order, receipt, menu item, and user account on this device. ',
          h('strong', {}, ['This cannot be undone.']),
          h('br'), h('br'),
          'The app reloads afterward and asks you to create a new admin account — your shop\'s business profile, M-Pesa numbers, and printer setup are kept as-is.',
        ]),
        h('div', { class: 'field', style: { marginTop: '16px' } }, [
          h('label', {}, ['Type PURGE to confirm']),
          h('input', {
            class: 'input',
            value: state.confirm,
            oninput: (e) => { state.confirm = e.target.value; refresh2(); },
          }),
        ]),
        h('div', { class: 'field' }, [
          h('label', {}, ['Your admin password']),
          h('div', { style: { position: 'relative' } }, [
            h('input', {
              class: 'input',
              type: state.obscure ? 'password' : 'text',
              value: state.password,
              oninput: (e) => { state.password = e.target.value; },
              style: { paddingRight: '40px' },
            }),
            h('button', {
              class: 'btn btn--icon btn--text',
              style: { position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)' },
              onclick: () => { state.obscure = !state.obscure; refresh(); },
            }, [h('span', { class: 'icon material-symbols-outlined' }, [state.obscure ? 'visibility_off' : 'visibility'])]),
          ]),
        ]),
        state.error
          ? h('div', { style: { color: 'var(--danger)', fontSize: '13px', marginTop: '12px' } }, [state.error])
          : null,
      );
    }

    // Inner refresh only updates the confirm phrase match check (not the
    // whole modal — that would lose focus on inputs).
    function refresh2() {}

    refresh();

    const dlg = showModal({
      title: 'Full system reset',
      content: body,
      size: 'sm',
      actions: [],
    });
    const actions = dlg.root.querySelector('.modal__actions');
    actions.append(
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Cancel']),
      h('button', {
        class: 'btn btn--danger',
        onclick: async () => {
          if (state.confirm.trim() !== 'PURGE') {
            state.error = 'Type PURGE exactly to confirm.';
            refresh();
            return;
          }
          if (state.password !== admin.password) {
            state.error = 'Incorrect password.';
            refresh();
            return;
          }
          state.running = true;
          try {
            await StorageService.clearOperationalData();
            await StorageService.saveBusiness(BusinessProvider.info); // keep business profile
            toast('System reset complete. Reloading\u2026', { type: 'success' });
            dlg.close();
            // Reload rather than re-routing in-place: this re-runs main.js's
            // boot check, which sees zero users and shows the first-run
            // admin setup screen (see src/main.js), instead of leaving any
            // stale shell/store state from the just-purged session around.
            setTimeout(() => window.location.reload(), 600);
          } catch (e) {
            state.error = `Reset failed: ${e.message}`;
            state.running = false;
            refresh();
          }
        },
      }, [state.running ? h('span', { class: 'spinner' }, []) : 'Erase everything']),
    );
  }

  draw();

  // Re-render when business / users store channel bumps.
  const unsubBusiness = store.subscribe(CHANNELS.business, () => {
    if (_tab === 'business') draw();
  });
  const unsubUsers = store.subscribe(CHANNELS.users, () => {
    if (_tab === 'users') draw();
  });
  const obs = new MutationObserver(() => {
    if (!content.contains(root)) {
      unsubBusiness();
      unsubUsers();
      obs.disconnect();
    }
  });
  obs.observe(content, { childList: true });
}
