

// По условию: 40 чисел (1–40) и отдельный сектор зеро.
// Нечётные числа — красные, чётные — чёрные.
const RED = '#c83d4b';
const BLACK = '#111a29';
const GREEN = '#159b6a';
const TOTAL_SECTORS = 41;
const SECTOR_ANGLE = 360 / TOTAL_SECTORS;
const STORAGE_KEY = 'roulette81_players_v1';

let users = loadUsers();
let currentUser = null;
let currentBet = null;
let spinning = false;
let rotation = 0;

const $ = (id) => document.getElementById(id);

function loadUsers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(u => u && typeof u.name === 'string') : [];
  } catch { return []; }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
function makeUser(name) {
  return { name, balance: 1000, max: 1000 };
}
function init() {
  drawWheel();
  drawNumberButtons();
  $('addUserBtn').addEventListener('click', addUser);
  $('deleteUserBtn').addEventListener('click', deleteUser);
  $('userSelect').addEventListener('change', e => switchUser(e.target.value));
  $('spinBtn').addEventListener('click', spin);
  document.querySelectorAll('[data-bet]').forEach(btn => btn.addEventListener('click', () => setBet(btn.dataset.bet)));
  document.querySelectorAll('[data-amount]').forEach(btn => btn.addEventListener('click', () => $('betInput').value = btn.dataset.amount));
  if (!users.length) users.push(makeUser('Игрок 1'));
  renderUserList();
  switchUser(users[0].name);
  renderLeaderboard();
}
function drawWheel() {
  const wheel = $('wheel');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-250 -250 500 500');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Рулетка с зеро и числами от 1 до 40: нечётные красные, чётные чёрные');

  const sectors = [{ number: 0, color: 'zero', label: '0' }];
  for (let n = 1; n <= 40; n++) {
    sectors.push({
      number: n,
      color: n % 2 === 0 ? 'black' : 'red',
      label: String(n)
    });
  }

  sectors.forEach((sector, i) => {
    // Нулевой сектор центрирован под верхней неподвижной стрелкой при rotation=0.
    const start = -90 - SECTOR_ANGLE / 2 + i * SECTOR_ANGLE;
    const end = start + SECTOR_ANGLE;
    const r = 244;
    const p1 = polar(r, start), p2 = polar(r, end);
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M 0 0 L ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y} Z`);
    path.setAttribute('fill', sector.color === 'zero' ? GREEN : sector.color === 'red' ? RED : BLACK);
    path.setAttribute('stroke', '#d5b66e');
    path.setAttribute('stroke-width', '.8');
    svg.appendChild(path);

    const mid = start + SECTOR_ANGLE / 2;
    const pos = polar(207, mid);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y);
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', '800');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('transform', `rotate(${mid + 90} ${pos.x} ${pos.y})`);
    text.textContent = sector.label;
    svg.appendChild(text);
  });
  wheel.replaceChildren(svg);
}
function polar(radius, degrees) {
  const radians = degrees * Math.PI / 180;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
}
function drawNumberButtons() {
  const grid = $('numberGrid');
  for (let n = 1; n <= 40; n++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-btn';
    button.textContent = n;
    button.dataset.number = n;
    button.addEventListener('click', () => setBet(String(n)));
    grid.appendChild(button);
  }
}
function addUser() {
  if (spinning) return;
  const name = (prompt('Имя нового игрока:') || '').trim().slice(0, 24);
  if (!name) return;
  if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
    alert('Игрок с таким именем уже существует.');
    return;
  }
  const user = makeUser(name);
  users.push(user);
  saveData();
  renderUserList();
  switchUser(name);
}
function deleteUser() {
  if (spinning || !currentUser) return;
  if (!confirm(`Удалить игрока «${currentUser.name}»? Его баланс и рекорд будут удалены.`)) return;
  users = users.filter(u => u !== currentUser);
  if (!users.length) users.push(makeUser('Игрок 1'));
  saveData();
  renderUserList();
  switchUser(users[0].name);
  renderLeaderboard();
}
function renderUserList() {
  const select = $('userSelect');
  select.replaceChildren();
  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user.name;
    option.textContent = user.name;
    select.appendChild(option);
  });
}
function switchUser(name) {
  currentUser = users.find(u => u.name === name) || users[0];
  if (!currentUser) return;
  $('userSelect').value = currentUser.name;
  updateUI();
}
function updateUI() {
  if (!currentUser) return;
  $('bal').textContent = format(currentUser.balance);
  $('max').textContent = format(currentUser.max);
  renderLeaderboard();
}
function format(value) {
  return Math.floor(value).toLocaleString('ru-RU');
}
function setBet(type) {
  if (spinning) return;
  currentBet = type;
  document.querySelectorAll('.bet-choice, .number-btn').forEach(b => b.classList.remove('active'));
  // Если в type записаны цифры, игрок выбрал конкретное число.
  if (/^\d+$/.test(type)) {
    const button = document.querySelector(`[data-number="${type}"]`);
    if (button) button.classList.add('active');
    $('selectedBet').textContent = `Выбрано число ${type} · выплата ×4`;
  } else {
    const button = document.querySelector(`[data-bet="${type}"]`);
    if (button) button.classList.add('active');
    const labels = { red: 'Красное', black: 'Чёрное', even: 'Чётное', odd: 'Нечётное', zero: 'Зеро' };
    const mult = type === 'zero' ? 5 : 2;
    $('selectedBet').textContent = `Выбрано: ${labels[type]} · выплата ×${mult}`;
  }
  $('status').textContent = '';
  $('status').className = 'status';
}
function getSector(index) {
  if (index === 0) return { number: 0, color: 'zero' };
  const number = index;
  return { number, color: number % 2 === 0 ? 'black' : 'red' };
}
function matchesBet(bet, result) {
  if (/^\d+$/.test(bet)) return result.number === Number(bet);
  switch (bet) {
    case 'zero': return result.number === 0;
    case 'red': return result.color === 'red';
    case 'black': return result.color === 'black';
    case 'even': return result.number !== 0 && result.number % 2 === 0;
    case 'odd': return result.number !== 0 && result.number % 2 === 1;
    default: return false;
  }
}
function multiplier(bet) {
  if (/^\d+$/.test(bet)) return 4;
  return bet === 'zero' ? 5 : 2;
}
function spin() {
  if (spinning) return;
  if (!currentUser) return;
  if (currentBet === null) return showStatus('Сначала выберите ставку.', 'error');
  const amount = Number($('betInput').value);
  if (!Number.isSafeInteger(amount) || amount <= 0) return showStatus('Введите целую ставку больше нуля.', 'error');
  if (amount > currentUser.balance) return showStatus('Недостаточно монет для такой ставки.', 'error');

  spinning = true;
  const button = $('spinBtn');
  button.disabled = true;
  button.textContent = 'Колесо вращается...';
  currentUser.balance -= amount;
  updateUI();

  const resultIndex = Math.floor(Math.random() * TOTAL_SECTORS);
  const result = getSector(resultIndex);
  // Сектор 0 (зеро) расположен под стрелкой в исходном положении; каждый следующий
  // сектор идёт по часовой стрелке. Поэтому для попадания resultIndex под стрелку
  // колесо нужно повернуть против часовой на resultIndex * угол.
  const targetMod = (360 - resultIndex * SECTOR_ANGLE) % 360;
  const currentMod = ((rotation % 360) + 360) % 360;
  const delta = (targetMod - currentMod + 360) % 360;
  rotation += 360 * 6 + delta;
  $('wheel').style.transition = 'transform 5.2s cubic-bezier(.12,.72,.12,1)';
  $('wheel').style.transform = `rotate(${rotation}deg)`;

  window.setTimeout(() => {
    const won = matchesBet(currentBet, result);
    const payout = won ? amount * multiplier(currentBet) : 0;
    if (won) currentUser.balance += payout;
    currentUser.max = Math.max(currentUser.max, currentUser.balance);
    saveData();
    updateUI();
    showResult(result, won, amount, payout);
    spinning = false;
    button.disabled = false;
    button.textContent = 'Крутить колесо';
    if (currentUser.balance <= 0) {
      showStatus(`Баланс обнулился. Ваш рекорд: ${format(currentUser.max)} монет.`, 'error');
    }
  }, 5350);
}
function showResult(result, won, amount, payout) {
  const ball = $('resultBall');
  ball.className = `result-ball ${result.color}`;
  ball.textContent = result.number;
  $('resultText').textContent = `${result.number} · ${result.color === 'zero' ? 'Зеро' : result.color === 'red' ? 'Красное' : 'Чёрное'}`;
  if (won) {
    showStatus(`Вы выиграли ${format(payout)} монет! Чистая прибыль: +${format(payout - amount)}.`, 'win');
  } else {
    showStatus(`Не повезло — ставка ${format(amount)} монет проиграна.`, 'lose');
  }
}
function showStatus(message, type) {
  $('status').textContent = message;
  $('status').className = `status ${type}`;
}
function renderLeaderboard() {
  const list = $('leaderboard');
  if (!list) return;
  const sorted = [...users].sort((a, b) => (b.max || b.balance) - (a.max || a.balance)).slice(0, 10);
  list.replaceChildren();
  if (!sorted.length) {
    const li = document.createElement('li');
    li.className = 'empty-records';
    li.textContent = 'Рекордов пока нет';
    list.appendChild(li);
    return;
  }
  sorted.forEach(user => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    const score = document.createElement('strong');
    name.textContent = user.name;
    score.textContent = `${format(user.max || user.balance)} монет`;
    li.append(name, score);
    list.appendChild(li);
  });
}
init();
