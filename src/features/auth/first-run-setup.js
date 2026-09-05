// First-run admin setup — shown instead of any normal route whenever
// StorageService.users is empty (fresh install, or right after a
// "Full system reset"). There is no seeded admin account anymore: the
// shop owner picks their own username + password here, once, and that
// becomes the real admin login going forward.
//
// Reuses the .login-wrap / .login-card styles from the (now removed)
// demo login page so it looks like part of the same app.

import { h, mount, toast } from '../../core/ui.js';
import { AuthProvider, UserManagement } from '../../core/providers/auth.js';

/** @param onDone Called once an admin account has been created and signed in. */
export function renderFirstRunSetup(onDone) {
  const wrap = h('div', { class: 'login-wrap' }, []);
  const card = h('div', { class: 'login-card' }, []);

  const logo = h('img', { class: 'login-card__logo', src: 'logo.png', alt: 'Raicilabs POS logo' });
  const title = h('h1', { class: 'login-card__title' }, ['Set up your admin account']);
  const subtitle = h('p', { class: 'login-card__subtitle' }, [
    'Choose the owner login for this till. You\u2019ll use it to sign in and manage settings.',
  ]);

  const displayNameInput = h('input', { class: 'input', type: 'text', placeholder: 'Your name', autocomplete: 'name' });
  const usernameInput = h('input', { class: 'input', type: 'text', placeholder: 'Username', autocomplete: 'username', autocapitalize: 'off' });
  const passwordInput = h('input', { class: 'input', type: 'password', placeholder: 'Password', autocomplete: 'new-password' });
  const confirmInput = h('input', { class: 'input', type: 'password', placeholder: 'Confirm password', autocomplete: 'new-password' });

  const errorEl = h('div', { class: 'login-card__error', style: { color: 'var(--danger)', fontSize: '13px', minHeight: '18px' } }, []);
  const submitBtn = h('button', { class: 'btn btn--filled btn--block btn--lg' }, ['Create admin account']);

  card.append(
    logo,
    title,
    subtitle,
    h('div', { class: 'field' }, [h('label', {}, ['Your name']), displayNameInput]),
    h('div', { class: 'field' }, [h('label', {}, ['Username']), usernameInput]),
    h('div', { class: 'field' }, [h('label', {}, ['Password']), passwordInput]),
    h('div', { class: 'field' }, [h('label', {}, ['Confirm password']), confirmInput]),
    errorEl,
    submitBtn,
  );
  wrap.appendChild(card);
  mount(wrap);

  setTimeout(() => displayNameInput.focus(), 50);

  async function submit() {
    errorEl.textContent = '';

    const displayName = displayNameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!username || !password) {
      errorEl.textContent = 'Username and password are required.';
      return;
    }
    if (password.length < 4) {
      errorEl.textContent = 'Password must be at least 4 characters.';
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '';
    submitBtn.appendChild(h('span', { class: 'spinner' }, []));

    try {
      await UserManagement.createUser({ username, password, displayName, role: 'admin' });
    } catch (e) {
      errorEl.textContent = e.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create admin account';
      return;
    }

    const user = AuthProvider.signIn(username, password);
    toast(`Welcome, ${user.displayName}`, { type: 'success' });
    onDone();
  }

  submitBtn.addEventListener('click', submit);
  confirmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}
