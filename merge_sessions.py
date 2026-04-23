#!/usr/bin/env python3
"""
merge_sessions.py — PsychoCompass historical position merger

Sources (can combine both):
  1. Supabase  — sign in with your account to fetch cloud sessions
  2. Local JSON — export your device sessions from the app sidebar

Merge logic:
  - Pool every raw answer from every session
  - Apply recency weighting (recent sessions count more)
  - Recompute feature vector → x/y/cluster from the combined pool
  - If only feature vectors are available (no raw answers), average them

Usage:
  python3 merge_sessions.py
  python3 merge_sessions.py --local sessions_export.json
  python3 merge_sessions.py --local sessions_export.json --no-auth
"""

import json
import math
import sys
import urllib.request
import urllib.parse
import urllib.error
import getpass
from datetime import datetime, timezone

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = 'https://hjbywpwlfxrwfhngtxek.supabase.co'
SUPABASE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYnl3cHdsZnhyd2Zobmd0eGVrIiwicm9sZSI6'
    'ImFub24iLCJpYXQiOjE3NzY4ODc4NTcsImV4cCI6MjA5MjQ2Mzg1N30'
    '.kQPDRub7BubOP1Trlq8NlExAZAIi19mBgvjRgpdcNk8'
)
QUESTIONS_PER_SESSION = 20

CLUSTER_PROFILES = [
    {'id': 0, 'name': 'INTUITIVE DEPTH',    'color': '#1a8cff', 'bias': [0.10, 0.50, 0.20, 0.20]},
    {'id': 1, 'name': 'KINETIC EDGE',       'color': '#ff3d6e', 'bias': [0.15, 0.15, 0.55, 0.15]},
    {'id': 2, 'name': 'GROUNDED STRUCTURE', 'color': '#c8f53e', 'bias': [0.50, 0.20, 0.15, 0.15]},
    {'id': 3, 'name': 'AMBIENT FLOW',       'color': '#ff6b35', 'bias': [0.15, 0.15, 0.15, 0.55]},
]
DIM_LABELS = ['Structure (dim 0)', 'Depth     (dim 1)', 'Kinetic   (dim 2)', 'Ambient   (dim 3)']

# ── Supabase helpers ─────────────────────────────────────────────────────────

def _request(url, *, method='GET', data=None, headers=None):
    h = {'apikey': SUPABASE_KEY, 'Content-Type': 'application/json'}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code}: {body}") from e


