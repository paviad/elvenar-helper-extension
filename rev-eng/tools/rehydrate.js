#!/usr/bin/env node
/**
 * Rehydrate a minified Elvenar client bundle into something that reads like the unminified
 * "full" build, so newer snapshots can be studied with the same names rev-eng/ uses.
 *
 *   node rev-eng/tools/rehydrate.js tmp/elvenar-release-min-<hash>.js [--label release|beta|...]
 *        [--ref tmp/elvenar-release-full.js] [--root tmp/rehydrated]
 *
 * Every build gets its own folder, so all rehydrated versions are kept side by side:
 *
 *   tmp/rehydrated/<download date>-<hash8>[-<label>]/
 *     source.min.js    the input, copied (mtime kept = when it was downloaded)
 *     rehydrated.js    the readable source
 *     names.json       see below
 *     index/           classes.tsv + enums.tsv for this file (build-index.js)
 *     info.json        source name, label, size, dates, reference, match counts
 *
 * What survives Haxe + Closure minification: every class/enum's fully-qualified name
 * (`X.__name__ = "a.b.C"`, `{__ename__: "a.b.E"}`), every prototype field/method name and every
 * string literal. What is lost: the top-level identifiers (`Mib` instead of
 * `de_innogames_..._PopupCallToActionHandler`), local variable names and the source shape.
 *
 * The reference is the untouched Feb 12 full build (`-reveng` lost its IIFE wrapper and does not
 * parse); it only supplies names, so its line numbers do not matter here.
 *
 * Passes:
 *   1. classes/enums — each binding with a `__name__`/`__ename__` is renamed to the identifier
 *      the full build uses for it (looked up in rev-eng/index/*.tsv, else Haxe's mangling rule).
 *      Scope-aware (Babel bindings), so a local `k` shadowing a top-level `k` is left alone.
 *   2. helpers — the remaining top-level bindings (`$extend`, `$bind`, module-level functions
 *      like `api_VideoAdAPI_get_isVideoAdAvailable`, ...) are matched against the reference build
 *      by an "anchor signature": parameter count + the ordered property names, string literals
 *      and already-known top-level names the body touches. Exact, unique matches only; repeated
 *      until nothing new matches (each round makes more references known). Static holders
 *      (abstracts; `var X = {}` + `X.f = ...` in the full build, one object literal after Closure)
 *      match by member names; functions whose body changed match by position between matched
 *      neighbours (Closure keeps their order) plus token similarity — those are marked guessed.
 *   3. syntax — undo Closure's compressions: `!0`/`!1`, `void 0`, comma-statements, `a && b();`,
 *      `a ? b() : c();`, `return a, b`, merged `var`s, `0 < x`-style comparisons.
 *
 * names.json holds `names` (minified -> recovered, which also
 * helps re-anchoring the extension's patches against the min bundle, 06 §2), `guessed` (names
 * from a similarity match, also marked with a `rehydrate: guessed name` comment in the source)
 * and `newTypes` (classes/enums the reference build does not have).
 * Local variable names are NOT recovered (still `a`, `b`, `f`, ...).
 *
 * Runs in a worker thread so it can have a large heap and a deep stack (Babel recurses).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : fallback;
  };
  const ref = opt('--ref', 'tmp/elvenar-release-full.js');
  const label = opt('--label', '');
  const root = opt('--root', 'tmp/rehydrated');
  const input = args[0];
  if (!input) {
    console.log('usage: node rev-eng/tools/rehydrate.js <min bundle> [--label <name>] [--ref <full bundle>] [--root <dir>]');
    process.exit(1);
  }
  const stat = fs.statSync(input);
  const hash = path.basename(input).match(/-([0-9a-f]{8})[0-9a-f]*\.js$/)?.[1] || path.basename(input, '.js');
  const dir = path.join(root, [stat.mtime.toISOString().slice(0, 10), hash, label].filter(Boolean).join('-'));
  fs.mkdirSync(dir, { recursive: true });
  const worker = new Worker(__filename, {
    workerData: { input, ref, dir },
    resourceLimits: { maxOldGenerationSizeMb: 48 * 1024, stackSizeMb: 256 },
  });
  worker.on('message', (stats) => {
    const source = path.join(dir, 'source.min.js');
    fs.copyFileSync(input, source);
    fs.utimesSync(source, stat.atime, stat.mtime);
    execFileSync(process.execPath, [path.join(__dirname, 'build-index.js'), path.join(dir, 'rehydrated.js'), path.join(dir, 'index')], {
      stdio: 'inherit',
    });
    const info = {
      source: path.basename(input),
      label: label || null,
      downloaded: stat.mtime.toISOString(),
      bytes: stat.size,
      reference: ref,
      rehydrated: new Date().toISOString(),
      ...stats,
    };
    fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(info, null, 2) + '\n');
    console.log(`-> ${dir}`);
  });
  worker.on('error', (e) => {
    console.error(e);
    process.exitCode = 1;
  });
} else {
  parentPort.postMessage(run(workerData));
}

function run({ input, ref, dir }) {
  const out = path.join(dir, 'rehydrated.js');
  const parser = require('@babel/parser');
  const traverse = require('@babel/traverse').default;
  const generate = require('@babel/generator').default;
  const t = require('@babel/types');

  const started = Date.now();
  const log = (msg) => console.log(`[${((Date.now() - started) / 1000).toFixed(0)}s] ${msg}`);
  const parse = (file) => {
    log(`parsing ${file}`);
    return parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'script', errorRecovery: false });
  };

  // Names the full build gives each class/enum (FQ name -> compiled identifier).
  const knownIds = new Map();
  for (const tsv of ['classes.tsv', 'enums.tsv']) {
    for (const line of fs.readFileSync(path.join(__dirname, '..', 'index', tsv), 'utf8').split(/\r?\n/)) {
      const [fq, , id] = line.split('\t');
      if (fq && id) knownIds.set(fq, id);
    }
  }
  // Haxe's rule: `_` inside a path part becomes `_$`, parts are joined with `_`.
  const haxeId = (fq) => knownIds.get(fq) || fq.split('.').map((p) => p.replace(/_/g, '_$')).join('_');

  // ---- collect: class/enum bindings, $hxClasses/$hxEnums, every bound name -------------------
  function collectTypes(ast) {
    const types = new Map(); // Binding -> FQ name
    const registries = { classes: new Map(), enums: new Map() }; // Binding -> use count
    const allNames = new Set();
    const bump = (map, b) => b && map.set(b, (map.get(b) || 0) + 1);
    traverse(ast, {
      Scopable(p) {
        for (const name of Object.keys(p.scope.bindings)) allNames.add(name);
      },
      AssignmentExpression(p) {
        const { left, right } = p.node;
        if (!t.isMemberExpression(left) || !t.isIdentifier(left.object)) return;
        if (!left.computed && t.isIdentifier(left.property, { name: '__name__' }) && t.isStringLiteral(right)) {
          const b = p.scope.getBinding(left.object.name);
          if (b) types.set(b, right.value);
        } else if (left.computed && t.isStringLiteral(left.property) && t.isIdentifier(right)) {
          bump(registries.classes, p.scope.getBinding(left.object.name));
        }
      },
      ObjectProperty(p) {
        const { key, value } = p.node;
        const keyName = t.isIdentifier(key) ? key.name : t.isStringLiteral(key) ? key.value : null;
        if (keyName !== '__ename__' || !t.isStringLiteral(value)) return;
        // var X = $hxEnums["a.b.E"] = { __ename__: "a.b.E", ... }
        let cur = p.parentPath;
        while (cur.parentPath.isAssignmentExpression() && cur.parentPath.node.right === cur.node) {
          const left = cur.parentPath.node.left;
          if (t.isIdentifier(left)) {
            const b = cur.scope.getBinding(left.name);
            if (b) types.set(b, value.value);
          } else if (t.isMemberExpression(left) && t.isIdentifier(left.object)) {
            bump(registries.enums, cur.scope.getBinding(left.object.name));
          }
          cur = cur.parentPath;
        }
        if (cur.parentPath.isVariableDeclarator() && t.isIdentifier(cur.parentPath.node.id)) {
          const b = cur.scope.getBinding(cur.parentPath.node.id.name);
          if (b) types.set(b, value.value);
        }
      },
    });
    const top = (map) => [...map].sort((a, b) => b[1] - a[1])[0]?.[0];
    return { types, hxClasses: top(registries.classes), hxEnums: top(registries.enums), allNames };
  }

  // ---- anchor signatures for top-level bindings ------------------------------------------------
  // tokens: ['.prop', '"str"', {ref: Binding}, '@Global'] in source order.
  function signatureTokens(nodePath, moduleScope) {
    const tokens = [];
    nodePath.traverse({
      MemberExpression(p) {
        if (!p.node.computed) tokens.push('.' + p.node.property.name);
      },
      StringLiteral(p) {
        if (!p.parentPath.isObjectProperty({ key: p.node })) tokens.push(JSON.stringify(p.node.value));
      },
      Identifier(p) {
        if (!p.isReferencedIdentifier()) return;
        const b = p.scope.getBinding(p.node.name);
        if (!b) tokens.push('@' + p.node.name);
        else if (b.scope === moduleScope) tokens.push({ ref: b });
      },
    });
    return tokens;
  }

  // kind: 'fn' (function), 'obj' (static holder: abstracts, `var X = {}` + `X.foo = ...` in the full
  // build, collapsed into one object literal by Closure) or 'other'. Sorted by source position.
  function topLevelEntries(moduleScope, skip) {
    const entries = [];
    for (const b of Object.values(moduleScope.bindings)) {
      if (skip.has(b)) continue;
      let target = null;
      let kind = 'other';
      if (b.path.isFunctionDeclaration()) {
        target = b.path;
        kind = 'fn';
      } else if (b.path.isVariableDeclarator() && b.path.node.init) {
        target = b.path.get('init');
        if (target.isFunctionExpression()) kind = 'fn';
        else if (target.isObjectExpression()) kind = 'obj';
      }
      if (!target) continue;
      const members = new Set();
      if (kind === 'obj') {
        for (const prop of target.node.properties) {
          if (prop.key) members.add(t.isIdentifier(prop.key) ? prop.key.name : String(prop.key.value));
        }
        for (const ref of b.referencePaths) {
          const parent = ref.parentPath;
          if (
            parent.isMemberExpression({ object: ref.node, computed: false }) &&
            parent.parentPath.isAssignmentExpression({ left: parent.node })
          ) {
            members.add(parent.node.property.name);
          }
        }
        members.delete('__properties__');
      }
      entries.push({
        binding: b,
        kind,
        start: b.path.node.start,
        params: kind === 'fn' ? target.node.params.length : 0,
        members,
        tokens: signatureTokens(target, moduleScope),
      });
    }
    return entries.sort((a, b) => a.start - b.start);
  }

  // Multiset Jaccard similarity of two token lists.
  function similarity(a, b) {
    if (!a.length || !b.length) return 0;
    const counts = new Map();
    for (const tok of a) counts.set(tok, (counts.get(tok) || 0) + 1);
    let common = 0;
    for (const tok of b) {
      const n = counts.get(tok);
      if (n) {
        common++;
        counts.set(tok, n - 1);
      }
    }
    return common / (a.length + b.length - common);
  }

  // Longest chain of [ourIndex, refIndex] pairs increasing in both (pairs come sorted by ourIndex).
  function longestIncreasing(pairs) {
    const tails = [];
    const prev = new Array(pairs.length);
    pairs.forEach((pair, i) => {
      let lo = 0;
      let hi = tails.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pairs[tails[mid]][1] < pair[1]) lo = mid + 1;
        else hi = mid;
      }
      prev[i] = lo > 0 ? tails[lo - 1] : -1;
      tails[lo] = i;
    });
    const chain = [];
    for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) chain.unshift(pairs[i]);
    return chain;
  }

  function renameBinding(binding, newName) {
    const old = binding.identifier.name;
    if (old === newName) return;
    binding.identifier.name = newName;
    for (const p of binding.referencePaths) if (p.node.name === old) p.node.name = newName;
    for (const p of binding.constantViolations) {
      const ids = p.getBindingIdentifiers(true)[old] || [];
      for (const id of [].concat(ids)) id.name = newName;
    }
  }

  // ---- reference build ---------------------------------------------------------------------
  const refAst = parse(ref);
  const refInfo = collectTypes(refAst);
  const refModuleScope = [...refInfo.types.keys()][0].scope;
  const refEntries = topLevelEntries(refModuleScope, refInfo.types);
  const refTypeNames = new Set(refInfo.types.values());
  log(`reference: ${refInfo.types.size} classes/enums, ${refEntries.length} other top-level bindings`);

  // ---- target ------------------------------------------------------------------------------
  const ast = parse(input);
  const info = collectTypes(ast);
  const moduleScope = [...info.types.keys()][0].scope;
  const names = {}; // minified -> recovered
  const taken = new Set(info.allNames);
  const assign = (binding, wanted) => {
    let name = wanted;
    for (let i = 2; taken.has(name) && name !== binding.identifier.name; i++) name = `${wanted}$${i}`;
    taken.add(name);
    names[binding.identifier.name] = name;
    renameBinding(binding, name);
  };

  // Pass 1: classes and enums.
  for (const [b, fq] of info.types) assign(b, haxeId(fq));
  if (info.hxClasses) assign(info.hxClasses, '$hxClasses');
  if (info.hxEnums) assign(info.hxEnums, '$hxEnums');
  // The IIFE's parameters: (function($hx_exports, $global) { ... })
  const iife = moduleScope.path;
  const refIife = refModuleScope.path;
  if (iife.isFunction() && refIife.isFunction()) {
    iife.node.params.forEach((param, i) => {
      const refParam = refIife.node.params[i];
      if (t.isIdentifier(param) && t.isIdentifier(refParam)) assign(moduleScope.getBinding(param.name), refParam.name);
    });
  }
  const newTypes = [...info.types.values()].filter((fq) => !refTypeNames.has(fq));
  log(`pass 1: ${info.types.size} classes/enums renamed (${newTypes.length} not in the reference build)`);

  // Pass 2: other top-level bindings, matched against the reference build's.
  const entries = topLevelEntries(moduleScope, info.types);
  const matchedRef = new Set([...refInfo.types.keys(), refInfo.hxClasses, refInfo.hxEnums].filter(Boolean));
  if (refIife.isFunction()) for (const p of refIife.node.params) matchedRef.add(refModuleScope.getBinding(p.name));
  const matched = new Set([...info.types.keys(), info.hxClasses, info.hxEnums].filter(Boolean));
  if (iife.isFunction()) for (const p of iife.node.params) matched.add(moduleScope.getBinding(p.name));
  const pairOf = new Map(); // our Binding -> ref Binding
  const guessed = {}; // recovered name -> why
  const counts = { exact: 0, members: 0, order: 0 };
  const pair = (e, r, how, score) => {
    assign(e.binding, r.binding.identifier.name);
    matched.add(e.binding);
    matchedRef.add(r.binding);
    pairOf.set(e.binding, r.binding);
    counts[how]++;
    if (score !== undefined) {
      const why = `${how} ${score.toFixed(2)}`;
      guessed[e.binding.identifier.name] = why;
      t.addComment(e.binding.path.node, 'leading', ` rehydrate: guessed name (${why}) `, false);
    }
  };
  // References to top-level bindings count as anchors only once both sides know them.
  const ourTokens = (e) =>
    e.tokens.map((tok) => (typeof tok === 'string' ? tok : matched.has(tok.ref) ? '@' + tok.ref.identifier.name : '@?'));
  const refTokens = (e) =>
    e.tokens.map((tok) => (typeof tok === 'string' ? tok : matchedRef.has(tok.ref) ? '@' + tok.ref.identifier.name : '@?'));
  const open = () => [entries.filter((e) => !matched.has(e.binding)), refEntries.filter((r) => !matchedRef.has(r.binding))];
  const uniqueBy = (list, keyOf) => {
    const map = new Map();
    for (const e of list) {
      const key = keyOf(e);
      if (key !== null) map.set(key, map.has(key) ? null : e);
    }
    return map;
  };

  // a) Identical anchor signature (kind, parameter count, tokens), unique on both sides.
  function matchExact() {
    const [ours, refs] = open();
    const sig = (tokensOf) => (e) => (e.tokens.length ? `${e.kind}|${e.params}|${tokensOf(e).join(' ')}` : null);
    const refBySig = uniqueBy(refs, sig(refTokens));
    let found = 0;
    for (const [key, e] of uniqueBy(ours, sig(ourTokens))) {
      const r = refBySig.get(key);
      if (e && r) {
        pair(e, r, 'exact');
        found++;
      }
    }
    return found;
  }

  // b) Static holders: identical member names, else the clearly best overlap.
  function matchMembers() {
    const [ours, refs] = open().map((list) => list.filter((e) => e.kind === 'obj' && e.members.size));
    const key = (e) => [...e.members].sort().join(',');
    const refByKey = uniqueBy(refs, key);
    let found = 0;
    for (const [k, e] of uniqueBy(ours, key)) {
      const r = refByKey.get(k);
      if (e && r) {
        pair(e, r, 'exact');
        found++;
      }
    }
    for (const e of ours) {
      if (matched.has(e.binding) || e.members.size < 2) continue;
      const scored = refs
        .filter((r) => !matchedRef.has(r.binding))
        .map((r) => [r, similarity([...e.members], [...r.members])])
        .sort((a, b) => b[1] - a[1]);
      const [best, second] = scored;
      if (best && best[1] >= 0.5 && (!second || second[1] < best[1] - 0.15)) {
        pair(e, best[0], 'members', best[1]);
        found++;
      }
    }
    return found;
  }

  // c) Functions keep their relative order (Closure hoists them but does not reorder): between
  //    two already matched functions, align the unmatched ones by similarity + parameter count.
  function matchByOrder() {
    const ours = entries.filter((e) => e.kind === 'fn');
    const refs = refEntries.filter((r) => r.kind === 'fn');
    const refIndex = new Map(refs.map((r, i) => [r.binding, i]));
    const pairs = [];
    ours.forEach((e, i) => {
      const r = pairOf.get(e.binding);
      if (r && refIndex.has(r)) pairs.push([i, refIndex.get(r)]);
    });
    const anchors = [[-1, -1], ...longestIncreasing(pairs), [ours.length, refs.length]];
    let found = 0;
    for (let k = 1; k < anchors.length; k++) {
      const gapOurs = ours.slice(anchors[k - 1][0] + 1, anchors[k][0]).filter((e) => !matched.has(e.binding));
      const gapRefs = refs.slice(anchors[k - 1][1] + 1, anchors[k][1]).filter((r) => !matchedRef.has(r.binding));
      if (!gapOurs.length || !gapRefs.length || gapOurs.length * gapRefs.length > 4e6) continue;
      const ourToks = gapOurs.map(ourTokens);
      const refToks = gapRefs.map(refTokens);
      const score = (i, j) => (gapOurs[i].params === gapRefs[j].params ? similarity(ourToks[i], refToks[j]) : 0);
      // Needleman-Wunsch without gap costs: maximise the summed score of kept pairs (>= 0.5 each).
      const n = gapOurs.length;
      const m = gapRefs.length;
      const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const s = score(i - 1, j - 1);
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], s >= 0.5 ? dp[i - 1][j - 1] + s : -Infinity);
        }
      }
      for (let i = n, j = m; i > 0 && j > 0; ) {
        const s = score(i - 1, j - 1);
        if (s >= 0.5 && dp[i][j] === dp[i - 1][j - 1] + s) {
          pair(gapOurs[i - 1], gapRefs[j - 1], 'order', s);
          found++;
          i--;
          j--;
        } else if (dp[i][j] === dp[i - 1][j]) i--;
        else j--;
      }
      // A lone leftover on each side with the same arity is the same function, rewritten.
      const byParams = (list) => Map.groupBy(list.filter((e) => !matched.has(e.binding) && !matchedRef.has(e.binding)), (e) => e.params);
      const ourLeft = byParams(gapOurs);
      const refLeft = byParams(gapRefs);
      for (const [params, [e, ...moreOurs]] of ourLeft) {
        const [r, ...moreRefs] = refLeft.get(params) || [];
        if (!r || moreOurs.length || moreRefs.length) continue;
        const s = similarity(ourTokens(e), refTokens(r));
        if (s >= 0.15) {
          pair(e, r, 'order', s);
          found++;
        }
      }
    }
    return found;
  }

  // Closure hoists repeated literals into top-level constants (`var oXc = "getRewards";`) and
  // aliases globals (`var rgb = Boolean;`); put them back where they are used.
  function inlineConstants() {
    let inlined = 0;
    for (const e of entries) {
      const b = e.binding;
      if (matched.has(b) || !b.constant || !b.path.isVariableDeclarator()) continue;
      const init = b.path.node.init;
      const isGlobal = t.isIdentifier(init) && !moduleScope.hasBinding(init.name) && !info.allNames.has(init.name);
      if (!(t.isStringLiteral(init) || t.isNumericLiteral(init) || t.isBooleanLiteral(init) || isGlobal)) continue;
      if (!b.referencePaths.every((p) => p.isReferencedIdentifier())) continue;
      for (const p of b.referencePaths) p.replaceWith(t.cloneNode(init));
      matched.add(b);
      b.path.remove();
      inlined++;
    }
    return inlined;
  }

  for (let round = 1; ; round++) {
    const found = matchExact() + matchMembers() + matchByOrder();
    log(`pass 2 round ${round}: ${found} matched`);
    if (!found) break;
  }
  const inlined = inlineConstants();
  const unmatched = entries.filter((e) => !matched.has(e.binding)).length;
  log(
    `pass 2: ${entries.length - unmatched} of ${entries.length} top-level helpers resolved ` +
      `(${counts.exact} exact, ${counts.members} by members, ${counts.order} by order, ${inlined} constants inlined; ` +
      `${unmatched} left minified)`,
  );

  // Pass 3: syntax.
  const hasUndefinedBinding = info.allNames.has('undefined');
  const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '==': '==', '!=': '!=', '===': '===', '!==': '!==' };
  const negateOp = { '==': '!=', '!=': '==', '===': '!==', '!==': '===' };
  const isLiteral = (n) => t.isStringLiteral(n) || t.isNumericLiteral(n) || t.isNullLiteral(n) || t.isBooleanLiteral(n);
  const negate = (n) => {
    if (t.isUnaryExpression(n, { operator: '!' })) return n.argument;
    if (t.isBinaryExpression(n) && negateOp[n.operator]) return t.binaryExpression(negateOp[n.operator], n.left, n.right);
    return t.unaryExpression('!', n);
  };
  const toStatement = (expr) => t.expressionStatement(expr);
  const replaceWithStatements = (p, statements) => {
    if (Array.isArray(p.container)) p.replaceWithMultiple(statements);
    else p.replaceWith(t.blockStatement(statements));
  };
  traverse(ast, {
    UnaryExpression(p) {
      const { operator, argument } = p.node;
      if (operator === '!' && t.isNumericLiteral(argument)) p.replaceWith(t.booleanLiteral(argument.value === 0));
      else if (operator === 'void' && t.isNumericLiteral(argument, { value: 0 }) && !hasUndefinedBinding)
        p.replaceWith(t.identifier('undefined'));
    },
    NumericLiteral(p) {
      if (Number.isInteger(p.node.value) && Math.abs(p.node.value) < 1e21) delete p.node.extra;
    },
    BinaryExpression(p) {
      const { operator, left, right } = p.node;
      if (flip[operator] && isLiteral(left) && !isLiteral(right)) p.replaceWith(t.binaryExpression(flip[operator], right, left));
    },
    ExpressionStatement(p) {
      const e = p.node.expression;
      if (t.isSequenceExpression(e)) {
        replaceWithStatements(p, e.expressions.map(toStatement));
      } else if (t.isLogicalExpression(e) && (e.operator === '&&' || e.operator === '||')) {
        const test = e.operator === '&&' ? e.left : negate(e.left);
        p.replaceWith(t.ifStatement(test, t.blockStatement([toStatement(e.right)])));
      } else if (t.isConditionalExpression(e)) {
        const alternate = t.isConditionalExpression(e.alternate)
          ? toStatement(e.alternate)
          : t.blockStatement([toStatement(e.alternate)]);
        p.replaceWith(t.ifStatement(e.test, t.blockStatement([toStatement(e.consequent)]), alternate));
      }
    },
    'ReturnStatement|ThrowStatement'(p) {
      const arg = p.node.argument;
      if (!t.isSequenceExpression(arg) || !Array.isArray(p.container)) return;
      const last = arg.expressions[arg.expressions.length - 1];
      const final = p.isReturnStatement() ? t.returnStatement(last) : t.throwStatement(last);
      p.replaceWithMultiple([...arg.expressions.slice(0, -1).map(toStatement), final]);
    },
    IfStatement(p) {
      const test = p.node.test;
      if (!t.isSequenceExpression(test) || !Array.isArray(p.container)) return;
      const last = test.expressions[test.expressions.length - 1];
      p.replaceWithMultiple([
        ...test.expressions.slice(0, -1).map(toStatement),
        t.ifStatement(last, p.node.consequent, p.node.alternate),
      ]);
    },
    VariableDeclaration(p) {
      const { declarations, kind } = p.node;
      if (declarations.length < 2 || !Array.isArray(p.container)) return;
      p.replaceWithMultiple(declarations.map((d) => t.variableDeclaration(kind, [d])));
    },
  });
  log('pass 3: syntax restored');

  log(`generating ${out}`);
  const { code } = generate(ast, { comments: true, jsescOption: { minimal: true } });
  fs.writeFileSync(out, code);
  const unmatchedPreview = {};
  for (const e of entries.filter((e) => !matched.has(e.binding))) {
    const preview = e.kind === 'obj' ? [...e.members] : ourTokens(e);
    unmatchedPreview[e.binding.identifier.name] = `${e.kind}: ${preview.slice(0, 10).join(' ')}`;
  }
  const report = { names, guessed, newTypes: newTypes.sort(), unmatched: unmatchedPreview };
  fs.writeFileSync(path.join(dir, 'names.json'), JSON.stringify(report, null, 1) + '\n');
  const rss = process.resourceUsage().maxRSS / 2 ** 20;
  const lines = code.split('\n').length;
  log(`done: ${(code.length / 2 ** 20).toFixed(1)} MB, ${lines} lines, peak memory ${rss.toFixed(1)} GB`);
  return {
    lines,
    types: info.types.size,
    newTypes: newTypes.length,
    helpers: entries.length,
    helpersByHow: { ...counts, inlined },
    guessed: Object.keys(guessed).length,
    leftMinified: unmatched,
  };
}
