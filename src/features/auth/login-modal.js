// Login modal — appears as a "signature" step when a guest taps
// "Complete Sale". The app has no login screen at startup; login
// only happens here, transiently, to authorise a sale (and optionally
// to mark orders as paid).
//
// Returns a Promise that resolves with the signed-in User, or null
// if the user cancels.

import { h, toast } from '../../core/ui.js';
import { AuthProvider } from '../../core/providers/auth.js';

export function showLoginModal({ title = 'Sign in to complete sale', subtitle = 'Your sign-in acts as a signature for this sale.' } = {}) {
  return new Promise((resolve) => {
    let settled = false;

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
    const errorEl = h('div', {
      style: { color: 'var(--danger)', fontSize: '13px', minHeight: '18px', marginTop: '6px' },
    }, []);
    const submitBtn = h('button', { class: 'btn btn--filled btn--block btn--lg' }, ['Sign In']);
    const cancelBtn = h('button', { class: 'btn btn--text' }, ['Cancel']);

    const body = h('div', {}, [
      h('p', { style: { color: 'var(--muted)', fontSize: '13px', margin: '0 0 16px' } }, [subtitle]),
      h('div', { class: 'field' }, [
        h('label', {}, ['Username']),
        usernameInput,
      ]),
      h('div', { class: 'field' }, [
        h('label', {}, ['Password']),
        passwordInput,
      ]),
      errorEl,
    ]);

    // Build modal manually so we control close behaviour.
    const overlay = h('div', { class: 'modal modal--sm' });
    const card = h('div', { class: 'modal__card' }, [
      h('div', { class: 'modal__head' }, [h('h2', { class: 'modal__title' }, [title])]),
      h('div', { class: 'modal__body' }, [body]),
      h('div', { class: 'modal__actions' }, [cancelBtn, submitBtn]),
    ]);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal--visible'));

    function close(result) {
      if (settled) return;
      settled = true;
      overlay.classList.remove('modal--visible');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }

    async function submit() {
      errorEl.textContent = '';
      submitBtn.disabled = true;
      const oldContent = submitBtn.textContent;
      submitBtn.textContent = '';
      submitBtn.appendChild(h('span', { class: 'spinner' }, []));

      await new Promise((r) => setTimeout(r, 150));

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        errorEl.textContent = 'Username and password are required.';
        submitBtn.disabled = false;
        submitBtn.textContent = oldContent;
        return;
      }

      const user = AuthProvider.signIn(username, password);
      if (!user) {
        errorEl.textContent = 'Invalid username or password.';
        submitBtn.disabled = false;
        submitBtn.textContent = oldContent;
        return;
      }

      toast(`Signed in as ${user.displayName}`, { type: 'success' });
      close(user);
    }

    submitBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => close(null));
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') passwordInput.focus();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    // Autofocus
    setTimeout(() => usernameInput.focus(), 100);
  });
}
