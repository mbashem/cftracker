#!/usr/bin/env python3
"""Generate six-month main-line cloc measurements and an SVG graph."""
import argparse
import csv
import datetime as dt
import json
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET

FIELDS = ["timestamp", "branch", "commit", "files", "blank_lines", "comment_lines", "code_lines", "excluded_extensions", "excluded_directories"]
DATES = [dt.date(y, m, 1) for y in range(2021, 2027) for m in (2, 8)]

def run(*args):
    return subprocess.check_output(args, text=True).strip()

def measure(repo, stamp, branch, commit):
    with tempfile.TemporaryDirectory(prefix="cloc-snapshot-") as temp:
        snap = Path(temp) / stamp.isoformat()
        snap.mkdir()
        archive = subprocess.Popen(["git", "-C", str(repo), "archive", commit], stdout=subprocess.PIPE)
        subprocess.run(["tar", "-x", "-C", str(snap)], stdin=archive.stdout, check=True)
        archive.wait()
        raw = run("cloc", "--exclude-dir=.git,node_modules,dist,build", "--exclude-ext=json", "--json", str(snap))
    total = json.loads(raw)["SUM"]
    return [stamp.isoformat(), branch, commit[:7], total["nFiles"], total["blank"], total["comment"], total["code"], "json", ".git;node_modules;dist;build"]

def svg(rows):
    width, height, left, right, top, bottom = 900, 620, 82, 36, 55, 70
    plot_w, plot_h = width - left - right, 190
    colors = ("#2563eb", "#16a34a")
    labels = [r[0][2:7] if r[1] == "main" else f"Latest ({r[1]})" for r in rows]
    def panel(y, title, key, color, max_value):
        points = []
        for i, row in enumerate(rows):
            x = left + plot_w * i / (len(rows) - 1)
            value = int(row[key])
            yy = y + plot_h - value / max_value * plot_h
            points.append((x, yy, value))
        lines = [f'<text x="{left}" y="{y-18}" font-size="18" font-family="sans-serif" fill="#111827">{title}</text>']
        for tick in range(5):
            yy = y + plot_h - plot_h * tick / 4
            value = round(max_value * tick / 4)
            lines.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{width-right}" y2="{yy:.1f}" stroke="#d1d5db"/>')
            lines.append(f'<text x="{left-10}" y="{yy+4:.1f}" text-anchor="end" font-size="11" font-family="sans-serif" fill="#6b7280">{value:,}</text>')
        lines.append(f'<line x1="{left}" y1="{y+plot_h}" x2="{width-right}" y2="{y+plot_h}" stroke="#374151"/>')
        lines.append(f'<polyline points="{" ".join(f"{x:.1f},{yy:.1f}" for x, yy, _ in points)}" fill="none" stroke="{color}" stroke-width="3"/>')
        for x, yy, value in points:
            lines.append(f'<circle cx="{x:.1f}" cy="{yy:.1f}" r="4" fill="{color}"/><title>{value:,}</title>')
        for i, label in enumerate(labels):
            x = left + plot_w * i / (len(rows) - 1)
            lines.append(f'<text x="{x:.1f}" y="{y+plot_h+22}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#6b7280">{label}</text>')
        return "".join(lines)
    content = panel(55, "Non-JSON code lines", 6, colors[0], max(int(r[6]) for r in rows)) + panel(350, "Non-JSON files", 3, colors[1], max(int(r[3]) for r in rows))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc"><title id="title">Project growth from six-month main snapshots</title><desc id="desc">Code lines and file count measured with cloc, excluding JSON and generated directories.</desc>{content}</svg>\n'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--csv", type=Path, default=Path("docs/cloc-main-six-monthly.csv"))
    parser.add_argument("--svg", type=Path, default=Path("docs/project-growth.svg"))
    args = parser.parse_args()
    existing = []
    if args.csv.exists():
        with args.csv.open(newline="") as stream:
            for source in csv.DictReader(stream):
                existing.append([source["timestamp"], source.get("branch", "main"), source.get("commit", source.get("main_commit", "")), int(source["files"]), int(source["blank_lines"]), int(source["comment_lines"]), int(source["code_lines"]), source["excluded_extensions"], source["excluded_directories"]])
    known = {row[0] for row in existing}
    rows = list(existing)
    for stamp in DATES:
        if stamp.isoformat() in known:
            continue
        commit = run("git", "-C", str(args.repo), "rev-list", "-1", f"--before={stamp.isoformat()} 23:59:59", "origin/main")
        if commit:
            rows.append(measure(args.repo, stamp, "main", commit))
    current_branch = run("git", "-C", str(args.repo), "branch", "--show-current") or "detached-HEAD"
    latest_commit = run("git", "-C", str(args.repo), "rev-parse", "HEAD")
    latest_date = dt.date.fromisoformat(run("git", "-C", str(args.repo), "show", "-s", "--format=%cs", "HEAD"))
    if latest_date.isoformat() not in known:
        rows.append(measure(args.repo, latest_date, current_branch, latest_commit))
    rows.sort(key=lambda row: row[0])
    args.csv.parent.mkdir(parents=True, exist_ok=True)
    with args.csv.open("w", newline="") as stream:
        writer = csv.writer(stream, lineterminator="\n"); writer.writerow(FIELDS); writer.writerows(rows)
    args.svg.parent.mkdir(parents=True, exist_ok=True); args.svg.write_text(svg(rows))
    ET.parse(args.svg)

if __name__ == "__main__":
    main()
