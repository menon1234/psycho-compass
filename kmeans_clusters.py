#!/usr/bin/env python3
"""
kmeans_clusters.py — PsychoCompass K-means re-clustering

Fetches all session feature vectors from Supabase, runs K-means (k=4),
and outputs data-driven cluster centroids that you can paste back into
the HTML to replace the hardcoded bias vectors.

Auth options (in order of what data you get):
  SERVICE_ROLE_KEY  →  reads every session in the DB (full dataset)
  email + password  →  reads only your own sessions
  --local file.json →  reads an exported local JSON file

The service role key is secret — never put it in the HTML.
Store it in an env var or just paste it when prompted.

Usage:
  python3 kmeans_clusters.py
  python3 kmeans_clusters.py --k 4 --runs 20
  python3 kmeans_clusters.py --local sessions.json --no-auth
  SUPABASE_SERVICE_KEY=<key> python3 kmeans_clusters.py
"""

import json
import math
import os
import sys
import random
import urllib.request
import urllib.parse
import urllib.error
import getpass
from datetime import datetime, timezone

# ── Config ───────────────────────────────────────────────────────────────────

SUPABASE_URL = 'https://hjbywpwlfxrwfhngtxek.supabase.co'
SUPABASE_ANON_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYnl3cHdsZnhyd2Zobmd0eGVrIiwicm9sZSI6'
    'ImFub24iLCJpYXQiOjE3NzY4ODc4NTcsImV4cCI6MjA5MjQ2Mzg1N30'
    '.kQPDRub7BubOP1Trlq8NlExAZAIi19mBgvjRgpdcNk8'
)

DIMS = 4
DIM_NAMES = ['Structure', 'Depth', 'Kinetic', 'Ambient']

# ── HTTP helpers ─────────────────────────────────────────────────────────────

def _request(url, *, method='GET', data=None, api_key=None, access_token=None):
    headers = {
        'apikey':       api_key or SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
    }
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    elif api_key:
        headers['Authorization'] = f'Bearer {api_key}'

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}") from e


def sign_in(email, password):
    url  = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    data = json.dumps({'email': email, 'password': password}).encode()
    resp = _request(url, method='POST', data=data)
    return resp.get('access_token')


def fetch_all_sessions(*, service_key=None, access_token=None, page_size=1000):
    """
    Fetch sessions with features.
    service_key bypasses RLS → gets all rows.
    access_token → gets only that user's rows.
    """
    sessions = []
    offset   = 0
    while True:
        params = urllib.parse.urlencode({
            'select': 'id,created_at,answers,features,cluster_idx,player_name,archetype',
            'not.features': 'is.null',
            'order':  'created_at.asc',
            'limit':  str(page_size),
            'offset': str(offset),
        })
        url = f"{SUPABASE_URL}/rest/v1/sessions?{params}"
        batch = _request(
            url,
            api_key=service_key or SUPABASE_ANON_KEY,
            access_token=access_token,
        )
        sessions.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return sessions

# ── Pure-Python K-means++ ─────────────────────────────────────────────────────

