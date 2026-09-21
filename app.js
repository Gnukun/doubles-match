const STORAGE_KEY = 'batokumi-session-v1';
const DEFAULT_NAMES = ['', '', '', '', '', '', '', '', '', '', '', ''];
const MAX_MATCHES = 50;

const app = document.querySelector('#app');
const toastRegion = document.querySelector('#toast-region');
let state = loadState();
let currentScreen = state ? (state.matches?.length ? 'match' : 'participants') : 'home';
let setupError = '';

function newSession() {
  return {
    participants: DEFAULT_NAMES.map((name, index) => ({ id: crypto.randomUUID(), name, number: index + 1, status: 'active', joinedAt: Date.now() + index })),
    courts: [{ type: 'doubles' }, { type: 'doubles' }],
    matchCount: 10,
    matches: [],
    selectedMatchIndex: 0,
    currentMatch: null,
    matchNumber: 0,
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return null;
    saved.matchCount ||= saved.matches?.length || 10;
    saved.matches ||= saved.currentMatch ? [saved.currentMatch] : [];
    saved.matches = saved.matches.map((match, index) => ({ status: index === 0 ? 'in-progress' : 'pending', ...match, number: index + 1 }));
    saved.selectedMatchIndex = Math.min(saved.selectedMatchIndex || 0, Math.max(saved.matches.length - 1, 0));
    saved.currentMatch = saved.matches[saved.selectedMatchIndex] || null;
    return saved;
  } catch { return null; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function displayName(person) { return person?.name?.trim() || `${person?.number || '?'}番`; }
function activeParticipants() { return state.participants.filter(person => person.status === 'active'); }
function participantById(id) { return state.participants.find(person => person.id === id); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function labelForType(type) { return type === 'doubles' ? 'ダブルス' : 'シングルス'; }
function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; toastRegion.append(toast); setTimeout(() => toast.remove(), 2600); }
function button(label, action, className = 'btn-secondary', extra = '') { return `<button class="btn ${className}" data-action="${action}" ${extra}>${label}</button>`; }
function renderHeader(action = '') { return `<header class="app-header"><div class="header-inner"><a class="brand" href="#" data-action="home"><span class="brand-mark">B</span><span>バトクミ</span></a><div class="header-actions">${action}</div></div></header>`; }
function render() {
  if (currentScreen === 'home') app.innerHTML = renderHome();
  if (currentScreen === 'participants') app.innerHTML = renderParticipants();
  if (currentScreen === 'courts') app.innerHTML = renderCourts();
  if (currentScreen === 'match') app.innerHTML = renderMatch();
  bindEvents();
}
function renderHome() {
  return `<div class="app-shell">${renderHeader()}<main class="page"><section class="hero"><div class="hero-copy"><div class="eyebrow">PLAY FAIR, PLAY MORE</div><h1>ダブルス組み分けを、<br>もっと軽やかに。</h1><p class="lead">参加者とコートを設定するだけで、試合の組み合わせをまとめて作成できます。名前なしでも、途中参加でも大丈夫。</p><div class="hero-actions">${button('新しく始める', 'new-session', 'btn-primary btn-large')} ${button('使い方を見る', 'how-to', 'btn-secondary btn-large')}</div><p class="hero-note">入力内容はこの端末に自動保存されます。</p></div><div class="hero-visual"><div class="visual-board"><div class="visual-top"><span class="visual-title">第4試合</span><span class="visual-pill">組み合わせ済み</span></div><div class="visual-match"><div class="visual-court">コート1 · ダブルス</div><div class="visual-teams"><span>田中・佐藤</span><span class="visual-vs">VS</span><span>3番・山田</span></div></div><div class="visual-match"><div class="visual-court">コート2 · シングルス</div><div class="visual-teams"><span>鈴木</span><span class="visual-vs">VS</span><span>7番</span></div></div><div class="visual-wait">待機中 · 2人</div></div></div></section></main></div>`;
}
function renderStepper(step) { return `<div class="stepper"><div class="step ${step === 1 ? 'active' : ''}"><span class="step-number">1</span><span>参加者</span></div><span class="step-line"></span><div class="step ${step === 2 ? 'active' : ''}"><span class="step-number">2</span><span>コート・試合数</span></div></div>`; }
function renderParticipants() {
  return `<div class="app-shell">${renderHeader(button('ホーム', 'home', 'btn-quiet'))}<main class="page page-narrow">${renderStepper(1)}<div class="setup-header"><div><div class="eyebrow">STEP 1</div><h2>参加者を設定</h2><p class="muted">名前はあとから変更できます。</p></div></div>${setupError ? `<div class="alert">${setupError}</div>` : ''}<section class="panel"><div class="panel-heading"><div><div class="section-label">参加人数</div><h3>参加する人数</h3></div><div class="number-stepper">${button('−', 'decrease-participants', 'btn-secondary icon-btn', 'aria-label="人数を減らす"')}<span class="stepper-value">${state.participants.length}人</span>${button('＋', 'increase-participants', 'btn-secondary icon-btn', 'aria-label="人数を増やす"')}</div></div><p class="muted small">名前が空欄の場合は番号で表示します。</p></section><section class="panel"><div class="panel-heading"><div><div class="section-label">参加者一覧</div><h3>名前を入力</h3></div></div>${state.participants.map((person, index) => `<label class="field-row"><span class="field-number">${index + 1}</span><input class="input participant-input" data-id="${person.id}" value="${escapeHtml(person.name)}" placeholder="${index + 1}番" maxlength="20"></label>`).join('')}</section><div class="setup-footer">${button('コート・試合数へ', 'to-courts', 'btn-primary btn-large')}</div></main></div>`;
}
function renderCourts() {
  return `<div class="app-shell">${renderHeader(button('戻る', 'to-participants', 'btn-quiet'))}<main class="page page-narrow">${renderStepper(2)}<div class="setup-header"><div><div class="eyebrow">STEP 2</div><h2>コートと試合数を設定</h2><p class="muted">最初に、すべての試合を作成します。</p></div></div>${setupError ? `<div class="alert">${setupError}</div>` : ''}<section class="panel"><div class="panel-heading"><div><div class="section-label">試合数</div><h3>作成する試合</h3></div><div class="number-stepper">${button('−', 'decrease-matches', 'btn-secondary icon-btn', 'aria-label="試合数を減らす"')}<span class="stepper-value">${state.matchCount}試合</span>${button('＋', 'increase-matches', 'btn-secondary icon-btn', 'aria-label="試合数を増やす"')}</div></div><p class="muted small">最大${MAX_MATCHES}試合まで設定できます。</p></section><section class="panel"><div class="panel-heading"><div><div class="section-label">コート数</div><h3>使うコート</h3></div><div class="number-stepper">${button('−', 'decrease-courts', 'btn-secondary icon-btn', 'aria-label="コートを減らす"')}<span class="stepper-value">${state.courts.length}面</span>${button('＋', 'increase-courts', 'btn-secondary icon-btn', 'aria-label="コートを増やす"')}</div></div><div class="manage-list">${state.courts.map((court, index) => `<label class="field-row"><span class="field-number">${index + 1}</span><select class="input select court-select" data-index="${index}"><option value="doubles" ${court.type === 'doubles' ? 'selected' : ''}>ダブルス</option><option value="singles" ${court.type === 'singles' ? 'selected' : ''}>シングルス</option></select></label>`).join('')}</div></section><div class="setup-footer">${button('全試合を作成', 'start-matches', 'btn-primary btn-large')}</div></main></div>`;
}

function collectHistory(matches) {
  const appearances = new Map(state.participants.map(person => [person.id, 0]));
  const waits = new Map(state.participants.map(person => [person.id, 0]));
  const partners = new Map(state.participants.map(person => [person.id, new Set()]));
  const opponents = new Map(state.participants.map(person => [person.id, new Set()]));
  matches.forEach(match => {
    (match.waiting || []).forEach(id => waits.set(id, (waits.get(id) || 0) + 1));
    (match.courts || []).forEach(court => {
      if (court.missing || !court.teams?.length) return;
      const teams = court.teams;
      [...teams[0], ...teams[1]].forEach(id => appearances.set(id, (appearances.get(id) || 0) + 1));
      teams[0].forEach(a => teams[0].forEach(b => a !== b && partners.get(a)?.add(b)));
      teams[1].forEach(a => teams[1].forEach(b => a !== b && partners.get(a)?.add(b)));
      teams[0].forEach(a => teams[1].forEach(b => { opponents.get(a)?.add(b); opponents.get(b)?.add(a); }));
    });
  });
  return { appearances, waits, partners, opponents };
}
function candidateScore(person, history) { return (history.appearances.get(person.id) || 0) * 1000 + (history.waits.get(person.id) || 0) * 850 + (history.partners.get(person.id)?.size || 0) * 2 + Math.random() * 0.1; }
function choosePlayers(available, count, history) {
  const selected = [];
  const pool = [...available];
  while (selected.length < count && pool.length) {
    pool.sort((a, b) => {
      const score = person => candidateScore(person, history) + selected.reduce((sum, other) => sum + (history.partners.get(other.id)?.has(person.id) ? 90 : 0) + (history.opponents.get(other.id)?.has(person.id) ? 15 : 0), 0);
      return score(a) - score(b);
    });
    selected.push(pool.shift());
  }
  return selected;
}
function generateMatch(number, historyMatches = []) {
  const history = collectHistory(historyMatches);
  const available = [...activeParticipants()];
  const used = new Set();
  const courts = state.courts.map((court, index) => {
    const count = court.type === 'doubles' ? 4 : 2;
    const candidates = available.filter(person => !used.has(person.id));
    if (candidates.length < count) return { index, type: court.type, teams: [], missing: count - candidates.length };
    const selected = choosePlayers(candidates, count, history);
    selected.forEach(person => used.add(person.id));
    return { index, type: court.type, teams: court.type === 'doubles' ? [[selected[0].id, selected[1].id], [selected[2].id, selected[3].id]] : [[selected[0].id], [selected[1].id]] };
  });
  return { number, status: 'pending', courts, waiting: available.filter(person => !used.has(person.id)).map(person => person.id), createdAt: Date.now() };
}
function createAllMatches(startIndex = 0) {
  const fixed = state.matches.slice(0, startIndex);
  const generated = [...fixed];
  for (let index = startIndex; index < state.matchCount; index += 1) generated.push(generateMatch(index + 1, generated));
  generated.forEach((match, index) => { if (index >= startIndex) match.status = index === startIndex ? 'in-progress' : 'pending'; });
  state.matches = generated;
  state.selectedMatchIndex = Math.min(startIndex, generated.length - 1);
  state.currentMatch = generated[state.selectedMatchIndex];
  state.matchNumber = generated.length;
  saveState();
}
function startMatches() {
  const need = state.courts.reduce((sum, court) => sum + (court.type === 'doubles' ? 4 : 2), 0);
  if (activeParticipants().length < need) { setupError = `現在の参加人数は${activeParticipants().length}人です。全コートでプレーするには${need}人必要です。コート数を減らすか、参加者を増やしてください。`; render(); return; }
  createAllMatches(0); currentScreen = 'match'; setupError = ''; render(); showToast(`${state.matchCount}試合を作成しました`);
}
function teamNames(ids) { return (ids || []).map(id => displayName(participantById(id))).join('・'); }
function statusLabel(status) { return status === 'completed' ? '✓ 完了' : status === 'in-progress' ? '● 進行中' : '未実施'; }
function statusClass(status) { return status === 'completed' ? 'completed' : status === 'in-progress' ? 'in-progress' : 'pending'; }
function renderMatchCard(court) {
  if (court.missing) { const required = court.type === 'doubles' ? 4 : 2; return `<article class="court-card"><div class="court-head"><div class="court-meta"><h3>コート${court.index + 1}</h3><span class="type-badge">${labelForType(court.type)}</span></div></div><div class="court-body"><div class="alert">${labelForType(court.type)}には${required}人必要です。現在は${required - court.missing}人が出場できます。</div></div></article>`; }
  return `<article class="court-card"><div class="court-head"><div class="court-meta"><h3>コート${court.index + 1}</h3><span class="type-badge">${labelForType(court.type)}</span></div><span class="small muted">${court.type === 'doubles' ? '4人' : '2人'}</span></div><div class="court-body"><div class="matchup"><div class="team">${teamNames(court.teams[0])}</div><div class="vs">VS</div><div class="team">${teamNames(court.teams[1])}</div></div></div></article>`;
}
function renderMatchTabs() { return `<div class="match-tabs" aria-label="試合を選択">${state.matches.map((match, index) => `<button class="match-tab ${index === state.selectedMatchIndex ? 'selected' : ''}" data-action="select-match:${index}"><span>第${index + 1}試合</span><small class="status-dot ${statusClass(match.status)}">${statusLabel(match.status)}</small></button>`).join('')}</div>`; }
function renderHistory() { return `<section class="history"><div class="section-label">PROGRESS</div><h2>試合の進行</h2><div class="history-list">${state.matches.map((match, index) => `<button class="history-item history-button ${index === state.selectedMatchIndex ? 'selected' : ''}" data-action="select-match:${index}"><span><strong>第${index + 1}試合</strong><span class="muted small">${match.courts.length}面</span></span><span class="status-badge ${statusClass(match.status)}">${statusLabel(match.status)}</span></button>`).join('')}</div></section>`; }
function renderMatch() {
  const match = state.matches[state.selectedMatchIndex] || state.matches[0];
  const waiting = match?.waiting.map(id => participantById(id)).filter(Boolean) || [];
  const atFirst = state.selectedMatchIndex === 0;
  const atLast = state.selectedMatchIndex === state.matches.length - 1;
  return `<div class="app-shell">${renderHeader(`${button('参加者を管理', 'manage-participants', 'btn-secondary')} ${button('ホーム', 'home', 'btn-quiet')}`)}<main class="page"><div class="match-header"><div><div class="eyebrow">MATCH ${match?.number || 1} / ${state.matches.length}</div><h2>第${match?.number || 1}試合</h2><p class="muted">${statusLabel(match?.status)} · 全${state.matchCount}試合を作成済み</p></div><span class="match-count">${state.participants.length}人登録 · ${state.courts.length}面</span></div>${renderMatchTabs()}<div class="match-grid">${match?.courts.map(renderMatchCard).join('')}</div><section class="waiting-panel"><div class="waiting-heading"><h3>待機中</h3><span class="small muted">次の試合で出場できます</span></div>${waiting.length ? `<div class="waiting-list">${waiting.map(person => `<span class="waiting-person">${escapeHtml(displayName(person))}</span>`).join('')}</div>` : '<p class="muted small" style="margin-top:10px">待機者はいません</p>'}</section><div class="action-bar">${!atFirst ? button(`← 第${match.number - 1}試合`, `select-match:${state.selectedMatchIndex - 1}`, 'btn-secondary') : ''}${match?.status !== 'completed' ? button('試合完了', 'complete-match', 'btn-primary btn-large') : button('完了済み', 'noop', 'btn-secondary', 'disabled')} ${!atLast ? button(`第${match.number + 1}試合 →`, `select-match:${state.selectedMatchIndex + 1}`, 'btn-secondary') : ''}</div><div class="image-actions">${button('現在の試合を画像保存', 'save-image', 'btn-secondary')}</div>${renderHistory()}</main></div>`;
}
function renderManageModal() {
  const firstUncompleted = state.matches.findIndex(match => match.status !== 'completed');
  return `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="manage-title" onclick="event.stopPropagation()"><div class="modal-heading"><div><div class="eyebrow">PLAYERS</div><h2 id="manage-title">参加者を管理</h2></div>${button('閉じる', 'close-modal', 'btn-quiet')}</div><p class="muted small">状態の変更と追加は、これからの試合に反映されます。</p><div class="manage-list" style="margin-top:14px">${state.participants.map(person => `<div class="manage-row"><div><strong>${escapeHtml(displayName(person))}</strong><div class="small muted">${person.status === 'active' ? '参加中' : person.status === 'rest' ? '休憩中' : '離脱'}</div></div><div class="manage-actions">${person.status !== 'active' ? button('参加', `set-status:${person.id}:active`, 'btn-secondary') : button('休憩', `set-status:${person.id}:rest`, 'btn-secondary')}${person.status !== 'left' ? button('離脱', `set-status:${person.id}:left`, 'btn-danger') : ''}</div></div>`).join('')}</div><div class="modal-actions">${button('参加者を追加', 'add-participant', 'btn-primary')}${firstUncompleted >= 0 ? button(`第${firstUncompleted + 1}試合以降を再生成`, 'regenerate-remaining', 'btn-secondary') : ''}</div></div></div>`;
}
function bindEvents() {
  document.querySelectorAll('[data-action]').forEach(element => element.addEventListener('click', handleAction));
  document.querySelectorAll('.participant-input').forEach(input => input.addEventListener('input', event => { participantById(event.target.dataset.id).name = event.target.value; saveState(); }));
  document.querySelectorAll('.court-select').forEach(select => select.addEventListener('change', event => { state.courts[Number(event.target.dataset.index)].type = event.target.value; saveState(); }));
}
function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === 'new-session') { state = newSession(); saveState(); currentScreen = 'participants'; setupError = ''; render(); return; }
  if (action === 'home') { currentScreen = 'home'; render(); return; }
  if (action === 'how-to') { showToast('参加者、コート、試合数の順に設定すると、全試合が作成されます'); return; }
  if (action === 'to-participants') { currentScreen = 'participants'; setupError = ''; render(); return; }
  if (action === 'to-courts') { currentScreen = 'courts'; setupError = ''; render(); return; }
  if (action === 'increase-participants' && state.participants.length < 40) { const number = state.participants.length + 1; state.participants.push({ id: crypto.randomUUID(), name: '', number, status: 'active', joinedAt: Date.now() }); saveState(); render(); return; }
  if (action === 'decrease-participants' && state.participants.length > 2) { state.participants.pop(); saveState(); render(); return; }
  if (action === 'increase-courts' && state.courts.length < 8) { state.courts.push({ type: 'doubles' }); saveState(); render(); return; }
  if (action === 'decrease-courts' && state.courts.length > 1) { state.courts.pop(); saveState(); render(); return; }
  if (action === 'increase-matches' && state.matchCount < MAX_MATCHES) { state.matchCount += 1; saveState(); render(); return; }
  if (action === 'decrease-matches' && state.matchCount > 1) { state.matchCount -= 1; saveState(); render(); return; }
  if (action === 'start-matches') { startMatches(); return; }
  if (action === 'complete-match') { const match = state.matches[state.selectedMatchIndex]; if (match) { match.status = 'completed'; if (state.matches[state.selectedMatchIndex + 1]) state.matches[state.selectedMatchIndex + 1].status = 'in-progress'; saveState(); render(); showToast(`第${match.number}試合を完了しました`); } return; }
  if (action === 'noop') return;
  if (action.startsWith('select-match:')) { const index = Number(action.split(':')[1]); if (state.matches[index]) { state.selectedMatchIndex = index; state.currentMatch = state.matches[index]; saveState(); render(); } return; }
  if (action === 'manage-participants') { document.body.insertAdjacentHTML('beforeend', renderManageModal()); bindEvents(); return; }
  if (action === 'close-modal') { document.querySelector('.modal-backdrop')?.remove(); return; }
  if (action === 'add-participant') { const number = state.participants.length + 1; state.participants.push({ id: crypto.randomUUID(), name: '', number, status: 'active', joinedAt: Date.now() }); saveState(); document.querySelector('.modal-backdrop')?.remove(); renderManageModalIntoPage(); showToast('参加者を追加しました。未実施分を再生成できます'); return; }
  if (action.startsWith('set-status:')) { const [, id, status] = action.split(':'); const person = participantById(id); if (person) person.status = status; saveState(); document.querySelector('.modal-backdrop')?.remove(); renderManageModalIntoPage(); showToast(`${displayName(person)}を${status === 'active' ? '参加中' : status === 'rest' ? '休憩中' : '離脱'}に変更しました`); return; }
  if (action === 'regenerate-remaining') { const index = state.matches.findIndex(match => match.status !== 'completed'); if (index >= 0) { createAllMatches(index); document.querySelector('.modal-backdrop')?.remove(); render(); showToast(`第${index + 1}試合以降を再生成しました`); } return; }
  if (action === 'save-image') saveMatchImage();
}
function renderManageModalIntoPage() { document.body.insertAdjacentHTML('beforeend', renderManageModal()); bindEvents(); }
function saveMatchImage() {
  const match = state.matches[state.selectedMatchIndex]; if (!match) return;
  const canvas = document.createElement('canvas'); const scale = 2; canvas.width = 900 * scale; canvas.height = (320 + match.courts.length * 150 + 150) * scale; const ctx = canvas.getContext('2d'); ctx.scale(scale, scale); const width = 900; ctx.fillStyle = '#f5f8fa'; ctx.fillRect(0, 0, width, canvas.height / scale); ctx.fillStyle = '#ffffff'; ctx.fillRect(40, 34, 820, canvas.height / scale - 68); ctx.fillStyle = '#17212b'; ctx.font = '800 30px sans-serif'; ctx.fillText('ダブルス組み分け', 80, 88); ctx.font = '700 22px sans-serif'; ctx.fillText(`第${match.number}試合 · ${statusLabel(match.status)}`, 80, 126); let y = 178; match.courts.forEach(court => { ctx.fillStyle = '#087f73'; ctx.font = '700 18px sans-serif'; ctx.fillText(`コート${court.index + 1}  ${labelForType(court.type)}`, 80, y); ctx.fillStyle = '#17212b'; ctx.font = '700 22px sans-serif'; if (court.missing) ctx.fillText('人数不足', 80, y + 44); else { ctx.fillText(teamNames(court.teams[0]), 80, y + 44); ctx.fillStyle = '#087f73'; ctx.font = '800 16px sans-serif'; ctx.fillText('VS', 420, y + 44); ctx.fillStyle = '#17212b'; ctx.font = '700 22px sans-serif'; ctx.fillText(teamNames(court.teams[1]), 500, y + 44); } y += 140; }); const waiting = match.waiting.map(id => displayName(participantById(id))).join('、') || 'なし'; ctx.fillStyle = '#fff5d9'; ctx.fillRect(80, y, 740, 62); ctx.fillStyle = '#795d22'; ctx.font = '700 17px sans-serif'; ctx.fillText(`待機中: ${waiting}`, 102, y + 38); const link = document.createElement('a'); link.download = `batokumi-${match.number}.png`; link.href = canvas.toDataURL('image/png'); link.click(); showToast('対戦表の画像を保存しました');
}

render();
