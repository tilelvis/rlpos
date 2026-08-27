// Staff sign-in modal — dedicated admin/cashier login accessible from
// the app bar's "Sign In" button (visible only to guests).
//
// This is DIFFERENT from the "Complete Sale" signature modal:
//   - Signature modal: any role can sign in (admin, cashier, waiter) —
//     the goal is to authorise a specific sale.
//   - Staff sign-in modal: ONLY admin + cashier can sign in (waiters
//     and other roles are filtered out of the dropdown). The goal is
//     to let staff start their shift / manage unpaid orders / view
//     reports without having to fake a sale.
//
// Layout:
//   ┌───────────────────────────────┐
//   │ Staff sign in                 │
//   │ Admins and cashiers only.     │
//   │                               │
//   │ [ Select staff member      ▼ ] │
//   │ [ Password                ]    │
//   │                               │
//   │              [Cancel] [Sign In]│
//   └───────────────────────────────┘

import { h, toast } from '../../core/ui.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { StorageService } from '../../core/services/storage.js';

export function showStaffLoginModal() {
  // Build the list of admin + cashier users (no waiters, no other roles).
  const staffUsers = StorageService.users.filter(
    (u) => u.role === 'admin' || u.role === 'cashier',
  );

  if (staffUsers.length === 0) {
    toast('No admin or cashier accounts configured.', { type: 'warning' });
    return;
  }

  // Pre-select the first staff user.
  let _selectedUsername = staffUsers[0].username;
  let _password = '';

  const usernameSelect = h('select', {
    class: 'select',
    onchange: (e) => { _selectedUsername = e.target.value; },
  }, staffUsers.map((u, i) =>
    h('option', {
      value: u.username,
      selected: i === 0,
    }, [`${u.displayName} (${u.roleLabel}) — @${u.username}`]),
  ));

  const passwordInput = h('input', {
    class: 'input',
    type: 'password',
    placeholder: 'Password',
    autocomplete: 'current-password',
    oninput: (e) => { _password = e.target.value; },
  });

  const errorEl = h('div', {
    style: { color: 'var(--danger)', fontSize: '13px', minHeight: '18px', marginTop: '6px' },
  }, []);

  const body = h('div', {}, [
    h('p', { style: { color: 'var(--muted)', fontSize: '13px', margin: '0 0 16px' } }, [
      'Admins and cashiers only. Pick your account and enter your password to access Orders, Reports, and unpaid-order management.',
    ]),
    h('div', { class: 'field' }, [
      h('label', {}, ['Staff member']),
      usernameSelect,
    ]),
    h('div', { class: 'field' }, [
      h('label', {}, ['Password']),
      passwordInput,
    ]),
    errorEl,
  ]);

  // Build modal manually so we control close behaviour.
  const overlay = h('div', { class: 'modal modal--sm' });
  const submitBtn = h('button', { class: 'btn btn--filled' }, ['Sign In']);
  const cancelBtn = h('button', { class: 'btn btn--text' }, ['Cancel']);
  const card = h('div', { class: 'modal__card' }, [
    h('div', { class: 'modal__head' }, [h('h2', { class: 'modal__title' }, ['Staff sign in'])]),
    h('div', { class: 'modal__body' }, [body]),
    h('div', { class: 'modal__actions' }, [cancelBtn, submitBtn]),
  ]);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal--visible'));

  let settled = false;
  function close({ immediate = false } = {}) {
    if (settled) return;
    settled = true;
    overlay.classList.remove('modal--visible');
    if (immediate) {
      overlay.remove();
    } else {
      setTimeout(() => overlay.remove(), 200);
    }
  }

  async function submit() {
    errorEl.textContent = '';

    const username = _selectedUsername;
    const password = _password;

    if (!password) {
      errorEl.textContent = 'Password is required.';
      return;
    }

    // Validate before publishing the auth event. The shell intentionally
    // avoids heavy re-renders while a modal is present, so remove this
    // modal synchronously before signing in.
    const candidate = StorageService.findUser(username);
    if (!candidate || candidate.password !== password) {
      errorEl.textContent = 'Invalid password. Please try again.';
      passwordInput.focus();
      passwordInput.select();
      return;
    }

    // Defensive: confirm the signed-in user is actually admin/cashier.
    if (!candidate.canViewFinancials) {
      errorEl.textContent = 'Only admins and cashiers can sign in here.';
      return;
    }

    close({ immediate: true });
    const user = AuthProvider.signIn(username, password);
    if (!user) return;

    toast(`Signed in as ${user.displayName}`, { type: 'success' });
  }

  submitBtn.addEventListener('click', submit);
  cancelBtn.addEventListener('click', close);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Autofocus the password field — the username is pre-selected via
  // the dropdown, so the user only needs to type their password.
  setTimeout(() => passwordInput.focus(), 100);
}
