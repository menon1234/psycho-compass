// ══════════════════════════════════════════════════════
//  APP: State, navigation, quiz flow, rendering
// ══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://hjbywpwlfxrwfhngtxek.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYnl3cHdsZnhyd2Zobmd0eGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODc4NTcsImV4cCI6MjA5MjQ2Mzg1N30.kQPDRub7BubOP1Trlq8NlExAZAIi19mBgvjRgpdcNk8'
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

const QUESTIONS_PER_SESSION = 20;
const SESSION_TIME = 10;

let questionPool = [];
let currentQIndex = 0;
let sessionAnswers = [];
let timerInterval = null;
let timerValue = SESSION_TIME;
let bots = [];
let userNode = null;

// ── Navigation ──────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startQuiz() {
  questionPool = buildQuestionPool();
  currentQIndex = 0;
  sessionAnswers = [];
  buildDayChips();
  showScreen('screen-question');
  renderQuestion();
}

function skipToCompass() {
  bots = generateBots();
  const rng = seededRand(999);
  userNode = {
    id: 200, name: 'YOU', clusterIdx: Math.floor(rng() * 4),
    x: (rng() - 0.5) * 1.4, y: (rng() - 0.5) * 1.4,
    features: [0.25, 0.25, 0.25, 0.25],
    isUser: true
  };
  showScreen('screen-compass');
  buildCompass();
}

function buildDayChips() {
  const el = document.getElementById('day-chips');
  el.innerHTML = '';
  for (let d = 1; d <= 20; d++) {
    const chip = document.createElement('div');
    chip.className = 'day-chip' + (d === 1 ? ' active' : '');
    chip.textContent = d;
    el.appendChild(chip);
  }
}

// ── Question Rendering ───────────────────────────────

function renderQuestion() {
  if (currentQIndex >= QUESTIONS_PER_SESSION) {
    finishSession();
    return;
  }
  const q = questionPool[currentQIndex];
  const pct = (currentQIndex / QUESTIONS_PER_SESSION) * 100;

  document.getElementById('q-progress-bar').style.width = pct + '%';
  document.getElementById('q-counter').textContent =
    String(currentQIndex + 1).padStart(2, '0') + ' / ' + QUESTIONS_PER_SESSION;
  document.getElementById('q-category').textContent = q.category;
  document.getElementById('q-text').textContent = q.text;

  const optContainer = document.getElementById('q-options');
  optContainer.innerHTML = '';

  q.options.forEach((opt, i) => {
    const div = document.createElement('div');
    div.className = 'q-option';
    div.dataset.dim = opt.dim;
    div.dataset.idx = i;

    let inner = `<span class="opt-letter">${String.fromCharCode(65 + i)}</span>`;
    if (opt.swatchColor) {
      inner += `<span class="color-swatch" style="background:${opt.swatchColor}"></span>`;
    } else if (opt.icon) {
      inner += `<span class="opt-icon">${opt.icon}</span>`;
    }
    inner += `<div class="opt-text">${opt.label}</div>`;
    if (opt.sub) inner += `<div class="opt-sub">${opt.sub}</div>`;

    div.innerHTML = inner;
    div.addEventListener('click', () => selectOption(div, opt.dim));
    optContainer.appendChild(div);
  });

  const content = document.getElementById('q-content');
  content.classList.remove('q-exit');
  content.classList.add('q-enter');
  startTimer();
}

