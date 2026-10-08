'use strict';
// Tiny offline "next word" model learned from the files you have open (bigrams).

const TOKEN = /[\p{L}\p{N}_$]+/gu;
const MAX_CHARS = 200000;

class Predictor {
  constructor() { this.docs = new Map(); }

  learn(key, text) {
    if (typeof text !== 'string' || !text) { this.docs.delete(key); return; }
    const t = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
    const tokens = t.match(TOKEN) || [];
    const model = new Map();
    for (let i = 0; i + 1 < tokens.length; i++) {
      const a = tokens[i], b = tokens[i + 1];
      let m = model.get(a);
      if (!m) { m = new Map(); model.set(a, m); }
      m.set(b, (m.get(b) || 0) + 1);
    }
    this.docs.set(key, model);
  }

  forget(key) { this.docs.delete(key); }

  suggest(prev, prefix) {
    if (!prev) return undefined;
    const totals = new Map();
    for (const model of this.docs.values()) {
      const m = model.get(prev);
      if (!m) continue;
      for (const [next, n] of m) {
        if (prefix && !next.startsWith(prefix)) continue;
        if (next.length <= prefix.length) continue;
        totals.set(next, (totals.get(next) || 0) + n);
      }
    }
    let best, bestN = 0;
    for (const [w, n] of totals) {
      if (n > bestN || (n === bestN && best !== undefined && w.length < best.length)) { best = w; bestN = n; }
    }
    const need = prefix.length >= 2 ? 1 : 2;
    return bestN >= need ? best : undefined;
  }
}

// Split "…prevWord␠prefix|" at the cursor.
const CONTEXT = /([\p{L}\p{N}_$]+)[ \t]+([\p{L}\p{N}_$]*)$/u;
function contextAt(linePrefix) {
  const m = CONTEXT.exec(linePrefix);
  return m ? { prev: m[1], prefix: m[2] } : undefined;
}

module.exports = { Predictor, contextAt, TOKEN };