def sign_in(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    payload = json.dumps({'email': email, 'password': password}).encode()
    data = _request(url, method='POST', data=payload)
    return data.get('access_token')


def fetch_sessions(access_token):
    params = urllib.parse.urlencode({
        'select': 'id,created_at,answers,features,cluster_idx,x,y,player_name,archetype',
        'order':  'created_at.asc',
        'limit':  '200',
    })
    url = f"{SUPABASE_URL}/rest/v1/sessions?{params}"
    return _request(url, headers={'Authorization': f'Bearer {access_token}'})


def push_merged_session(access_token, merged):
    """Optionally write the merged result back as a new session row."""
    url = f"{SUPABASE_URL}/rest/v1/sessions"
    payload = json.dumps({
        'answers':     [],           # synthetic — no raw answers for a merged session
        'features':    merged['features'],
        'cluster_idx': merged['cluster_idx'],
        'archetype':   merged['cluster_name'],
        'x':           merged['x'],
        'y':           merged['y'],
        'player_name': 'MERGED',
    }).encode()
    h = {
        'Authorization': f'Bearer {access_token}',
        'Prefer': 'return=minimal',
    }
    _request(url, method='POST', data=payload, headers=h)

# ── Core computation ─────────────────────────────────────────────────────────

def recency_weights(n, decay=0.80):
    """Oldest session gets weight decay^(n-1), newest gets 1.0."""
    return [decay ** (n - 1 - i) for i in range(n)]


def compute_from_answers(all_answers, weights=None):
    """
    Pool all raw answers (list of lists of ints 0-3, -1=timeout).
    Returns feature vector, x, y, cluster.
    """
    counts = [0.0, 0.0, 0.0, 0.0]
    total  = 0.0
    for i, answers in enumerate(all_answers):
        w = weights[i] if weights else 1.0
        for a in answers:
            if 0 <= a <= 3:
                counts[a] += w
                total      += w
    features = [c / total for c in counts] if total else [0.25] * 4
    return _position_from_features(features)


def compute_from_features(all_features, weights=None):
    """
    Weighted average of pre-computed feature vectors.
    Used when raw answers are unavailable (localStorage export).
    """
    total = sum(weights) if weights else len(all_features)
    merged = [0.0, 0.0, 0.0, 0.0]
    for i, fv in enumerate(all_features):
        w = weights[i] if weights else 1.0
        for j in range(4):
            merged[j] += fv[j] * w
    features = [v / total for v in merged]
    return _position_from_features(features)


def _position_from_features(features):
    x = max(-0.9, min(0.9, features[2] - features[0]))   # Kinetic − Structure
    y = max(-0.9, min(0.9, features[1] - features[3]))   # Depth   − Ambient

    best_cluster, best_dist = 0, float('inf')
    for cp in CLUSTER_PROFILES:
        dist = sum((f - b) ** 2 for f, b in zip(features, cp['bias']))
        if dist < best_dist:
            best_dist    = dist
            best_cluster = cp['id']

    return {
        'features':     features,
        'x':            x,
        'y':            y,
        'cluster_idx':  best_cluster,
        'cluster_name': CLUSTER_PROFILES[best_cluster]['name'],
    }

# ── Display ──────────────────────────────────────────────────────────────────

def fmt_date(iso):
    try:
        dt = datetime.fromisoformat(iso.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M')
    except Exception:
        return iso[:16]


def print_session_table(sessions, label=''):
    if label:
        print(f'\n{label}')
    print('─' * 72)
    for i, s in enumerate(sessions):
        name    = (s.get('player_name') or 'Anonymous')[:16]
        cluster = s.get('archetype') or f"Cluster {s.get('cluster_idx', '?')}"
        date    = fmt_date(s.get('created_at', ''))
        has_ans = '✓' if s.get('answers') else '·'
        fv = s.get('features') or []
        fstr = ('  '.join(f'{v:.2f}' for v in fv)) if fv else '—'
        print(f"  {i+1:3}. [{date}]  {has_ans}  {name:<16}  {cluster:<22}  [{fstr}]")
    print('─' * 72)
    print(f'  {has_ans} = has raw answers | · = feature-vector only\n')


def print_result(result, label='MERGED POSITION'):
    f  = result['features']
    cp = CLUSTER_PROFILES[result['cluster_idx']]
    bar_width = 28
    print(f'\n{"═"*52}')
    print(f'  {label}')
    print(f'{"═"*52}')
    print(f'  Cluster : {cp["name"]}')
    print(f'  Position: x = {result["x"]:+.4f}   y = {result["y"]:+.4f}')
    print(f'\n  Feature breakdown:')
    for j, (label_d, val) in enumerate(zip(DIM_LABELS, f)):
        bar = '█' * round(val * bar_width)
        print(f'    {label_d}: {val:.3f}  {bar}')
    print()

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    args  = sys.argv[1:]
    no_auth     = '--no-auth'     in args
    local_file  = None
    save_back   = '--save'        in args

    if '--local' in args:
        idx = args.index('--local')
        if idx + 1 < len(args):
            local_file = args[idx + 1]
        else:
            print('--local requires a file path argument'); sys.exit(1)

    print('\n◈  PsychoCompass — Session Merge Tool')
    print('   Pools all your answers → computes composite position\n')

    all_sessions = []

    # ── 1. Load local file ────────────────────────────────────────────────
    if local_file:
        try:
            with open(local_file) as fh:
                local_data = json.load(fh)
            if isinstance(local_data, list):
                for s in local_data:
                    s.setdefault('source', 'local')
                all_sessions.extend(local_data)
                print(f'  Loaded {len(local_data)} session(s) from {local_file}')
            else:
                print(f'  Warning: {local_file} is not a JSON array — skipping')
        except FileNotFoundError:
            print(f'  File not found: {local_file}'); sys.exit(1)
        except json.JSONDecodeError as e:
            print(f'  Invalid JSON in {local_file}: {e}'); sys.exit(1)

    # ── 2. Fetch from Supabase ────────────────────────────────────────────
    access_token = None
    if not no_auth:
        print('  Supabase auth (press Enter to skip):')
        email = input('    Email   : ').strip()
        if email:
            password = getpass.getpass('    Password: ')
            try:
                access_token = sign_in(email, password)
                print('    ✓ Signed in')
            except RuntimeError as e:
                print(f'    ✗ Auth failed: {e}')

        if access_token:
            try:
                cloud = fetch_sessions(access_token)
                for s in cloud:
                    s.setdefault('source', 'supabase')
                all_sessions.extend(cloud)
                print(f'  Loaded {len(cloud)} session(s) from Supabase')
            except RuntimeError as e:
                print(f'  Could not fetch sessions: {e}')

    if not all_sessions:
        print('\n  No sessions found. Provide --local <file> or sign in to Supabase.')
        sys.exit(0)

    # Sort oldest → newest
    all_sessions.sort(key=lambda s: s.get('created_at', ''))
    print_session_table(all_sessions, label=f'  All sessions ({len(all_sessions)} total):')

    n       = len(all_sessions)
    weights = recency_weights(n)

    # ── 3. Separate sessions with raw answers from those without ──────────
    sessions_with_answers  = [s for s in all_sessions if s.get('answers')]
    sessions_features_only = [s for s in all_sessions if not s.get('answers') and s.get('features')]

    if sessions_with_answers:
        # Primary: pool all raw answers with recency weight
        ans_weights = [weights[all_sessions.index(s)] for s in sessions_with_answers]
        merged = compute_from_answers(
            [s['answers'] for s in sessions_with_answers],
            weights=ans_weights
        )
        strategy = f'pooled raw answers ({len(sessions_with_answers)} sessions)'

        # Also blend in feature-vector-only sessions if any
        if sessions_features_only:
            fv_weights = [weights[all_sessions.index(s)] for s in sessions_features_only]
            fv_merged  = compute_from_features(
                [s['features'] for s in sessions_features_only],
                weights=fv_weights
            )
            # Weighted blend: scale by total answer count vs total session count
            w_ans = sum(ans_weights)
            w_fv  = sum(fv_weights)
            total = w_ans + w_fv
            blended = [(merged['features'][j] * w_ans + fv_merged['features'][j] * w_fv) / total
                       for j in range(4)]
            merged   = _position_from_features(blended)
            strategy = (f'pooled raw answers ({len(sessions_with_answers)} sessions) '
                        f'+ blended features ({len(sessions_features_only)} sessions)')
    elif sessions_features_only:
        fv_weights = [weights[all_sessions.index(s)] for s in sessions_features_only]
        merged   = compute_from_features(
            [s['features'] for s in sessions_features_only],
            weights=fv_weights
        )
        strategy = f'averaged feature vectors ({len(sessions_features_only)} sessions)'
    else:
        print('  No usable data in the sessions (missing both answers and features).')
        sys.exit(1)

    print(f'  Strategy : {strategy}')
    print(f'  Recency  : most recent session weight = 1.0, oldest = {weights[0]:.3f}')

    print_result(merged)

    # ── 4. Compare against individual sessions ────────────────────────────
    if n > 1:
        print('  Per-session positions (for comparison):')
        print(f'  {"#":>3}  {"Cluster":<22}  {"x":>7}  {"y":>7}')
        print(f'  {"─"*3}  {"─"*22}  {"─"*7}  {"─"*7}')
        for i, s in enumerate(all_sessions):
            if s.get('answers'):
                pos = compute_from_answers([s['answers']])
            elif s.get('features'):
                pos = _position_from_features(s['features'])
            else:
                continue
            marker = ' ←' if i == n - 1 else ''
            print(f'  {i+1:3}  {pos["cluster_name"]:<22}  {pos["x"]:+.4f}  {pos["y"]:+.4f}{marker}')
        print(f'\n  ← = most recent session')
        print(f'  MERGED = composite of all {n} sessions\n')

    # ── 5. Save output ────────────────────────────────────────────────────
    output = {
        'merged_at':        datetime.now(timezone.utc).isoformat(),
        'sessions_merged':  n,
        'strategy':         strategy,
        'result':           merged,
    }
    out_path = 'psycho-compass-merged.json'
    with open(out_path, 'w') as fh:
        json.dump(output, fh, indent=2)
    print(f'  Result saved → {out_path}')

    if save_back and access_token:
        try:
            push_merged_session(access_token, merged)
            print('  Merged session written back to Supabase ✓')
        except RuntimeError as e:
            print(f'  Could not write back to Supabase: {e}')

    print()


if __name__ == '__main__':
    main()
