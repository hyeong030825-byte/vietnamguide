# Makes the city map's outlines (VMAP in src/page.html) from Natural Earth (public domain).
# Usage: python3 tools/make_map.py /path/to/natural-earth-vector/geojson > map.json
#   (a sparse clone of github.com/nvkelso/natural-earth-vector with ne_10m_ and ne_50m_admin_0_countries.geojson)
# Vietnam comes from the 10m file, its neighbours from 50m; rings are clipped to the frame and simplified.
# The frame stops at 111.0°E: only the mainland coast and the islands near it are drawn.
import json, math, sys
NE = (sys.argv[1].rstrip('/') + '/') if len(sys.argv) > 1 else 'geojson/'
LON0, LON1, LAT0, LAT1 = 100.0, 111.0, 8.2, 23.6
K = 40.0; CX = math.cos(math.radians(16))
W = round((LON1 - LON0) * CX * K); H = round((LAT1 - LAT0) * K)
def proj(lon, lat): return ((lon - LON0) * CX * K, (LAT1 - lat) * K)
M = 24
def clamp(p): return (min(max(p[0], -M), W + M), min(max(p[1], -M), H + M))
def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-9
        best, bi = 0, -1
        for i in range(a + 1, b):
            px, py = pts[i]; d = abs(dy * px - dx * py + bx * ay - by * ax) / L if L > 1e-9 else math.hypot(px - ax, py - ay)
            if d > best: best, bi = d, i
        if best > tol: keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]
def rings(geom):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    for poly in polys:
        for ring in poly[:1]:  # outer rings only; no lakes needed at this scale
            yield ring
def path_for(feats, tol, min_area):
    out = []
    for f in feats:
        for ring in rings(f['geometry']):
            lons = [p[0] for p in ring]; lats = [p[1] for p in ring]
            if max(lons) < LON0 - 1 or min(lons) > LON1 + 1 or max(lats) < LAT0 - 1 or min(lats) > LAT1 + 1: continue
            pts = [clamp(proj(*p)) for p in ring]
            area = abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2
            if area < min_area: continue
            pts = dp(pts, tol)
            if len(pts) < 3: continue
            out.append('M' + ' '.join('%.1f %.1f' % p for p in pts) + 'Z')
    return ''.join(out)
def load(fn, codes):
    d = json.load(open(NE + fn))
    return [f for f in d['features'] if f['properties'].get('ADM0_A3') in codes]
vn = load('ne_10m_admin_0_countries.geojson', {'VNM'})
nb = load('ne_50m_admin_0_countries.geojson', {'LAO', 'KHM', 'THA', 'CHN', 'MMR'})
vpath = path_for(vn, 0.45, 1.5)
npath = path_for(nb, 0.8, 4)
print(json.dumps({'w': W, 'h': H, 'vn': vpath, 'nb': npath, 'lon0': LON0, 'lat1': LAT1, 'k': K, 'cx': CX}))
sys.stderr.write('W %d H %d vn %d chars, nb %d chars\n' % (W, H, len(vpath), len(npath)))
