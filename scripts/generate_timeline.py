#!/usr/bin/env python3
"""Append cloc snapshots and regenerate the repository growth chart."""
import csv
from datetime import date, datetime
from html import escape
import io
import json
import re
from pathlib import Path
import subprocess
import tarfile
import tempfile
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / 'docs/cloc-main-six-monthly.csv'
SVG_PATH = ROOT / 'docs/project-growth.svg'
BREAKDOWN_PATH = ROOT / 'docs/cloc-main-six-monthly-breakdown.csv'
BREAKDOWN_FIELDS = ['timestamp', 'branch', 'commit', 'normal_code_lines', 'test_code_lines', 'overall_code_lines']
FIELDS = ['timestamp', 'branch', 'commit', 'files', 'blank_lines', 'comment_lines',
          'code_lines', 'excluded_extensions', 'excluded_directories']


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode().strip()


def count_snapshot(commit):
    archive = subprocess.check_output(['git', 'archive', commit], cwd=ROOT)
    with tempfile.TemporaryDirectory(prefix='cftracker-cloc-') as directory:
        with tarfile.open(fileobj=io.BytesIO(archive)) as files:
            files.extractall(directory, filter='data')
        result = subprocess.check_output([
            'cloc', directory, '--json', '--by-file', '--quiet', '--exclude-ext=json',
            '--exclude-dir=.git,node_modules,dist,build',
        ])
        report = json.loads(result)
        test_lines = sum(value['code'] for path, value in report.items()
                         if path not in ('header', 'SUM')
                         and is_test_path(Path(path).relative_to(directory)))
    return report['SUM'], test_lines


def is_test_path(path):
    """Include test support/fixtures in test directories and named test files."""
    return (any(part.lower() in ('test', 'tests', '__tests__', 'testdata')
                for part in path.parts[:-1])
            or re.search(r'(?:[._](?:test|spec)\.[^.]+|_test\.go)$', path.name) is not None)


def measure(timestamp, branch, commit):
    total, _ = count_snapshot(commit)
    return dict(zip(FIELDS, [timestamp, branch, commit[:7], total['nFiles'],
                            total['blank'], total['comment'], total['code'],
                            'json', '.git;node_modules;dist;build']))


def breakdown(rows):
    if BREAKDOWN_PATH.exists():
        with BREAKDOWN_PATH.open(newline='') as file:
            recorded = list(csv.DictReader(file))
    else:
        recorded = []
    by_snapshot = {(row['timestamp'], row['branch'], row['commit']): row for row in recorded}
    additions = []
    result = []
    for row in rows:
        key = (row['timestamp'], row['branch'], row['commit'])
        if key not in by_snapshot:
            total, test_lines = count_snapshot(row['commit'])
            if total['code'] != int(row['code_lines']):
                raise ValueError(f"cloc total changed for {row['commit']}: "
                                 f"{total['code']} != preserved {row['code_lines']}")
            entry = dict(zip(BREAKDOWN_FIELDS, [*key, total['code'] - test_lines,
                                               test_lines, total['code']]))
            additions.append(entry)
            by_snapshot[key] = entry
        entry = by_snapshot[key]
        if (int(entry['normal_code_lines']) + int(entry['test_code_lines'])
                != int(row['code_lines']) or int(entry['overall_code_lines']) != int(row['code_lines'])):
            raise ValueError(f"Breakdown does not match preserved total for {row['commit']}")
        result.append({**row, **entry})
    if additions or not BREAKDOWN_PATH.exists():
        existed = BREAKDOWN_PATH.exists()
        with BREAKDOWN_PATH.open('a', newline='') as file:
            writer = csv.DictWriter(file, fieldnames=BREAKDOWN_FIELDS, lineterminator='\n')
            if not existed:
                writer.writeheader()
            writer.writerows(additions)
    return result