def euclidean(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def kmeans_plus_plus_init(points, k, rng):
    """K-means++ centroid initialisation for better convergence."""
    centroids = [rng.choice(points)]
    for _ in range(k - 1):
        dists = [min(euclidean(p, c) ** 2 for c in centroids) for p in points]
        total = sum(dists)
        probs = [d / total for d in dists]
        # weighted random pick
        r = rng.random()
        cumulative = 0.0
        for p, prob in zip(points, probs):
            cumulative += prob
            if r <= cumulative:
                centroids.append(p)
                break
        else:
            centroids.append(points[-1])
    return centroids


def kmeans(points, k, max_iter=300, n_runs=10, seed=42):
    """
    Run K-means n_runs times, return the result with lowest inertia.
    Returns: labels (list[int]), centroids (list[list[float]]), inertia (float)
    """
    best = None
    rng  = random.Random(seed)

    for run in range(n_runs):
        centroids = kmeans_plus_plus_init(points, k, rng)

        for iteration in range(max_iter):
            # Assignment step
            labels = [
                min(range(k), key=lambda j, p=p: euclidean(p, centroids[j]))
                for p in points
            ]

            # Update step
            new_centroids = []
            for j in range(k):
                cluster_pts = [points[i] for i, l in enumerate(labels) if l == j]
                if cluster_pts:
                    new_centroids.append([
                        sum(p[d] for p in cluster_pts) / len(cluster_pts)
                        for d in range(DIMS)
                    ])
                else:
                    # Empty cluster — reinitialise to a random point
                    new_centroids.append(rng.choice(points)[:])

            if new_centroids == centroids:
                break
            centroids = new_centroids

        inertia = sum(
            euclidean(points[i], centroids[labels[i]]) ** 2
            for i in range(len(points))
        )

        if best is None or inertia < best['inertia']:
            best = {'labels': labels, 'centroids': centroids, 'inertia': inertia,
                    'iterations': iteration + 1, 'run': run + 1}

    return best['labels'], best['centroids'], best['inertia'], best


def silhouette_score(points, labels, k):
    """Simplified average silhouette coefficient."""
    scores = []
    for i, p in enumerate(points):
        own = labels[i]
        same    = [points[j] for j, l in enumerate(labels) if l == own and j != i]
        a = sum(euclidean(p, q) for q in same) / len(same) if same else 0.0

        b_vals = []
        for j in range(k):
            if j == own:
                continue
            others = [points[m] for m, l in enumerate(labels) if l == j]
            if others:
                b_vals.append(sum(euclidean(p, q) for q in others) / len(others))
        b = min(b_vals) if b_vals else 0.0

        s = (b - a) / max(a, b) if max(a, b) > 0 else 0.0
        scores.append(s)
    return sum(scores) / len(scores) if scores else 0.0

# ── Feature extraction ────────────────────────────────────────────────────────

def features_from_session(s):
    """
    Prefer raw answers (most accurate); fall back to stored feature vector.
    Returns a list of 4 floats summing to ~1.0, or None if unusable.
    """
    if s.get('answers'):
        answers = s['answers']
        counts  = [0.0] * DIMS
        total   = 0
        for a in answers:
            if 0 <= a < DIMS:
                counts[a] += 1
                total      += 1
        if total:
            return [c / total for c in counts]

    if s.get('features') and len(s['features']) == DIMS:
        return list(s['features'])

    return None

# ── Output helpers ────────────────────────────────────────────────────────────

BAR = 30

def bar(val):
    filled = round(val * BAR)
    return '█' * filled + '░' * (BAR - filled)


def cluster_summary(idx, centroid, members, cluster_name=''):
    label = cluster_name or f'Cluster {idx}'
    print(f'\n  [{idx}] {label}  ({len(members)} sessions)')
    for d, name in enumerate(DIM_NAMES):
        v = centroid[d]
        print(f'    {name:<10} {v:.3f}  {bar(v)}')
    x = max(-0.9, min(0.9, centroid[2] - centroid[0]))
    y = max(-0.9, min(0.9, centroid[1] - centroid[3]))
    print(f'    → compass position  x={x:+.3f}  y={y:+.3f}')


def dominant_dim(centroid):
    m = max(range(DIMS), key=lambda i: centroid[i])
    return DIM_NAMES[m]


def js_bias_block(centroids, names):
    """Print JavaScript you can paste into the HTML to replace bias vectors."""
    lines = ['const CLUSTER_PROFILES = [']
    colors = ['#1a8cff', '#ff3d6e', '#c8f53e', '#ff6b35']
    for i, (c, name, color) in enumerate(zip(centroids, names, colors)):
        bias = '[' + ', '.join(f'{v:.4f}' for v in c) + ']'
        comma = ',' if i < len(centroids) - 1 else ''
        lines.append(f'  {{ id: {i}, name: {json.dumps(name)}, color: {json.dumps(color)},')
        lines.append(f'    desc: "",')
        lines.append(f'    bias: {bias} }}{comma}')
    lines.append('];')
    return '\n'.join(lines)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args    = sys.argv[1:]
    no_auth = '--no-auth' in args
    k       = 4
    n_runs  = 10
    local_file = None

    if '--k' in args:
        k = int(args[args.index('--k') + 1])
    if '--runs' in args:
        n_runs = int(args[args.index('--runs') + 1])
    if '--local' in args:
        idx = args.index('--local')
        local_file = args[idx + 1] if idx + 1 < len(args) else None

    print('\n◈  PsychoCompass — K-means Re-clustering')
    print(f'   k={k}  runs={n_runs}\n')

    raw_sessions = []

    # ── Load local file ───────────────────────────────────────────────────
    if local_file:
        try:
            with open(local_file) as fh:
                data = json.load(fh)
            raw_sessions.extend(data if isinstance(data, list) else [])
            print(f'  Loaded {len(raw_sessions)} session(s) from {local_file}')
        except Exception as e:
            print(f'  Could not load {local_file}: {e}'); sys.exit(1)

    # ── Connect to Supabase ───────────────────────────────────────────────
    if not no_auth:
        # 1. Try service role key first (reads all data)
        service_key = os.environ.get('SUPABASE_SERVICE_KEY') or ''
        if not service_key:
            print('  Service role key gives access to ALL sessions (best for clustering).')
            print('  Find it: Supabase dashboard → Project Settings → API → service_role key')
            service_key = getpass.getpass('  Service role key (Enter to skip): ').strip()

        access_token = None
        if service_key:
            try:
                sessions = fetch_all_sessions(service_key=service_key)
                raw_sessions.extend(sessions)
                print(f'  Fetched {len(sessions)} session(s) via service key')
            except RuntimeError as e:
                print(f'  Service key fetch failed: {e}')
                service_key = ''

        # 2. Fall back to user auth (reads only own sessions)
        if not service_key:
            print('\n  Falling back to user auth (your sessions only):')
            email = input('  Email (Enter to skip): ').strip()
            if email:
                password = getpass.getpass('  Password: ')
                try:
                    access_token = sign_in(email, password)
                    sessions     = fetch_all_sessions(access_token=access_token)
                    raw_sessions.extend(sessions)
                    print(f'  Fetched {len(sessions)} session(s) for {email}')
                except RuntimeError as e:
                    print(f'  Auth failed: {e}')

    # ── Extract feature vectors ───────────────────────────────────────────
    records = []
    for s in raw_sessions:
        fv = features_from_session(s)
        if fv:
            records.append({'session': s, 'features': fv})

    # Deduplicate by session id if present
    seen = set()
    unique = []
    for r in records:
        sid = r['session'].get('id', id(r))
        if sid not in seen:
            seen.add(sid)
            unique.append(r)
    records = unique

    print(f'\n  Usable feature vectors: {len(records)}')

    if len(records) < k:
        print(f'  Need at least {k} sessions to form {k} clusters. Only have {len(records)}.')
        sys.exit(0)

    points = [r['features'] for r in records]

    # ── Run K-means ───────────────────────────────────────────────────────
    print(f'  Running K-means (k={k}, {n_runs} restarts)...')
    labels, centroids, inertia, meta = kmeans(points, k, n_runs=n_runs)
    sil = silhouette_score(points, labels, k)

    print(f'  Converged in run {meta["run"]}, {meta["iterations"]} iterations')
    print(f'  Inertia:   {inertia:.4f}')
    print(f'  Silhouette score: {sil:.4f}  (−1 bad → +1 perfect)\n')

    # ── Sort clusters by dominant dimension for consistent labelling ──────
    order = sorted(range(k), key=lambda i: centroids[i].index(max(centroids[i])))
    sorted_centroids = [centroids[i] for i in order]
    sorted_labels    = [order.index(l) for l in labels]

    # Auto-name by dominant dimension
    auto_names = []
    for c in sorted_centroids:
        dom   = dominant_dim(c)
        sub   = DIM_NAMES[sorted(range(DIMS), key=lambda i: c[i])[-2]]
        auto_names.append(f'{dom.upper()} / {sub.upper()}')

    # Group records by cluster
    clusters = [[] for _ in range(k)]
    for i, r in enumerate(records):
        clusters[sorted_labels[i]].append(r)

    # ── Print results ─────────────────────────────────────────────────────
    print('═' * 60)
    print('  CLUSTER PROFILES (data-driven)')
    print('═' * 60)
    for i in range(k):
        cluster_summary(i, sorted_centroids[i], clusters[i], auto_names[i])

    # ── Elbow / K selection hint ──────────────────────────────────────────
    if len(records) >= 8 and '--elbow' in args:
        print('\n  Elbow analysis (inertia by k):')
        for test_k in range(2, min(8, len(records)) + 1):
            _, _, test_inertia, _ = kmeans(points, test_k, n_runs=5)
            print(f'    k={test_k}  inertia={test_inertia:.4f}')

    # ── Per-session assignments ───────────────────────────────────────────
    print('\n' + '─' * 60)
    print('  SESSION ASSIGNMENTS')
    print('─' * 60)
    for i, r in enumerate(records):
        s      = r['session']
        ci     = sorted_labels[i]
        name   = (s.get('player_name') or 'Anon')[:14]
        dt     = s.get('created_at', '')[:10]
        source = 'raw' if s.get('answers') else 'fv'
        fv     = r['features']
        print(f"  {dt}  {name:<14}  → [{ci}] {auto_names[ci]:<28}  "
              f"[{', '.join(f'{v:.2f}' for v in fv)}]  ({source})")

    # ── JavaScript output ─────────────────────────────────────────────────
    print('\n' + '═' * 60)
    print('  PASTE INTO psycho-compass.html (replaces CLUSTER_PROFILES)')
    print('═' * 60)
    print()
    print(js_bias_block(sorted_centroids, auto_names))
    print()

    # ── Save JSON output ──────────────────────────────────────────────────
    output = {
        'computed_at':   datetime.now(timezone.utc).isoformat(),
        'n_sessions':    len(records),
        'k':             k,
        'n_runs':        n_runs,
        'inertia':       inertia,
        'silhouette':    sil,
        'clusters': [
            {
                'id':       i,
                'name':     auto_names[i],
                'centroid': sorted_centroids[i],
                'size':     len(clusters[i]),
                'x':        max(-0.9, min(0.9, sorted_centroids[i][2] - sorted_centroids[i][0])),
                'y':        max(-0.9, min(0.9, sorted_centroids[i][1] - sorted_centroids[i][3])),
            }
            for i in range(k)
        ],
        'assignments': [
            {
                'session_id':  r['session'].get('id'),
                'player_name': r['session'].get('player_name'),
                'created_at':  r['session'].get('created_at'),
                'cluster':     sorted_labels[i],
                'features':    r['features'],
            }
            for i, r in enumerate(records)
        ],
    }

    out_path = 'psycho-compass-clusters.json'
    with open(out_path, 'w') as fh:
        json.dump(output, fh, indent=2)
    print(f'  Full results saved → {out_path}\n')


if __name__ == '__main__':
    main()
