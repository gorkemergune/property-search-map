#!/usr/bin/env python3
"""
Rebuilds the bundled area data in src/data/geo/ from official sources.

    python3 scripts/build_geo.py

Standard library only. Downloads:
  1. ONS "Population estimates for the UK, England, Wales, Scotland and
     Northern Ireland: mid-2025" (table MYE5: population density for local
     authorities in the UK). Scotland's figures come from National Records of
     Scotland and Northern Ireland's from NISRA; ONS republishes all four.
  2. ONS Open Geography Portal "Local Authority Districts (May 2024) Boundaries
     UK BUC" (ultra generalised, clipped to the coastline). MYE5 uses the April
     2024 local authority boundaries, so this vintage joins 1:1 on LAD24CD.
  3. ONS Open Geography Portal "Wards (May 2024) Boundaries UK BGC" for the
     local authorities listed in WARD_LADS (generalised, clipped), matched to
     their local authority through the official "WD24_LAD24_UK_LU" lookup.

Joins use the official GSS codes only, never names. The script fails if any
local authority is missing on either side of the join.

Licence: Open Government Licence v3.0. Contains OS data © Crown copyright and
database right 2024; source: Office for National Statistics, National Records
of Scotland, Northern Ireland Statistics and Research Agency.
"""
import io, json, math, re, sys, urllib.parse, urllib.request, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'geo'

MYE_URL = ('https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/'
           'datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland/mid2025/mye25tablesuk.xlsx')
MYE_PAGE = ('https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/'
            'datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland')
ARCGIS = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services'
LAD_LAYER = 'Local_Authority_Districts_May_2024_Boundaries_UK_BUC'
WARD_LAYER = 'Wards_May_2024_Boundaries_UK_BGC'
WARD_LOOKUP = 'WD24_LAD24_UK_LU'

# Local authority rows in MYE5 (counties, regions and countries are skipped).
LAD_GEOGRAPHIES = {'Metropolitan District', 'Non-metropolitan District', 'London Borough', 'Unitary Authority',
                   'Council Area', 'Local Government District'}

# Wards are bundled for every local authority that holds a listing, plus all
# London boroughs so the London city view is complete. src/lib/areas.test.ts
# checks that every listing falls inside one of these wards.
WARD_LADS = {
    'E08000003': 'Manchester', 'E08000006': 'Salford', 'E08000025': 'Birmingham', 'E06000023': 'Bristol, City of',
    'S12000036': 'City of Edinburgh', 'E08000035': 'Leeds', 'E08000012': 'Liverpool', 'E08000021': 'Newcastle upon Tyne',
    'E06000018': 'Nottingham', 'E07000176': 'Rushcliffe', 'E07000172': 'Broxtowe', 'E07000173': 'Gedling',
    'E08000019': 'Sheffield', 'E06000043': 'Brighton and Hove', 'E07000178': 'Oxford', 'E07000008': 'Cambridge',
}
LONDON_PREFIX = 'E09'

UA = {'User-Agent': 'property-search-map build_geo.py'}


def get(url, data=None, timeout=300):
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=UA), timeout=timeout) as r:
        return r.read()


# --- xlsx (stdlib) ----------------------------------------------------------
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def xlsx_rows(blob, sheet):
    z = zipfile.ZipFile(io.BytesIO(blob))
    shared = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m']))
              for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheets = {s.get('name'): rels[s.get('{%s}id' % NS['r'])].lstrip('/') for s in ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets', NS)}
    path = sheets[sheet] if sheets[sheet].startswith('xl/') else 'xl/' + sheets[sheet]
    rows = []
    for row in ET.fromstring(z.read(path)).iter('{%s}row' % NS['m']):
        cells = {}
        for c in row.findall('m:c', NS):
            col = 0
            for ch in re.match(r'[A-Z]+', c.get('r')).group(0):
                col = col * 26 + ord(ch) - 64
            v = c.find('m:v', NS)
            if v is None:
                continue
            cells[col - 1] = shared[int(v.text)] if c.get('t') == 's' else float(v.text)
        rows.append([cells.get(i) for i in range(max(cells) + 1)] if cells else [])
    return rows


def population_density():
    rows = xlsx_rows(get(MYE_URL), 'MYE5')
    header = next(r for r in rows if r and r[0] == 'Code')
    col = {name: i for i, name in enumerate(header)}
    assert 'Estimated Population mid-2025' in col and '2025 people per sq. km' in col, header
    out = {}
    for r in rows[rows.index(header) + 1:]:
        if len(r) > 2 and r[2] in LAD_GEOGRAPHIES:
            out[r[0]] = {
                'name': r[1],
                'population': int(r[col['Estimated Population mid-2025']]),
                'areaKm2': round(r[col['Area (sq km)']], 1),
                'density': round(r[col['2025 people per sq. km']]),
            }
    return out


# --- geometry -----------------------------------------------------------------
def arcgis_query(layer, where, fields, fmt='geojson'):
    """All features matching `where`, paging past the service's record limit (POST: long IN lists)."""
    features, offset = [], 0
    while True:
        body = urllib.parse.urlencode({'where': where, 'outFields': fields, 'outSR': 4326, 'f': fmt,
                                       'returnGeometry': 'true' if fmt == 'geojson' else 'false',
                                       'orderByFields': fields.split(',')[0], 'resultOffset': offset, 'resultRecordCount': 1000}).encode()
        page = json.loads(get(f'{ARCGIS}/{layer}/FeatureServer/0/query', data=body))
        if 'error' in page:
            sys.exit(f'{layer}: {page["error"]}')
        features += page['features'] if fmt == 'geojson' else [f['attributes'] for f in page['features']]
        if not page.get('properties', {}).get('exceededTransferLimit') and not page.get('exceededTransferLimit'):
            return features
        offset += len(page['features'])


def simplify(ring, tol):
    """Douglas-Peucker on a closed ring (degrees)."""
    if len(ring) < 5:
        return ring
    keep = [False] * len(ring)
    keep[0] = keep[-1] = True
    stack = [(0, len(ring) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = ring[a], ring[b]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-12
        best, idx = 0, -1
        for i in range(a + 1, b):
            x, y = ring[i]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm if (dx or dy) else math.hypot(x - x1, y - y1)
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(ring, keep) if k]


def clean_geometry(geom, tol, digits, min_area):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    out = []
    for poly in polys:
        rings = []
        for i, ring in enumerate(poly):
            r = simplify(ring, tol)
            r = [[round(x, digits), round(y, digits)] for x, y in r]
            r = [p for j, p in enumerate(r) if j == 0 or p != r[j - 1]]
            area = abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(r, r[1:]))) / 2
            if len(r) >= 4 and (area >= min_area or i == 0 and not out):
                rings.append(r)
            elif i == 0:
                break
        if rings:
            out.append(rings)
    if not out:
        raise ValueError('geometry vanished during simplification')
    return {'type': 'Polygon', 'coordinates': out[0]} if len(out) == 1 else {'type': 'MultiPolygon', 'coordinates': out}


