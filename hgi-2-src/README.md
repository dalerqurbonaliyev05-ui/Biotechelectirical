# 2-HGI generatori (Nazariy elektrotexnika)

`/hgi-2/` sahifasidagi 30 ta variant yechimi shu skriptlar bilan tayyorlangan.

- `schemes.py` — 30 ta sxema (topshiriqdagi rasmlardan ko'chirilgan) va Jadval 1 qiymatlari.
- `circuit.py` — sxema grafi: tugunlar, tarmoqlar, konturlar.
- `solver.py` — aniq (kasr) hisob: tugun potensiallari, kontur toklar, ekvivalent generator, quvvat balansi.
  Har bir variantda uch usul natijasi bir-biri bilan solishtiriladi (assert).
- `report.py` — to'liq yechim matni (markdown + LaTeX formulalar) va sxema rasmlari.
- `build.py`, `export.py` — Word (.docx), HTML (MathML) va `data.json` ni `../hgi-2/` ga yozadi.

Qayta yaratish (python3, matplotlib, python-docx, Pillow va pandoc kerak):

```
cd hgi-2-src
python3 build.py        # out/ papkaga md, json va rasmlar
python3 export.py       # ../hgi-2/word, ../hgi-2/v, ../hgi-2/data.json
```
