#!/usr/bin/env python3
"""Append cloc snapshots and regenerate the repository growth chart."""
import csv
from datetime import date, datetime
from html import escape
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / 'docs/cloc-main-six-monthly.csv'
SVG_PATH = ROOT / 'docs/project-growth.svg'
FIELDS = ['timestamp', 'branch', 'commit', 'files', 'blank_lines', 'comment_lines',
          'code_lines', 'excluded_extensions', 'excluded_directories']


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode().strip()


def measure(timestamp, branch, commit):
    archive = subprocess.check_output(['git', 'archive', commit], cwd=ROOT)
    with tempfile.TemporaryDirectory(prefix='cftracker-cloc-') as directory:
        with tarfile.open(fileobj=io.BytesIO(archive)) as files:
            files.extractall(directory, filter='data')
        result = subprocess.check_output([
            'cloc', directory, '--json', '--quiet', '--exclude-ext=json',
            '--exclude-dir=.git,node_modules,dist,build',
        ])
    total = json.loads(result)['SUM']
    return dict(zip(FIELDS, [timestamp, branch, commit[:7], total['nFiles'],
                            total['blank'], total['comment'], total['code'],
                            'json', '.git;node_modules;dist;build']))


def render(rows):
    dates = [date.fromisoformat(row['timestamp']).toordinal() for row in rows]
    start, end = min(dates), max(dates)
    left, right = 100, 1060
    x = lambda day: left + (day - start) / max(1, end - start) * (right - left)
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc">',
           '<title id="title">CFTracker project growth</title>',
           '<desc id="desc">Code lines and file count from preserved cloc measurements and six-month origin/main snapshots, with a final current-branch HEAD snapshot. JSON and .git, node_modules, dist, build are excluded.</desc>',
           '<rect width="1200" height="760" fill="#f8fafc"/>',
           '<g font-family="sans-serif">',
           '<text x="100" y="42" font-size="26" font-weight="700" fill="#0f172a">CFTracker · project growth</text>',
           '<text x="100" y="68" font-size="13" fill="#475569">Six-month main history + preserved snapshots + current branch HEAD</text>']
    for key, title, top, bottom, color in [('code_lines', 'Non-JSON code lines', 130, 330, '#2563eb'),
                                         ('files', 'Non-JSON files', 430, 630, '#0d9488')]:
        values = [int(row[key]) for row in rows]
        maximum = max(values) * 1.15 or 1
        y = lambda value: bottom - value / maximum * (bottom - top)
        svg.append(f'<text x="{left}" y="{top-20}" font-size="17" font-weight="600" fill="#0f172a">{title}</text>')
        for tick in range(5):
            value = maximum * tick / 4
            yy = y(value)
            svg.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{right}" y2="{yy:.1f}" stroke="#e2e8f0"/>')
            svg.append(f'<text x="{left-12}" y="{yy+4:.1f}" text-anchor="end" font-size="12" fill="#64748b">{value:,.0f}</text>')
        points = ' '.join(f'{x(day):.1f},{y(value):.1f}' for day, value in zip(dates, values))
        svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="3"/>')
        for row, day, value in zip(rows, dates, values):
            label = escape(f"{row['timestamp']} · {row['branch']} · {row['commit']}: {value:,}")
            svg.append(f'<circle cx="{x(day):.1f}" cy="{y(value):.1f}" r="4" fill="{color}"><title>{label}</title></circle>')
        last = rows[-1]
        svg.append(f'<text x="{right}" y="{y(values[-1])-14:.1f}" text-anchor="end" font-size="14" font-weight="700" fill="{color}">{values[-1]:,} · {escape(last["branch"])}</text>')
        for year in range(date.fromordinal(start).year, date.fromordinal(end).year + 1):
            day = max(start, date(year, 1, 1).toordinal())
            if day <= end:
                svg.append(f'<text x="{x(day):.1f}" y="{bottom+24}" text-anchor="middle" font-size="12" fill="#64748b">{year}</text>')
    last = rows[-1]
    svg.append(f'<text x="100" y="702" font-size="13" fill="#475569">Latest: {escape(last["timestamp"])} · {escape(last["branch"])} · {escape(last["commit"])} (committed files only)</text>')
    svg.append('<text x="100" y="726" font-size="12" fill="#64748b">Measured with cloc · excludes JSON, .git, node_modules, dist, build · time-proportional x-axis</text></g></svg>')
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
    rows = sorted(rows + additions, key=lambda row: row['timestamp'])
    render(rows)
    timeline = ROOT / 'PROJECT_TIMELINE.md'
    existing = timeline.read_text() if timeline.exists() else '# Project Timeline: CFTracker\n\n'
    marker = '## Whole-project growth at six-month intervals'
    prefix = existing.split(marker)[0]
    last = rows[-1]
    summary = f'''{marker}

Historical interval points use the latest commit available on the local `origin/main` reference on or before each timestamp. Previously recorded measurements are preserved. The final point measures committed `HEAD` on `{last['branch']}`; uncommitted files are excluded. `cloc` excludes JSON and `.git`, `node_modules`, `dist`, and `build`.

![Project growth](docs/project-growth.svg)

Code lines grew from {int(rows[0]['code_lines']):,} to {int(last['code_lines']):,}; counted files grew from {rows[0]['files']} to {last['files']}. Source: [CSV measurements](docs/cloc-main-six-monthly.csv). The horizontal axis is proportional to elapsed time.

| Timestamp | Branch | Snapshot | Files | Code lines |
| --- | --- | --- | ---: | ---: |
'''
    for row in rows:
        summary += f"| {row['timestamp']} | {row['branch']} | `{row['commit']}` | {int(row['files']):,} | {int(row['code_lines']):,} |\n"
    timeline.write_text(prefix + summary)
    print(f'Added {len(additions)} snapshots; rendered {len(rows)} measurements.')
    print(f"Latest: {last['timestamp']} {last['branch']} {last['commit']}: {int(last['code_lines']):,} code lines, {last['files']} files")


if __name__ == '__main__':
    main()