function selectOption(el, dim) {
  if (!el.classList.contains('timeout')) {
    document.querySelectorAll('.q-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    sessionAnswers.push(dim);
    clearInterval(timerInterval);
    setTimeout(() => nextQuestion(), 350);
  }
}

function nextQuestion() {
  currentQIndex++;
  const content = document.getElementById('q-content');
  content.classList.add('q-exit');
  setTimeout(() => {
    content.classList.remove('q-exit');
    renderQuestion();
  }, 200);
}

// ── Timer ────────────────────────────────────────────

function startTimer() {
  clearInterval(timerInterval);
  timerValue = SESSION_TIME;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerValue--;
    updateTimerDisplay();
    if (timerValue <= 0) {
      clearInterval(timerInterval);
      timeoutQuestion();
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById('timer-text').textContent = timerValue;
  const ring = document.getElementById('ring-fill');
  const pct = timerValue / SESSION_TIME;
  ring.style.strokeDashoffset = 138 * (1 - pct);
  if (timerValue <= 3) {
    ring.style.stroke = 'var(--pink)';
    document.getElementById('timer-text').style.color = 'var(--pink)';
  } else if (timerValue <= 6) {
    ring.style.stroke = 'var(--orange)';
    document.getElementById('timer-text').style.color = 'var(--orange)';
  } else {
    ring.style.stroke = 'var(--acid)';
    document.getElementById('timer-text').style.color = 'var(--white)';
  }
}

function timeoutQuestion() {
  const flash = document.getElementById('timeout-flash');
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 300);
  document.querySelectorAll('.q-option').forEach(o => o.classList.add('timeout'));
  sessionAnswers.push(-1);
  setTimeout(() => nextQuestion(), 600);
}

// ── Session Processing ───────────────────────────────

function finishSession() {
  clearInterval(timerInterval);
  showScreen('screen-processing');
  runProcessing();
}

async function runProcessing() {
  const steps = [
    { id: 'proc-log-1', msg: 'Initializing 200 bot profiles...', delay: 400 },
    { id: 'proc-log-2', msg: 'Generating response vectors (500 dims)...', delay: 700 },
    { id: 'proc-log-3', msg: 'Running K-means clustering (k=4)...', delay: 800 },
    { id: 'proc-log-4', msg: 'Projecting to 2D manifold (t-SNE simulation)...', delay: 900 },
    { id: 'proc-log-5', msg: 'Placing nodes on compass...', delay: 600 },
  ];

  let elapsed = 0;
  for (let i = 0; i < steps.length; i++) {
    await delay(elapsed);
    document.getElementById(steps[i].id).classList.add('active');
    const targetPct = ((i + 1) / steps.length) * 100;
    animateBar(targetPct);
    document.getElementById('proc-pct').textContent = Math.round(targetPct) + '%';
    elapsed = steps[i].delay;
  }
  await delay(elapsed + 400);

  bots = generateBots();
  userNode = computeUserPosition(sessionAnswers);
  await saveSessionToSupabase();

  showScreen('screen-compass');
  buildCompass();
}

async function saveSessionToSupabase() {
  const { error } = await db.from('sessions').insert({
    answers: sessionAnswers,
    cluster_idx: userNode.clusterIdx,
    archetype: CLUSTER_PROFILES[userNode.clusterIdx].name,
    x: userNode.x,
    y: userNode.y
  });

  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  console.log('Session saved successfully');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function animateBar(target) {
  const bar = document.getElementById('proc-bar');
  let current = parseFloat(bar.style.width) || 0;
  const step = (target - current) / 20;
  let count = 0;
  const iv = setInterval(() => {
    current += step;
    bar.style.width = current + '%';
    if (++count >= 20) clearInterval(iv);
  }, 15);
}

// ── Compass Rendering ────────────────────────────────

function buildCompass() {
  const clusterEl = document.getElementById('cluster-cards');
  clusterEl.innerHTML = '';
  CLUSTER_PROFILES.forEach((cp, idx) => {
    const count = bots.filter(b => b.clusterIdx === idx).length;
    const card = document.createElement('div');
    card.className = 'legend-card' + (userNode && userNode.clusterIdx === idx ? ' active' : '');
    card.innerHTML = `
      <div class="legend-name">
        <span class="legend-dot" style="background:${cp.color}"></span>
        ${cp.name}
      </div>
      <div class="legend-desc">${cp.desc}</div>
      <div class="legend-count">${count + (userNode && userNode.clusterIdx === idx ? 1 : 0)} nodes</div>
    `;
    clusterEl.appendChild(card);
  });

  if (userNode) {
    const uc = CLUSTER_PROFILES[userNode.clusterIdx];
    const badge = document.getElementById('user-cluster-badge');
    badge.textContent = 'CLUSTER: ' + uc.name;
    badge.style.borderColor = uc.color;
    badge.style.color = uc.color;
  }

  buildMatchList();
  requestAnimationFrame(() => drawCanvas());
  window.addEventListener('resize', drawCanvas);
}

function buildMatchList() {
  const matchEl = document.getElementById('match-list');
  matchEl.innerHTML = '';
  if (!userNode) return;

  getTopMatches(bots, userNode, 5).forEach(({ bot, sim }) => {
    const cp = CLUSTER_PROFILES[bot.clusterIdx];
    const card = document.createElement('div');
    card.className = 'match-card';
    card.innerHTML = `
      <div class="match-avatar" style="background:${cp.color}">
        ${bot.name.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div class="match-name">${bot.name}</div>
        <div class="match-sim">Similarity: <span>${Math.round(sim * 100)}%</span> · ${cp.name}</div>
      </div>
    `;
    matchEl.appendChild(card);
  });
}

function drawCanvas() {
  const wrap = document.getElementById('compass-wrap');
  const canvas = document.getElementById('compass-canvas');
  const size = Math.min(wrap.clientWidth - 80, wrap.clientHeight - 80, 560);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2, r = size / 2 - 20;

  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, size, size);

  // Grid rings
  [0.25, 0.5, 0.75, 1.0].forEach(pct => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * pct, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

  // Diagonal guides
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy - r * 0.7); ctx.lineTo(cx + r * 0.7, cy + r * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + r * 0.7, cy - r * 0.7); ctx.lineTo(cx - r * 0.7, cy + r * 0.7); ctx.stroke();

  // Quadrant labels
  const labels = [
    { text: 'INTUITIVE\nDEPTH', x: cx - r * 0.55, y: cy - r * 0.7, color: '#1a8cff' },
    { text: 'KINETIC\nEDGE', x: cx + r * 0.6, y: cy - r * 0.7, color: '#ff3d6e' },
    { text: 'GROUNDED\nSTRUCTURE', x: cx - r * 0.55, y: cy + r * 0.75, color: '#c8f53e' },
    { text: 'AMBIENT\nFLOW', x: cx + r * 0.6, y: cy + r * 0.75, color: '#ff6b35' },
  ];
  labels.forEach(l => {
    ctx.font = '600 9px "Space Mono"';
    ctx.fillStyle = l.color + '55';
    ctx.textAlign = 'center';
    l.text.split('\n').forEach((line, i) => ctx.fillText(line, l.x, l.y + i * 13));
  });

  // Axis labels
  [
    { text: 'STRUCTURE', x: cx - r - 4, y: cy + 4, align: 'right' },
    { text: 'KINETIC', x: cx + r + 4, y: cy + 4, align: 'left' },
    { text: 'DEPTH', x: cx, y: cy - r - 6, align: 'center' },
    { text: 'AMBIENT', x: cx, y: cy + r + 14, align: 'center' },
  ].forEach(al => {
    ctx.font = '9px "Space Mono"';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = al.align;
    ctx.fillText(al.text, al.x, al.y);
  });

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bot dots
  bots.forEach(node => {
    const px = cx + node.x * r;
    const py = cy + node.y * r;
    const cp = CLUSTER_PROFILES[node.clusterIdx];
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = cp.color + 'bb';
    ctx.fill();
  });

  // User node
  if (userNode) {
    const px = cx + userNode.x * r;
    const py = cy + userNode.y * r;
    const cp = CLUSTER_PROFILES[userNode.clusterIdx];

    // Glow
    const grd = ctx.createRadialGradient(px, py, 0, px, py, 20);
    grd.addColorStop(0, cp.color + '44');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Match lines
    getTopMatches(bots, userNode, 5).forEach(({ bot, sim }) => {
      const bpx = cx + bot.x * r;
      const bpy = cy + bot.y * r;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bpx, bpy);
      ctx.strokeStyle = cp.color + Math.round(sim * 60).toString(16).padStart(2, '0');
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // User dot
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = cp.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.strokeStyle = cp.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 10px "Syne"';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px, py - 16);
  }

  // Tick marks
  for (let deg = 0; deg < 360; deg += 5) {
    const angle = (deg * Math.PI) / 180;
    const isMain = deg % 90 === 0;
    const isMid = deg % 45 === 0;
    const len = isMain ? 12 : isMid ? 8 : 4;
    const x1 = cx + (r - 1) * Math.cos(angle);
    const y1 = cy + (r - 1) * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(cx + (r - len) * Math.cos(angle), cy + (r - len) * Math.sin(angle));
    ctx.strokeStyle = isMain ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = isMain ? 1.5 : 0.5;
    ctx.stroke();
  }

  // Tooltip on hover
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const tooltip = document.getElementById('tooltip');
    let found = null;
    [...bots, ...(userNode ? [userNode] : [])].forEach(node => {
      const px = cx + node.x * r;
      const py = cy + node.y * r;
      if (Math.sqrt((mx - px) ** 2 + (my - py) ** 2) < 10) found = node;
    });
    if (found) {
      const cp = CLUSTER_PROFILES[found.clusterIdx];
      document.getElementById('tt-name').textContent = found.name + (found.isUser ? ' ★' : '');
      document.getElementById('tt-name').style.color = cp.color;
      document.getElementById('tt-cluster').textContent = cp.name;
      if (!found.isUser && userNode) {
        const sim = Math.round(cosineSimilarity(found.features, userNode.features) * 100);
        document.getElementById('tt-sim').textContent = `Similarity to you: ${sim}%`;
      } else {
        document.getElementById('tt-sim').textContent = '';
      }
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('show');
    } else {
      tooltip.classList.remove('show');
    }
  };
  canvas.onmouseleave = () => document.getElementById('tooltip').classList.remove('show');
}

// ── Keyboard ─────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  const screen = document.querySelector('.screen.active');
  if (!screen || screen.id !== 'screen-question') return;
  const keys = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
  if (e.key in keys) {
    const opts = document.querySelectorAll('.q-option:not(.timeout)');
    if (opts[keys[e.key]]) selectOption(opts[keys[e.key]], parseInt(opts[keys[e.key]].dataset.dim));
  }
  if (e.key === 'Enter') timeoutQuestion();
});

// Mouse parallax
document.addEventListener('mousemove', (e) => {
  const pct = document.getElementById('q-bg-pulse');
  if (pct) {
    pct.style.setProperty('--mx', (e.clientX / window.innerWidth * 100) + '%');
    pct.style.setProperty('--my', (e.clientY / window.innerHeight * 100) + '%');
  }
});
