import { readFile, writeFile } from "node:fs/promises";

const reportDirectory = new URL("../coverage/frontend/", import.meta.url);
const summary = JSON.parse(await readFile(new URL("coverage-summary.json", reportDirectory), "utf8"));
const { covered, total, pct } = summary.total.lines;
const reportPath = new URL("index.html", reportDirectory);
let html = await readFile(reportPath, "utf8");

// Replace an existing headline so rerunning this script does not duplicate it.
html = html.replace(/\s*<p id="overall-coverage">[\s\S]*?<\/p>/, "");
const heading = "<h1>All files</h1>";
if (!html.includes(heading)) throw new Error("Coverage report heading was not found");
html = html.replace(heading, `${heading}
        <p id="overall-coverage"><strong>Overall frontend coverage: ${Number(pct).toFixed(2)}%</strong>
        <span class="quiet">(${Number(covered).toLocaleString("en-US")} of ${Number(total).toLocaleString("en-US")} executable lines covered; line coverage, matching the global threshold).</span></p>`);
await writeFile(reportPath, html);
