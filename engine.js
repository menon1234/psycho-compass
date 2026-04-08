// ══════════════════════════════════════════════════════
//  ENGINE: Question generation, bot simulation, clustering
// ══════════════════════════════════════════════════════

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQuestionPool() {
  const pool = [];

  // 50 color questions
  for (let i = 0; i < 50; i++) {
    const colorSet = shuffle([...COLORS]).slice(0, 4);
    const prompts = [
      'Which color feels closest to your mood right now?',
      "Pick the color you'd paint a room you think in.",
      "Which color would you want to disappear into?",
      'Choose the color that feels most foreign to you.',
      "Which color would you give to someone you trust?",
    ];
    pool.push({
      type: 'color',
      category: 'COLOR INSTINCT',
      text: prompts[i % prompts.length],
      options: colorSet.map(c => ({ icon: '', label: c.label, sub: '', swatchColor: c.hex, dim: c.dim }))
    });
  }

  // 50 shape questions
  for (let i = 0; i < 50; i++) {
    const shapeSet = shuffle([...SHAPES]).slice(0, 4);
    const prompts = [
      'Which shape would you trust to hold something precious?',
      'Pick the shape that best describes how you think.',
      'Which shape makes you feel safe?',
      "Choose the shape you'd put at the center of a room.",
      "Which shape would you trace in sand?",
    ];
    pool.push({
      type: 'shape',
      category: 'SHAPE PREFERENCE',
      text: prompts[i % prompts.length],
      options: shapeSet.map(s => ({ icon: s.icon, label: s.label, sub: s.desc, dim: s.dim }))
    });
  }

  // 40 frame questions
  for (let i = 0; i < 40; i++) {
    const frameSet = shuffle([...FRAME_TYPES]).slice(0, 4);
    const prompts = [
      "Pick the frame you'd put your most important memory in.",
      "Which frame feels most like your personal boundary?",
      'How would you contain something you love?',
    ];
    pool.push({
      type: 'frame',
      category: 'FRAME SELECTION',
      text: prompts[i % prompts.length],
      options: frameSet.map((f, fi) => ({ icon: '▪', label: f.label, sub: f.desc, dim: fi % 4 }))
    });
  }

  // Word sets: 100 questions
  for (let i = 0; i < 100; i++) {
    const ws = WORD_SETS[i % WORD_SETS.length];
    pool.push({
      type: 'choice', category: 'WORD RESONANCE', text: ws.q,
      options: ws.opts.map((o, i) => ({ icon: '', label: o[0], sub: o[1], dim: i % 4 }))
    });
  }

  // Scene sets: 80 questions
  for (let i = 0; i < 80; i++) {
    const ss = SCENE_SETS[i % SCENE_SETS.length];
    pool.push({
      type: 'choice', category: 'SCENE PERCEPTION', text: ss.q,
      options: ss.opts.map((o, j) => ({ icon: '', label: o[0], sub: o[1], dim: j % 4 }))
    });
  }

  // Sound sets: 80 questions
  for (let i = 0; i < 80; i++) {
    const ss = SOUND_SETS[i % SOUND_SETS.length];
    pool.push({
      type: 'choice', category: 'SOUND TEXTURE', text: ss.q,
      options: ss.opts.map((o, j) => ({ icon: '', label: o[0], sub: o[1], dim: j % 4 }))
    });
  }

  // Motion sets: 100 questions
  for (let i = 0; i < 100; i++) {
    const ms = MOTION_SETS[i % MOTION_SETS.length];
    pool.push({
      type: 'choice', category: 'MOTION QUALITY', text: ms.q,
      options: ms.opts.map((o, j) => ({ icon: '', label: o[0], sub: o[1], dim: j % 4 }))
    });
  }

  return shuffle(pool);
}

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function generateBots() {
  const bots = [];
  for (let i = 0; i < 200; i++) {
    const rng = seededRand(i * 137 + 42);
    const clusterIdx = Math.floor(i / 50);
    const cluster = CLUSTER_PROFILES[clusterIdx];
    const bias = [...cluster.bias];

    const noiseAmt = 0.15 + rng() * 0.2;
    const noiseDim = Math.floor(rng() * 4);
    bias[noiseDim] += noiseAmt;
    const total = bias.reduce((a, b) => a + b, 0);
    const normBias = bias.map(b => b / total);

    const answers = [];
    for (let q = 0; q < 500; q++) {
      const r = rng();
      let cum = 0, dim = 0;
      for (let d = 0; d < 4; d++) {
        cum += normBias[d];
        if (r < cum) { dim = d; break; }
      }
      answers.push(dim);
    }

    const counts = [0, 0, 0, 0];
    answers.forEach(a => counts[a]++);
    const total2 = counts.reduce((a, b) => a + b, 0);
    const features = counts.map(c => c / total2);

    const cx = (features[2] - features[0]);
    const cy = (features[1] - features[3]);
    const scatter = 0.15;
    const x = Math.max(-1, Math.min(1, cx + (rng() - 0.5) * scatter * 2));
    const y = Math.max(-1, Math.min(1, cy + (rng() - 0.5) * scatter * 2));

    bots.push({ id: i, name: BOT_NAMES[i] || `Bot${i}`, clusterIdx, features, x, y, answers });
  }
  return bots;
}

function computeUserPosition(sessionAnswers) {
  const counts = [0, 0, 0, 0];
  let validAnswers = 0;
  sessionAnswers.forEach(a => {
    if (a >= 0) { counts[a]++; validAnswers++; }
  });
  const features = validAnswers > 0
    ? counts.map(c => c / validAnswers)
    : [0.25, 0.25, 0.25, 0.25];

  const x = Math.max(-0.9, Math.min(0.9, features[2] - features[0]));
  const y = Math.max(-0.9, Math.min(0.9, features[1] - features[3]));

  let bestCluster = 0, bestDist = Infinity;
  CLUSTER_PROFILES.forEach((cp, idx) => {
    const dist = features.reduce((sum, f, i) => sum + Math.pow(f - cp.bias[i], 2), 0);
    if (dist < bestDist) { bestDist = dist; bestCluster = idx; }
  });

  return { id: 200, name: 'YOU', clusterIdx: bestCluster, x, y, features, isUser: true };
}

function cosineSimilarity(featA, featB) {
  const dot = featA.reduce((sum, f, i) => sum + f * featB[i], 0);
  const normA = Math.sqrt(featA.reduce((s, f) => s + f * f, 0));
  const normB = Math.sqrt(featB.reduce((s, f) => s + f * f, 0));
  return dot / (normA * normB);
}

function getTopMatches(bots, userNode, count = 5) {
  return bots
    .map(b => ({ bot: b, sim: cosineSimilarity(b.features, userNode.features) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, count);
}
