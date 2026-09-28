"""data/*.json fayllarini data/data-bundle.js ga yig'adi.

Sayt index.html ni to'g'ridan-to'g'ri (file://) ochganda brauzer fetch() ga ruxsat bermaydi,
shuning uchun app.js zaxira sifatida shu faylni ishlatadi. JSON fayllarni tahrirlagandan
keyin qayta ishga tushiring:

    python tools/bundle_data.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
FILES = {
    "wires": "wires.json",
    "transformers": "transformers.json",
    "regulation": "voltage-regulation.json",
    "tau": "tm-tau-table.json",
    "schemas": "schemas.json",
}

bundle = {key: json.loads((DATA / name).read_text(encoding="utf-8")) for key, name in FILES.items()}
out = DATA / "data-bundle.js"
out.write_text(
    "// AVTOMATIK YARATILGAN — tahrirlamang. Manba: data/*.json (python tools/bundle_data.py)\n"
    "window.KURS_DATA = " + json.dumps(bundle, ensure_ascii=False) + ";\n",
    encoding="utf-8",
)
print(f"Yozildi: {out} ({out.stat().st_size} bayt)")
