import { spawn } from "node:child_process";
import { stdout, stderr, argv } from "node:process";
import kleur from 'kleur';


const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const isSeparator = (line) => /^-+(\|-+)+-+$/.test(line.trim());
const isHeader = (line) => {
  return /\bFile\b/.test(line) && /% Stmts/.test(line) && /% Branch/.test(line);
};

const colorFnForPct = (v) => {
  const b = kleur.bold();
  if (!Number.isFinite(v)) return kleur.bold;
  if (v >= 100) return b.green;
  if (v >= 70) return b.yellow;
  return b.red;
};

const colorizeForPct = (txt,v) => {
  const fn = colorFnForPct(v);
  return fn(txt);
};

function processLine(originalLine) {
  const line = stripAnsi(originalLine);
  const parts = line.split("|");

  const looksLikeTableRow = parts.length >= 6;

  if (!looksLikeTableRow) return originalLine;

  if (isSeparator(line) || isHeader(line)) {
    return originalLine;
  }

  // Process data row

  const scores = [100, 0, 0, 0, 0, 0];

  for (const i of [1, 2, 3, 4]) {
    const thisScore = Number.parseFloat(parts[i].trim());
    scores[i] = thisScore;
    if (!Number.isFinite(thisScore)) continue;
    scores[0] = Math.min(scores[0], thisScore);
  }

  const colorParts = parts.map((part, i) => colorizeForPct(part, scores[i]));

  return colorParts.join('|');
}


function createProcessor(write) {
  let buf = "";

  return {
    feed(chunk) {
      buf += chunk;
      let i;
      while ((i = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, i).replace(/\r$/, "");
        buf = buf.slice(i + 1);
        write(processLine(line));
        write('\n');
      }
    },
    finish() {
      if (buf.length) {
        write(processLine(buf));
        write('\n');
      }
      write(A.reset);
    },
  };
}


function runWithCommand(cmd) {
  const child = spawn(cmd, { shell: true, stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const proc = createProcessor((s) => stdout.write(s));
  child.stdout.on("data", (d) => proc.feed(String(d)));
  child.stdout.on("end", () => proc.finish());
  child.stderr.on("data", (d) => stderr.write(d)); // passthrough
  child.on("close", (code, signal) => {
    stdout.write(A.reset + '\n');
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

const cmdToRun = 'FORCE_COLOR=1 ' + (argv.slice(2).join(' ') || 'echo No input command');
runWithCommand(cmdToRun);
