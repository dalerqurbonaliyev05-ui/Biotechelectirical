/**
 * Xavfsiz arifmetik ifoda hisoblagich (eval/Function ISHLATILMAYDI).
 * Qo'llab-quvvatlanadi: + - * / ^ ( ), o'zgaruvchilar, pi, e, sqrt abs sin cos tan asin acos atan ln log10 exp pow min max.
 * Misol: "U / R", "sqrt(P * R)", "U^2 / (R1 + R2)".
 */
const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  ln: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
}
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }

export const RESERVED_NAMES = new Set([...Object.keys(FUNCS), ...Object.keys(CONSTS)])
export const VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const MAX_LEN = 300

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string }

function tokenize(src: string): Token[] {
  if (src.length > MAX_LEN) throw new Error('expr_too_long')
  const out: Token[] = []
  const re =
    /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/^(),]))/y
  let pos = 0
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break
    re.lastIndex = pos
    const m = re.exec(src)
    if (!m) throw new Error('expr_bad_char')
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) })
    else if (m[2] !== undefined) out.push({ t: 'id', v: m[2] })
    else out.push({ t: 'op', v: m[3] as string })
    pos = re.lastIndex
  }
  return out
}

class Parser {
  private i = 0
  constructor(
    private toks: Token[],
    private vars: Record<string, number>,
  ) {}

  parse(): number {
    const v = this.expr()
    if (this.i < this.toks.length) throw new Error('expr_unexpected')
    return v
  }
  private peek(): Token | undefined {
    return this.toks[this.i]
  }
  private isOp(v: string): boolean {
    const p = this.peek()
    return p?.t === 'op' && p.v === v
  }
  private expr(): number {
    let v = this.term()
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.toks[this.i++] as { v: string }).v
      const r = this.term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  private term(): number {
    let v = this.unary()
    while (this.isOp('*') || this.isOp('/')) {
      const op = (this.toks[this.i++] as { v: string }).v
      const r = this.unary()
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  // Unar minus darajadan past: -2^2 = -4
  private unary(): number {
    if (this.isOp('-')) {
      this.i++
      return -this.unary()
    }
    if (this.isOp('+')) {
      this.i++
      return this.unary()
    }
    return this.power()
  }
  private power(): number {
    const base = this.primary()
    if (this.isOp('^')) {
      this.i++
      return Math.pow(base, this.unary()) // o'ngdan chapga
    }
    return base
  }
  private primary(): number {
    const tok = this.toks[this.i++]
    if (!tok) throw new Error('expr_unexpected_end')
    if (tok.t === 'num') return tok.v
    if (tok.t === 'op') {
      if (tok.v === '(') {
        const v = this.expr()
        if (!this.isOp(')')) throw new Error('expr_paren')
        this.i++
        return v
      }
      throw new Error('expr_unexpected')
    }
    // identifikator: funksiya, konstanta yoki o'zgaruvchi
    if (this.isOp('(') && Object.hasOwn(FUNCS, tok.v)) {
      this.i++
      const args: number[] = []
      if (!this.isOp(')')) {
        args.push(this.expr())
        while (this.isOp(',')) {
          this.i++
          args.push(this.expr())
        }
      }
      if (!this.isOp(')')) throw new Error('expr_paren')
      this.i++
      return (FUNCS[tok.v] as (...a: number[]) => number)(...args)
    }
    if (Object.hasOwn(this.vars, tok.v)) return this.vars[tok.v] as number
    if (Object.hasOwn(CONSTS, tok.v)) return CONSTS[tok.v] as number
    throw new Error(`expr_unknown_name`)
  }
}

/** Ifodani hisoblaydi. Xato yoki cheksiz natija bo'lsa Error tashlaydi. */
export function evaluate(expr: string, vars: Record<string, number> = {}): number {
  const v = new Parser(tokenize(expr), vars).parse()
  if (!Number.isFinite(v)) throw new Error('expr_not_finite')
  return v
}

/** Ifodadagi o'zgaruvchi nomlari (funksiya/konstantalarsiz). */
export function identifiersIn(expr: string): string[] {
  const names = new Set<string>()
  const toks = tokenize(expr)
  toks.forEach((tok, i) => {
    if (tok.t !== 'id') return
    const next = toks[i + 1]
    const isCall = next?.t === 'op' && next.v === '(' && Object.hasOwn(FUNCS, tok.v)
    if (!isCall && !Object.hasOwn(CONSTS, tok.v)) names.add(tok.v)
  })
  return [...names]
}
