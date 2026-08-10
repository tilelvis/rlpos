// Login page (port of lib/features/auth/login_page.dart).

import { h, mount, toast } from '../../core/ui.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { StorageService } from '../../core/services/storage.js';
import { navigate } from '../../core/router.js';
import { DEMO } from '../../core/constants.js';

export function renderLogin() {
  const wrap = h('div', { class: 'login-wrap' }, []);
  const card = h('div', { class: 'login-card' }, []);

  const logo = h('img', {
    class: 'login-card__logo',
    src: 'logo.png',
    alt: 'Raicilabs POS logo',
  });
  const title = h('h1', { class: 'login-card__title' }, ['RAICILABS']);
  const subtitle = h('p', { class: 'login-card__subtitle' }, ['Point of Sale']);

  // Form
  const usernameInput = h('input', {
    class: 'input',
    type: 'text',
    placeholder: 'Username',
    autocomplete: 'username',
    autocapitalize: 'off',
  });
  const passwordInput = h('input', {
    class: 'input',
    type: 'password',
    placeholder: 'Password',
    autocomplete: 'current-password',
  });

  const usernameField = h('div', { class: 'field' }, [
    h('label', {}, ['Username']),
    usernameInput,
  ]);
  const passwordField = h('div', { class: 'field' }, [
    h('label', {}, ['Password']),
    passwordInput,
  ]);

  const errorEl = h('div', { class: 'login-card__error', style: { color: 'var(--danger)', fontSize: '13px', minHeight: '18px' } }, []);

  const submitBtn = h('button', { class: 'btn btn--filled btn--block btn--lg' }, ['Sign In']);
  const submitSpinner = h('span', { class: 'spinner' }, []);

  // Demo credentials helper.
  const demoRow = h('div', { style: { marginTop: '16px', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.7' } }, [
    h('div', {}, [h('strong', {}, ['Demo accounts:'])]),
    h('div', {}, [`Admin: `, h('code', {}, [DEMO.admin.username, ' / ', DEMO.admin.password])]),
    h('div', {}, [`Cashier: `, h('code', {}, [DEMO.cashier.username, ' / ', DEMO.cashier.password])]),
    h('div', {}, [`Waiter: `, h('code', {}, [DEMO.waiter.username, ' / ', DEMO.waiter.password])]),
  ]);

  card.append(
    logo,
    title,
    subtitle,
    usernameField,
    passwordField,
    errorEl,
    submitBtn,
    demoRow,
  );
  wrap.appendChild(card);
  mount(wrap);

  setTimeout(() => usernameInput.focus(), 50);

  async function submit() {
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = '';
    submitBtn.appendChild(submitSpinner);

    // Small artificial delay so the spinner is visible (UX nicety).
    await new Promise((r) => setTimeout(r, 200));

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      errorEl.textContent = 'Username and password are required.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      return;
    }

    const user = AuthProvider.signIn(username, password);
    if (!user) {
      errorEl.textContent = 'Invalid username or password.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      return;
    }

    toast(`Welcome, ${user.displayName}`, { type: 'success' });
    navigate(user.isAdmin ? '/dashboard' : '/orders/new');
  }

  submitBtn.addEventListener('click', submit);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') passwordInput.focus();
  });
}
