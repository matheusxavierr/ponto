(() => {
  'use strict';

  const calculator = window.pontoCalculator;
  const app = calculator.root;
  const find = id => app.querySelector(`#${id}`);
  const storageKey = 'ponto.deposits.v2';
  const legacyStorageKey = 'ponto.deposits.v1';
  const divisors = [0.9, 0.4, 0.45, 0.8];
  const dialog = find('records-dialog');
  const target = find('target-screen');
  const dialogTarget = find('dialog-screen');
  const screenGrid = find('screen-grid');
  const cards = find('deposit-cards');
  const queue = find('stop-queue');
  const viewTabs = [find('records-screens-tab'), find('records-queue-tab')];
  const saveButton = find('save-deposit');
  const pipButton = find('pip-toggle');
  const pipLabel = find('pip-label');
  const mainDocument = document;
  const placeholder = mainDocument.getElementById('pip-placeholder');
  const returnButton = mainDocument.getElementById('pip-return');
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  let selectedScreen = 0;
  let queuePage = 0;
  let screens = Array(10).fill(null);
  let storageReadable = true;
  let floatingWindow = null;
  let opening = false;

  function element(tag, className, text) {
    const node = app.ownerDocument.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function notify(message, error = false) {
    for (const id of ['save-feedback', 'records-notice']) {
      const notice = find(id);
      notice.textContent = message;
      notice.classList.toggle('error', error);
    }
  }

  function validatedRecord(record) {
    if (record === null) return null;
    if (!record || typeof record.id !== 'string' || record.id.length > 100 ||
        !Number.isFinite(record.initial) || !Number.isFinite(record.x) || !divisors.includes(record.divisor) ||
        !Number.isFinite(record.savedAt) || record.savedAt < 0 || record.savedAt > 8640000000000000 ||
        (record.done !== undefined && typeof record.done !== 'boolean')) throw new Error('Invalid deposit');
    const { y, z, stop } = calculator.calculate(record.x, record.divisor, record.initial);
    if (![y, z, stop].every(Number.isFinite)) throw new Error('Invalid calculation');
    return { id: record.id, initial: record.initial, x: record.x, divisor: record.divisor, savedAt: record.savedAt, done: record.done === true };
  }

  function readScreens() {
    const value = window.localStorage.getItem(storageKey);
    if (value !== null) {
      const stored = JSON.parse(value);
      if (stored.version !== 2 || !Array.isArray(stored.screens) || stored.screens.length !== 10) throw new Error('Invalid storage');
      return stored.screens.map(validatedRecord);
    }
    // Retain the newest previous result for each screen without modifying the legacy backup.
    const legacyValue = window.localStorage.getItem(legacyStorageKey);
    if (legacyValue === null) return Array(10).fill(null);
    const legacy = JSON.parse(legacyValue);
    if (legacy.version !== 1 || !Array.isArray(legacy.screens) || legacy.screens.length !== 10) throw new Error('Invalid storage');
    return legacy.screens.map(slots => {
      if (!Array.isArray(slots) || slots.length !== 2) throw new Error('Invalid screen');
      return slots.map(validatedRecord).reduce((latest, record) => {
        return record && (!latest || record.savedAt >= latest.savedAt) ? record : latest;
      }, null);
    });
  }

  function refreshStorage() {
    try {
      screens = readScreens();
      storageReadable = true;
      return true;
    } catch {
      storageReadable = false;
      notify('Não foi possível ler os registros deste navegador. Verifique o armazenamento do site.', true);
      return false;
    }
  }

  function persist(nextScreens) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 2, screens: nextScreens }));
      screens = nextScreens;
      render();
      return true;
    } catch {
      notify('Não foi possível salvar. Verifique o armazenamento do site e tente novamente.', true);
      return false;
    }
  }

  function resultFor(record) {
    return calculator.getPresentation(record).value;
  }

  function destinationHint() {
    if (!storageReadable) return;
    notify('Novo valor substitui o anterior.');
  }

  function renderSaveControls() {
    const snapshot = calculator.getSnapshot();
    saveButton.disabled = !storageReadable || !snapshot;
    saveButton.setAttribute('aria-label', `Salvar novo valor na Tela ${selectedScreen + 1}`);
    cards.querySelectorAll('[data-save-current]').forEach(button => { button.disabled = !storageReadable || !snapshot; });
    cards.querySelectorAll('[data-record-action]').forEach(button => { button.disabled = !storageReadable; });
  }

  function renderCards() {
    cards.replaceChildren();
    const record = screens[selectedScreen];
    const card = element('article', 'deposit-card');
    const presentation = record ? calculator.getPresentation(record) : null;
    card.classList.toggle('is-done', Boolean(record?.done));
    card.append(element('h4', 'deposit-label', record?.done ? 'Tela concluída' : presentation?.exceedsBlock ? 'Total de giros necessários' : 'Último valor salvo'));
    if (record) {
      const value = resultFor(record);
      const output = element('p', 'deposit-value', record.done ? '✓ OK' : value);
      if (value.length > 9) output.classList.add('compact');
      card.append(output);
      if (presentation.exceedsBlock && !record.done) {
        const plan = element('div', 'saved-roll-plan');
        plan.append(element('span', 'roll-badge', 'Mais de 1000 giros'));
        plan.append(element('span', '', presentation.breakdown));
        plan.append(element('strong', '', presentation.instruction));
        card.append(plan);
      }
      card.append(element('p', 'deposit-metadata', `Inicial ${calculator.formatInput(record.initial)} · Perfil ${calculator.formatInput(record.x)} · ÷ ${calculator.formatInput(record.divisor)}`));
      card.append(element('p', 'deposit-time', timeFormatter.format(new Date(record.savedAt))));
    } else {
      card.append(element('p', 'deposit-empty', 'Ainda não salvo'));
    }
    const save = element('button', 'small-action primary', 'Salvar resultado atual nesta tela');
    save.type = 'button'; save.dataset.saveCurrent = '';
    save.setAttribute('aria-label', `Salvar novo valor na Tela ${selectedScreen + 1}`);
    card.append(save);
    if (record) {
      const actions = element('div', 'deposit-actions');
      const done = element('button', 'small-action done-action', record.done ? 'Reabrir tela' : '✓ Marcar OK');
      done.type = 'button'; done.dataset.recordAction = 'done'; done.dataset.recordId = record.id;
      done.setAttribute('aria-label', `${record.done ? 'Reabrir' : 'Marcar como OK a'} Tela ${selectedScreen + 1}`);
      const remove = element('button', 'small-action delete-action', 'Excluir valor');
      remove.type = 'button'; remove.dataset.recordAction = 'delete'; remove.dataset.recordId = record.id;
      remove.setAttribute('aria-label', `Excluir valor da Tela ${selectedScreen + 1}`);
      actions.append(done, remove); card.append(actions);
    }
    cards.append(card);
  }

  function renderQueue() {
    const pending = screens.flatMap((record, index) => record && !record.done
      ? [{ record, index, presentation: calculator.getPresentation(record) }] : []);
    pending.sort((a, b) => a.presentation.totalSpins - b.presentation.totalSpins || a.index - b.index);
    const view = app.ownerDocument.defaultView;
    const pageSize = view.innerWidth <= 580 || view.innerHeight <= 620 ? 5 : 10;
    const pageCount = Math.max(1, Math.ceil(pending.length / pageSize));
    queuePage = Math.min(queuePage, pageCount - 1);
    queue.replaceChildren();
    pending.forEach(({ record, index, presentation }, position) => {
      const item = element('li');
      item.hidden = Math.floor(position / pageSize) !== queuePage;
      const button = element('button', 'queue-choice');
      button.type = 'button'; button.dataset.queueScreen = index;
      button.append(element('span', 'queue-rank', String(position + 1)), element('span', 'queue-screen', `Tela ${index + 1}`));
      const detail = presentation.exceedsBlock
        ? `${presentation.value} giros`
        : `Parar em ${resultFor(record)}`;
      button.append(element('span', 'queue-stop', detail));
      button.title = presentation.exceedsBlock ? `${presentation.breakdown}; ${presentation.instruction}` : detail;
      button.setAttribute('aria-label', `${position + 1}ª: Tela ${index + 1}, ${detail}${presentation.exceedsBlock ? `; ${presentation.instruction}` : ''}. Ver tela.`);
      item.append(button); queue.append(item);
    });
    find('queue-count').textContent = String(pending.length);
    find('queue-empty').hidden = pending.length > 0;
    queue.hidden = pending.length === 0;
    find('queue-pagination').hidden = pageCount === 1;
    find('queue-page').textContent = `${queuePage * pageSize + 1}–${Math.min((queuePage + 1) * pageSize, pending.length)} de ${pending.length}`;
    find('queue-previous').disabled = queuePage === 0;
    find('queue-next').disabled = queuePage + 1 === pageCount;
  }

  function render() {
    let filledScreens = 0;
    screens.forEach((record, index) => {
      if (record) filledScreens++;
      const value = record?.done ? '✓ OK' : record ? resultFor(record) : '—';
      const presentation = record ? calculator.getPresentation(record) : null;
      const text = record ? `Tela ${index + 1} · ${value}${!record.done && presentation.exceedsBlock ? ' giros' : ''}` : `Tela ${index + 1}`;
      target.options[index].textContent = text;
      dialogTarget.options[index].textContent = text;
      const button = screenGrid.children[index];
      button.setAttribute('aria-pressed', String(index === selectedScreen));
      const description = record?.done ? 'OK, tela concluída' : presentation?.exceedsBlock ? `${value} giros necessários; ${presentation.breakdown}; ${presentation.instruction}` : `valor salvo ${value}`;
      button.setAttribute('aria-label', `Tela ${index + 1}, ${record ? description : 'nenhum valor salvo'}`);
      button.title = record ? description : 'Nenhum valor salvo';
      button.classList.toggle('over-limit', Boolean(presentation?.exceedsBlock && !record.done));
      button.classList.toggle('is-done', Boolean(record?.done));
      button.querySelector('.screen-value').textContent = value;
    });
    target.value = String(selectedScreen); dialogTarget.value = String(selectedScreen);
    find('records-open').setAttribute('aria-label', `Abrir telas salvas, ${filledScreens} de 10 telas com registros`);
    find('selected-screen-title').textContent = `Tela ${selectedScreen + 1}`;
    renderCards(); renderQueue(); renderSaveControls();
  }

  function selectScreen(index) {
    if (!Number.isInteger(index) || index < 0 || index > 9) return;
    selectedScreen = index;
    render(); destinationHint();
  }

  function saveDeposit() {
    const snapshot = calculator.getSnapshot();
    if (!snapshot) { notify('Calcule um valor válido antes de salvar.', true); return; }
    if (!refreshStorage()) { renderSaveControls(); return; }
    const next = screens.slice();
    const savedScreen = selectedScreen;
    next[savedScreen] = { ...snapshot, id: window.crypto.randomUUID(), savedAt: Date.now(), done: false };
    if (persist(next)) {
      selectedScreen = (savedScreen + 1) % 10;
      render();
      notify(`Tela ${savedScreen + 1}: ${resultFor(screens[savedScreen])} salvo. Próxima: Tela ${selectedScreen + 1}.`);
      if (dialog.open) cards.querySelector('[data-save-current]')?.focus();
    }
  }

  function updateRecord(action, expectedId) {
    if (!refreshStorage()) { renderSaveControls(); return; }
    const record = screens[selectedScreen];
    if (!record || record.id !== expectedId) {
      render(); notify('O valor desta tela mudou em outra aba. Confira antes de tentar novamente.', true); return;
    }
    const next = screens.slice();
    next[selectedScreen] = action === 'delete' ? null : { ...record, done: !record.done };
    if (persist(next)) {
      notify(action === 'delete' ? `Valor da Tela ${selectedScreen + 1} excluído.`
        : `Tela ${selectedScreen + 1} ${record.done ? 'reaberta e devolvida à fila' : 'marcada como OK'}.`);
      (action === 'delete' ? cards.querySelector('[data-save-current]') : cards.querySelector('[data-record-action="done"]'))?.focus();
    }
  }

  function selectView(tab, focus = false) {
    viewTabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      find(item.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  }

  for (let index = 0; index < 10; index++) {
    for (const select of [target, dialogTarget]) {
      const option = element('option', '', `Tela ${index + 1}`);
      option.value = String(index); select.append(option);
    }
    const button = element('button', 'screen-choice');
    button.type = 'button'; button.dataset.screen = index;
    button.append(element('span', '', `Tela ${index + 1}`), element('span', 'screen-value', '—'));
    screenGrid.append(button);
  }

  target.addEventListener('change', () => selectScreen(Number(target.value)));
  dialogTarget.addEventListener('change', () => selectScreen(Number(dialogTarget.value)));
  screenGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-screen]');
    if (button) selectScreen(Number(button.dataset.screen));
  });
  saveButton.addEventListener('click', () => saveDeposit());
  find('records-open').addEventListener('click', () => {
    refreshStorage(); render(); dialog.showModal();
  });
  find('records-close').addEventListener('click', () => dialog.close());
  cards.addEventListener('click', event => {
    if (event.target.closest('[data-save-current]')) saveDeposit();
    const action = event.target.closest('[data-record-action]');
    if (action) updateRecord(action.dataset.recordAction, action.dataset.recordId);
  });
  viewTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectView(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      selectView(viewTabs[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index], true);
    });
  });
  queue.addEventListener('click', event => {
    const button = event.target.closest('[data-queue-screen]');
    if (!button) return;
    selectScreen(Number(button.dataset.queueScreen));
    selectView(viewTabs[0]);
    const gridButton = screenGrid.children[selectedScreen];
    (gridButton.getClientRects().length ? gridButton : dialogTarget).focus();
  });
  find('queue-previous').addEventListener('click', () => { queuePage = Math.max(0, queuePage - 1); renderQueue(); });
  find('queue-next').addEventListener('click', () => { queuePage++; renderQueue(); });
  window.addEventListener('resize', renderQueue);
  app.addEventListener('calculationchange', () => { renderSaveControls(); destinationHint(); });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === legacyStorageKey || event.key === null) { refreshStorage(); render(); destinationHint(); }
  });

  function restoreFromFloating() {
    if (app.ownerDocument !== mainDocument) {
      const recordsOpen = dialog.open;
      if (recordsOpen) dialog.close();
      mainDocument.body.insertBefore(app, placeholder);
      if (recordsOpen) dialog.showModal();
    }
    placeholder.hidden = true;
    floatingWindow = null;
    pipLabel.textContent = 'Flutuar';
    pipButton.setAttribute('aria-pressed', 'false');
    pipButton.title = 'Abrir calculadora em uma janela flutuante';
    renderQueue();
  }

  function returnToTab() {
    const current = floatingWindow;
    restoreFromFloating();
    if (current && !current.closed) current.close();
    window.focus();
  }

  pipButton.addEventListener('click', async () => {
    if (floatingWindow && !floatingWindow.closed) { returnToTab(); return; }
    if (opening) return;
    if (!window.documentPictureInPicture || !window.isSecureContext) {
      notify('Janela flutuante indisponível. Use um navegador compatível, como Chrome ou Edge no computador.', true); return;
    }
    opening = true; pipButton.disabled = true;
    try {
      const child = await window.documentPictureInPicture.requestWindow({ width: 420, height: 620 });
      floatingWindow = child;
      child.addEventListener('pagehide', () => { if (floatingWindow === child) restoreFromFloating(); }, { once: true });
      child.document.documentElement.lang = 'pt-BR';
      child.document.title = 'Ponto — Calculadora flutuante';
      const baseStyle = child.document.createElement('style');
      baseStyle.textContent = ':root{color-scheme:dark}body{margin:0;background:#0d1117;color:#f1f5f9}';
      child.document.head.append(baseStyle);
      mainDocument.querySelectorAll('link[rel="stylesheet"]').forEach(sheet => {
        const link = child.document.createElement('link'); link.rel = 'stylesheet'; link.href = sheet.href;
        child.document.head.append(link);
      });
      child.document.body.classList.add('pip-mode');
      child.document.body.append(app);
      child.addEventListener('resize', renderQueue);
      renderQueue();
      placeholder.hidden = false;
      pipLabel.textContent = 'Voltar'; pipButton.setAttribute('aria-pressed', 'true');
      pipButton.title = 'Voltar à aba original';
    } catch {
      const current = floatingWindow;
      restoreFromFloating();
      if (current && !current.closed) current.close();
      notify('Não foi possível abrir a janela flutuante neste navegador.', true);
    } finally { opening = false; pipButton.disabled = false; }
  });
  returnButton.addEventListener('click', returnToTab);
  app.querySelector('.brand').addEventListener('click', event => {
    if (floatingWindow) { event.preventDefault(); returnToTab(); }
  });

  refreshStorage(); render();
})();