def render(rows):
    dates = [date.fromisoformat(row['timestamp']).toordinal() for row in rows]
    start, end = min(dates), max(dates)
    left, right, top, bottom = 100, 980, 155, 535
    x = lambda day: left + (day - start) / max(1, end - start) * (right - left)
    maximum = max(int(row['overall_code_lines']) for row in rows) * 1.15 or 1
    y = lambda value: bottom - value / maximum * (bottom - top)
    series = [('normal_code_lines', 'Normal code', '#2563eb'),
              ('test_code_lines', 'Test code', '#0d9488'),
              ('overall_code_lines', 'Overall', '#7c3aed')]
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 670" role="img" aria-labelledby="title desc">',
           '<title id="title">CFTracker project growth: normal code, tests, and overall</title>',
           '<desc id="desc">Three code-line series from preserved cloc measurements. Overall equals normal code plus test code. JSON and .git, node_modules, dist, build are excluded.</desc>',
           '<rect width="1200" height="670" fill="#f8fafc"/>',
           '<g font-family="sans-serif">',
           '<text x="100" y="42" font-size="26" font-weight="700" fill="#0f172a">CFTracker · project growth</text>',
           '<text x="100" y="68" font-size="13" fill="#475569">Six-month main history + preserved branch snapshots · non-JSON code lines</text>']
    for index, (_, label, color) in enumerate(series):
        legend_x = left + index * 240
        svg.append(f'<line x1="{legend_x}" y1="105" x2="{legend_x+28}" y2="105" stroke="{color}" stroke-width="3"/>')
        svg.append(f'<text x="{legend_x+38}" y="110" font-size="14" fill="#0f172a">{label}</text>')
    for tick in range(6):
        value = maximum * tick / 5
        yy = y(value)
        svg.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{right}" y2="{yy:.1f}" stroke="#e2e8f0"/>')
        svg.append(f'<text x="{left-12}" y="{yy+4:.1f}" text-anchor="end" font-size="12" fill="#64748b">{value:,.0f}</text>')
    for key, label, color in series:
        values = [int(row[key]) for row in rows]
        points = ' '.join(f'{x(day):.1f},{y(value):.1f}' for day, value in zip(dates, values))
        svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="3"/>')
        for row, day, value in zip(rows, dates, values):
            tooltip = escape(f"{row['timestamp']} · {row['branch']} · {row['commit']} · {label}: {value:,}")
            svg.append(f'<circle cx="{x(day):.1f}" cy="{y(value):.1f}" r="4" fill="{color}"><title>{tooltip}</title></circle>')
        svg.append(f'<text x="{right+12}" y="{y(values[-1])+5:.1f}" font-size="14" font-weight="700" fill="{color}">{values[-1]:,}</text>')
    for year in range(date.fromordinal(start).year, date.fromordinal(end).year + 1):
        day = max(start, date(year, 1, 1).toordinal())
        if day <= end:
            svg.append(f'<text x="{x(day):.1f}" y="{bottom+24}" text-anchor="middle" font-size="12" fill="#64748b">{year}</text>')
    last = rows[-1]
    svg.append(f'<text x="100" y="600" font-size="13" fill="#475569">Latest recorded: {escape(last["timestamp"])} · {escape(last["branch"])} · {escape(last["commit"])} (committed files only)</text>')
    svg.append('<text x="100" y="624" font-size="12" fill="#64748b">Overall = normal + tests · tests include test directories, support, and named test files</text>')
    svg.append('<text x="100" y="646" font-size="12" fill="#64748b">Measured with cloc · excludes JSON, .git, node_modules, dist, build · time-proportional x-axis</text></g></svg>')
    SVG_PATH.write_text('\n'.join(svg) + '\n')


def main():
    today = datetime.now(ZoneInfo('Asia/Dhaka')).date()
    if CSV_PATH.exists():
        with CSV_PATH.open(newline='') as file:
            rows = list(csv.DictReader(file))
    else:
        rows = []
    known = {row['timestamp'] for row in rows}
    additions = []
    for year in range(2021, today.year + 1):
        for month in (2, 8):
            snapshot = date(year, month, 1)
            if snapshot > today or snapshot.isoformat() in known:
                continue
            commit = git('rev-list', '-1', f'--before={snapshot.isoformat()}T23:59:59+06:00', 'origin/main')
            if commit:
                additions.append(measure(snapshot.isoformat(), 'main', commit))
    if today.isoformat() not in known:
        branch = git('branch', '--show-current') or 'detached HEAD'
        additions.append(measure(today.isoformat(), branch, git('rev-parse', 'HEAD')))
    CSV_PATH.parent.mkdir(exist_ok=True)
    if additions or not CSV_PATH.exists():
        existed = CSV_PATH.exists()
        with CSV_PATH.open('a', newline='') as file:
            writer = csv.DictWriter(file, fieldnames=FIELDS, lineterminator='\n')
            if not existed:
                writer.writeheader()
            writer.writerows(additions)
    rows = breakdown(sorted(rows + additions, key=lambda row: row['timestamp']))
    render(rows)
    timeline = ROOT / 'PROJECT_TIMELINE.md'
    existing = timeline.read_text() if timeline.exists() else '# Project Timeline: CFTracker\n\n'
    marker = '## Whole-project growth at six-month intervals'
    prefix = existing.split(marker)[0]
    last = rows[-1]
    summary = f'''{marker}

Historical interval points use the latest commit available on the local `origin/main` reference on or before each timestamp. Previously recorded measurements are preserved. The final recorded point measures committed snapshot `{last['commit']}` on `{last['branch']}`; existing dates retain their original snapshot even when HEAD changes. Uncommitted files are excluded. `cloc` excludes JSON and `.git`, `node_modules`, `dist`, and `build`.

The chart shows **normal code**, **test code**, and **overall code** on one scale. Overall is normal plus tests. Test code includes files under `test/`, `tests/`, `__tests__/`, and `testdata/`, plus named `*.test.*`, `*.spec.*`, and `*_test.go` files; shared mocks and fixtures within those directories are included. Normal code is every other counted file, including documentation, configuration, and generated sources that `cloc` recognizes. These are code-line counts, not executable coverage locations.

![Project growth](docs/project-growth.svg)

Code lines grew from {int(rows[0]['code_lines']):,} to {int(last['code_lines']):,}; counted files grew from {rows[0]['files']} to {last['files']}. Source: [preserved CSV totals](docs/cloc-main-six-monthly.csv) and [normal/test breakdown](docs/cloc-main-six-monthly-breakdown.csv). The horizontal axis is proportional to elapsed time.

| Timestamp | Branch | Snapshot | Files | Normal code | Test code | Overall code |
| --- | --- | --- | ---: | ---: | ---: | ---: |
'''
    for row in rows:
        summary += f"| {row['timestamp']} | {row['branch']} | `{row['commit']}` | {int(row['files']):,} | {int(row['normal_code_lines']):,} | {int(row['test_code_lines']):,} | {int(row['overall_code_lines']):,} |\n"
    timeline.write_text(prefix + summary)
    print(f'Added {len(additions)} snapshots; rendered {len(rows)} measurements.')
    print(f"Latest: {last['timestamp']} {last['branch']} {last['commit']}: {int(last['code_lines']):,} code lines, {last['files']} files")


if __name__ == '__main__':
    main()
