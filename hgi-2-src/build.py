import os, sys, json, subprocess
from solver import Solution
from report import build_markdown, make_figures, summary
OUT = "out"
def build(v, figs=True):
    s = Solution(v)
    d = f"{OUT}/img/{v}"
    if figs:
        make_figures(s, d)
    md = build_markdown(s, f"img/{v}")
    open(f"{OUT}/{v}.md", "w").write(md)
    json.dump(summary(s), open(f"{OUT}/{v}.json", "w"), ensure_ascii=False)
    return s
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    vs = [int(x) for x in sys.argv[1:]] or range(1, 31)
    for v in vs:
        build(v); print("ok", v)
