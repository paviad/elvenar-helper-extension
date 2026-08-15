#!/usr/bin/env node
/**
 * Mechanically extract the network-service catalog (rev-eng/index/services-raw.md + services.json)
 * from a compiled snapshot. Usage:
 *   node rev-eng/tools/extract-services.js rev-eng/index/classes.tsv rev-eng/index/services.json
 * Writes services.json and services-raw.md (same basename) next to the json path.
 * Reads tmp/elvenar-release-full-reveng.js from the repo root.
 */
const fs = require('fs');
const src = fs.readFileSync('tmp/elvenar-release-full-reveng.js', 'utf8');
const lines = src.split('\n');
const idx = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(l => l.split('\t'));
// find classes whose prototype extends AbstractConnectionService (directly or via chain) — do simple: any class whose body mentions this.request( or addPushResponseListener
const out = [];
for (let i = 0; i < idx.length; i++) {
  const [name, lineStr, jsName] = idx[i];
  const start = +lineStr - 1;
  // class body: from ctor start (search backwards for 'var jsName = function') to next class's ctor
  let s = start; while (s > 0 && !lines[s].startsWith('var ' + jsName + ' = function')) s--;
  const nextLine = i + 1 < idx.length ? +idx[i + 1][1] - 1 : lines.length;
  let e = Math.min(nextLine, lines.length-1); while (e > s && !lines[e].startsWith('var ' + idx[i+1]?.[2] + ' = function')) e--;
  if (e <= s) e = nextLine;
  const body = lines.slice(s, e).join('\n');
  const sn = body.match(/get_serviceName: function\(\) \{\s*return "([^"]+)";/);
  const isSvc = /AbstractConnectionService/.test(body) || sn;
  if (!isSvc || e - s > 2000) continue;
  const superM = body.match(/\.__super__ = (\w+);/);
  const push = [...body.matchAll(/addPushResponseListener\("([^"]+)",\$bind\(this,this\.(\w+)\)\)/g)].map(m => `${m[1]} -> ${m[2]}`);
  const methods = [];
  const mre = /^\t,?(\w+): function\(([^)]*)\) \{([\s\S]*?)^\t\}/gm;
  let m;
  while ((m = mre.exec(body))) {
    const [_, mname, args, mbody] = m;
    if (mname === '__class__') continue;
    const reqs = [...mbody.matchAll(/this\.request\("([^"]+)"\)((?:\.\w+\([^;]*?\))*)\.call\(\)/g)].map(r => r[1] + r[2]);
    const reqs2 = [...mbody.matchAll(/\.request\("([^"]+)"\)/g)].map(r=>r[1]);
    methods.push({ mname, args, reqs: reqs.length ? reqs : reqs2.map(r=>r+' (complex)'), lines: mbody.split('\n').length });
  }
  out.push({ name, jsName, line: +lineStr, startLine: s+1, endLine: e, serviceName: sn ? sn[1] : null, super: superM ? superM[1] : null, push, methods });
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
// also a markdown summary
let md = '';
for (const svc of out) {
  md += `\n## ${svc.name}  (L${svc.startLine}-L${svc.endLine})\n- serviceName: **${svc.serviceName}**  super: ${svc.super}\n`;
  if (svc.push.length) md += `- push listeners: ${svc.push.join('; ')}\n`;
  for (const mt of svc.methods) md += `- \`${mt.mname}(${mt.args})\`${mt.reqs.length ? ' → ' + mt.reqs.map(r=>'`'+r+'`').join(', ') : ''}${mt.lines>6?` [${mt.lines} lines]`:''}\n`;
}
fs.writeFileSync(process.argv[3].replace('.json','-raw.md'), md);
console.log(out.length, 'services');
