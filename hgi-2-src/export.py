"""Barcha variantlar uchun: rasmlarni siqish, Word (.docx) va HTML (MathML) yaratish."""
import os, re, json, glob, subprocess, sys
from PIL import Image
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.shared import Pt

OUT = "out"
SITE = "../hgi-2"
REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ref.docx")


def compress(png):
    im = Image.open(png).convert("RGB")
    q = im.quantize(colors=48, method=Image.Quantize.MEDIANCUT)
    q.save(png, optimize=True)


def fix_docx(src, dst):
    d = Document(src)
    for p in d.paragraphs:
        if p._p.findall('.//' + qn('w:drawing')):
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for t in d.tables:
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        tblPr = t._tbl.tblPr
        b = OxmlElement('w:tblBorders')
        for e in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            x = OxmlElement('w:' + e); x.set(qn('w:val'), 'single'); x.set(qn('w:sz'), '6'); x.set(qn('w:color'), '000000'); b.append(x)
        old = tblPr.find(qn('w:tblBorders'))
        if old is not None:
            tblPr.remove(old)
        tblPr.append(b)
        for i, row in enumerate(t.rows):
            for c in row.cells:
                for p in c.paragraphs:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for r in p.runs:
                        r.font.size = Pt(12)
                        if i == 0:
                            r.font.bold = True
    d.save(dst)


def main(vs):
    os.makedirs(f"{SITE}/v", exist_ok=True)
    os.makedirs(f"{SITE}/word", exist_ok=True)
    data = {}
    for v in vs:
        for png in glob.glob(f"{OUT}/img/{v}/*.png"):
            compress(png)
        md = f"{OUT}/{v}.md"
        raw = f"{OUT}/{v}_raw.docx"
        subprocess.run(["pandoc", md, "-o", raw, f"--reference-doc={REF}", f"--resource-path={OUT}"], check=True)
        dst = f"{SITE}/word/HGI-2_{v}-variant.docx"
        fix_docx(raw, dst)
        subprocess.run(["zip", "-q", "-d", dst, "*/"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # HTML fragment (sarlavha blokisiz)
        body = subprocess.run(["pandoc", md, "-t", "html5", "--mathml", "--wrap=none"], check=True,
                              capture_output=True, text=True).stdout
        body = body.replace('src="img/', 'src="v/img/')
        body = re.sub(r'<mn>(\d+)</mn>\s*<mo>,</mo>\s*<mn>(\d+)</mn>', r'<mn>\1,\2</mn>', body)
        body = re.sub(r'<mn>(\d+)</mn>\s*<mo>,</mo>\s*<msup><mn>(\d+)</mn>', r'<msup><mn>\1,\2</mn>', body)
        body = re.sub(r'<p><strong>Fan:</strong>.*?</p>\s*', '', body, flags=re.S)
        open(f"{SITE}/v/{v}.html", "w").write(body)
        os.makedirs(f"{SITE}/v/img/{v}", exist_ok=True)
        for png in glob.glob(f"{OUT}/img/{v}/*.png"):
            subprocess.run(["cp", png, f"{SITE}/v/img/{v}/"], check=True)
        data[v] = json.load(open(f"{OUT}/{v}.json"))
        print("ok", v, os.path.getsize(dst) // 1024, "KB")
    old = {}
    if os.path.exists(f"{SITE}/data.json"):
        old = json.load(open(f"{SITE}/data.json"))
    old.update({str(k): v for k, v in data.items()})
    json.dump(old, open(f"{SITE}/data.json", "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    vs = [int(x) for x in sys.argv[1:]] or list(range(1, 31))
    main(vs)