def main():
    density = population_density()
    print(f'MYE5: {len(density)} local authorities')

    lads = arcgis_query(LAD_LAYER, '1=1', 'LAD24CD,LAD24NM')
    codes = {f['properties']['LAD24CD'] for f in lads}
    missing_geo, missing_pop = sorted(set(density) - codes), sorted(codes - set(density))
    if missing_geo or missing_pop:
        sys.exit(f'join failed: no boundary for {missing_geo}, no population for {missing_pop}')

    lad_features = []
    for f in sorted(lads, key=lambda f: f['properties']['LAD24CD']):
        code = f['properties']['LAD24CD']
        d = density[code]
        lad_features.append({'type': 'Feature', 'properties': {'code': code, 'name': f['properties']['LAD24NM'], **{k: d[k] for k in ('population', 'areaKm2', 'density')}},
                             'geometry': clean_geometry(f['geometry'], 0.002, 3, 4e-6)})

    london = [f['properties']['LAD24CD'] for f in lads if f['properties']['LAD24CD'].startswith(LONDON_PREFIX)]
    ward_lads = sorted(set(WARD_LADS) | set(london))
    for code in WARD_LADS:
        if code not in codes:
            sys.exit(f'WARD_LADS has unknown code {code}')
    in_list = lambda xs: ','.join(f"'{x}'" for x in xs)
    lookup = {r['WD24CD']: r['LAD24CD'] for r in arcgis_query(WARD_LOOKUP, f'LAD24CD IN ({in_list(ward_lads)})', 'WD24CD,LAD24CD', fmt='json')}
    if set(lookup.values()) != set(ward_lads):
        sys.exit(f'lookup has no wards for {sorted(set(ward_lads) - set(lookup.values()))}')
    wards = arcgis_query(WARD_LAYER, f'WD24CD IN ({in_list(sorted(lookup))})', 'WD24CD,WD24NM')
    if {f['properties']['WD24CD'] for f in wards} != set(lookup):
        sys.exit(f'no boundary for wards {sorted(set(lookup) - {f["properties"]["WD24CD"] for f in wards})}')
    ward_features = [{'type': 'Feature', 'properties': {'code': f['properties']['WD24CD'], 'name': f['properties']['WD24NM'], 'lad': lookup[f['properties']['WD24CD']]},
                      'geometry': clean_geometry(f['geometry'], 0.0003, 4, 2e-8)}
                     for f in sorted(wards, key=lambda f: f['properties']['WD24CD'])]

    OUT.mkdir(parents=True, exist_ok=True)
    sources = {
        'population': {'title': 'Population estimates for the UK, England, Wales, Scotland and Northern Ireland: mid-2025, table MYE5',
                       'publisher': 'Office for National Statistics (with National Records of Scotland and NISRA)',
                       'year': 'mid-2025', 'published': '2026-10-01', 'url': MYE_PAGE},
        'lad': {'title': 'Local Authority Districts (May 2024) Boundaries UK BUC', 'publisher': 'ONS Open Geography Portal',
                'url': 'https://geoportal.statistics.gov.uk/'},
        'wards': {'title': 'Wards (May 2024) Boundaries UK BGC, with the WD24_LAD24_UK_LU lookup', 'publisher': 'ONS Open Geography Portal',
                  'url': 'https://geoportal.statistics.gov.uk/'},
        'licence': 'Open Government Licence v3.0. Contains OS data © Crown copyright and database right 2024.',
    }
    dump = lambda name, obj: (OUT / name).write_text(json.dumps(obj, separators=(',', ':'), ensure_ascii=False) + '\n')
    dump('lad.json', {'type': 'FeatureCollection', 'features': lad_features})
    dump('wards.json', {'type': 'FeatureCollection', 'features': ward_features})
    (OUT / 'sources.json').write_text(json.dumps(sources, indent=2, ensure_ascii=False) + '\n')
    for name in ('lad.json', 'wards.json'):
        print(f'{name}: {(OUT / name).stat().st_size / 1024:.0f} KB')
    print(f'{len(lad_features)} local authorities, {len(ward_features)} wards in {len(ward_lads)} local authorities')


if __name__ == '__main__':
    main()
