(() => {
  const selector = 'button,a[href],input[type=button],[role=button]';
  function direction(control) {
    const label = (control.getAttribute('aria-label') || control.value || control.textContent || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (/^[\s←‹«]*(προηγουμεν|previous\b)/u.test(label) || /(?:^|[-_])prev(?:ious)?$/i.test(control.id)) return 'ArrowLeft';
    if (/^[\s→›»]*(επομεν|next\b)/u.test(label) || /(?:^|[-_])next$/i.test(control.id)) return 'ArrowRight';
  }
  function visible(control) {
    return !control.closest('[hidden],[inert],[aria-hidden=true]') &&
      control.getClientRects().length > 0 && getComputedStyle(control).visibility === 'visible';
  }
  window.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key) || event.defaultPrevented ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat ||
        event.target.closest('input,textarea,select,[contenteditable],[role=slider],[role=listbox],[role=combobox],[role=tablist],audio,video')) return;
    const scope = document.querySelector('dialog[open],[aria-modal=true]:not([hidden])') || document.querySelector('main') || document;
    const controls = [...scope.querySelectorAll(selector)].filter(control => visible(control) && direction(control) === event.key);
    const focused = event.target.closest('nav,[role=group]');
    const peers = focused ? controls.filter(control => focused.contains(control)) : [];
    const visibleInViewport = controls.filter(control => {
      const rect = control.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    const target = peers[0] || visibleInViewport[0] || controls[0];
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!target.matches(':disabled,[aria-disabled=true]')) target.click();
  }, true);
})();
