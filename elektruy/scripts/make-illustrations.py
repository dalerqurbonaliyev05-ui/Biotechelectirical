#!/usr/bin/env python3
"""Generates the built-in lesson illustrations (simple SVG line art) into
app/assets/illustrations/. Admins can replace any step picture with a photo in
the admin panel; these are the offline defaults. Wire colours follow the app:
phase brown, switched phase red, neutral blue, protective earth yellow-green."""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "app" / "assets" / "illustrations"
L, LS, N, PE, PE2, INK, MUTED, RED, OK = "#8B4513", "#D32F2F", "#1E63D6", "#7CB342", "#F2C200", "#263238", "#90A4AE", "#E53935", "#2E7D32"


def svg(body: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">'
        '<rect width="320" height="200" rx="16" fill="#F5F8FA"/>' + body + "</svg>\n"
    )


def wire(x1, y1, x2, y2, c, w=6):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'


def pe(x1, y1, x2, y2):
    return wire(x1, y1, x2, y2, PE, 6) + f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{PE2}" stroke-width="6" stroke-dasharray="6 6" stroke-linecap="butt"/>'


def text(x, y, t, size=18, c=INK, anchor="middle", weight="bold"):
    return f'<text x="{x}" y="{y}" font-family="sans-serif" font-size="{size}" font-weight="{weight}" fill="{c}" text-anchor="{anchor}">{t}</text>'


def lamp(cx, cy, r=22):
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#FFF8E1" stroke="{INK}" stroke-width="4"/>'
        f'<line x1="{cx-r*0.7}" y1="{cy-r*0.7}" x2="{cx+r*0.7}" y2="{cy+r*0.7}" stroke="{INK}" stroke-width="3"/>'
        f'<line x1="{cx-r*0.7}" y1="{cy+r*0.7}" x2="{cx+r*0.7}" y2="{cy-r*0.7}" stroke="{INK}" stroke-width="3"/>'
    )


def switch(x, y, label="S"):
    return (
        f'<circle cx="{x}" cy="{y}" r="6" fill="{INK}"/><circle cx="{x+50}" cy="{y}" r="6" fill="{INK}"/>'
        f'<line x1="{x}" y1="{y}" x2="{x+42}" y2="{y-22}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
        + text(x + 25, y - 30, label, 16)
    )


def breaker(x, y, on=False):
    lever_y = y + 18 if not on else y - 18
    return (
        f'<rect x="{x}" y="{y-50}" width="70" height="100" rx="8" fill="#ECEFF1" stroke="{INK}" stroke-width="4"/>'
        f'<rect x="{x+22}" y="{y-20}" width="26" height="40" rx="4" fill="#CFD8DC" stroke="{INK}" stroke-width="3"/>'
        f'<rect x="{x+25}" y="{lever_y-8}" width="20" height="16" rx="3" fill="{OK if not on else RED}"/>'
        + text(x + 35, y + 40, "OFF" if not on else "ON", 14, OK if not on else RED)
    )


def socket(x, y, s=70):
    return (
        f'<rect x="{x}" y="{y}" width="{s}" height="{s}" rx="12" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>'
        f'<circle cx="{x+s/2}" cy="{y+s/2}" r="{s*0.32}" fill="#ECEFF1" stroke="{INK}" stroke-width="3"/>'
        f'<circle cx="{x+s/2-s*0.14}" cy="{y+s/2}" r="5" fill="{INK}"/><circle cx="{x+s/2+s*0.14}" cy="{y+s/2}" r="5" fill="{INK}"/>'
    )


def cross(x, y, c=RED):
    return f'<circle cx="{x}" cy="{y}" r="22" fill="none" stroke="{c}" stroke-width="5"/><line x1="{x-15}" y1="{y-15}" x2="{x+15}" y2="{y+15}" stroke="{c}" stroke-width="5"/>'


def tick(x, y):
    return f'<circle cx="{x}" cy="{y}" r="20" fill="{OK}"/><polyline points="{x-9},{y} {x-2},{y+8} {x+10},{y-7}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'


ART = {
    "breaker_off": breaker(60, 100) + breaker(150, 100) + breaker(240, 100) + tick(275, 40),
    "switch_off": f'<rect x="120" y="40" width="80" height="120" rx="12" fill="#fff" stroke="{INK}" stroke-width="4"/><rect x="135" y="55" width="50" height="90" rx="6" fill="#ECEFF1" stroke="{INK}" stroke-width="3"/><line x1="135" y1="100" x2="185" y2="125" stroke="{INK}" stroke-width="3"/>' + text(160, 185, "0", 22),
    "warning_sign": f'<polygon points="160,25 270,175 50,175" fill="#FFD54F" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>' + text(160, 145, "!", 80) + f'<path d="M165 70 l-18 38 h16 l-12 34" fill="none" stroke="{RED}" stroke-width="5"/>',
    "voltage_tester": f'<rect x="40" y="88" width="190" height="26" rx="12" fill="#FFCA28" stroke="{INK}" stroke-width="4"/><rect x="230" y="96" width="60" height="10" fill="{MUTED}" stroke="{INK}" stroke-width="3"/><circle cx="110" cy="101" r="8" fill="{RED}"/><rect x="28" y="92" width="14" height="18" rx="4" fill="{INK}"/>' + text(160, 160, "~ 220 V ?", 22, RED),
    "multimeter": f'<rect x="100" y="20" width="120" height="160" rx="14" fill="#FFB300" stroke="{INK}" stroke-width="4"/><rect x="115" y="35" width="90" height="40" rx="6" fill="#CFD8DC" stroke="{INK}" stroke-width="3"/>' + text(160, 63, "0.00", 20) + f'<circle cx="160" cy="115" r="24" fill="#ECEFF1" stroke="{INK}" stroke-width="3"/><line x1="160" y1="115" x2="174" y2="97" stroke="{INK}" stroke-width="4"/>' + text(160, 168, "V~", 16) + wire(130, 180, 60, 190, INK, 5) + wire(190, 180, 260, 190, RED, 5),
    "tools": f'<rect x="40" y="40" width="22" height="80" rx="8" fill="{RED}" stroke="{INK}" stroke-width="3"/><rect x="47" y="120" width="8" height="50" fill="{MUTED}"/><rect x="110" y="40" width="22" height="80" rx="8" fill="#FFCA28" stroke="{INK}" stroke-width="3"/><rect x="117" y="120" width="8" height="50" fill="{MUTED}"/><path d="M200 40 l30 90 l-20 40 M260 40 l-30 90 l20 40" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M200 40 l30 90 M260 40 l-30 90" fill="none" stroke="{RED}" stroke-width="10" stroke-linecap="round" opacity=".7"/>' + text(160, 190, "1000 V", 16),
    "wire_colors": wire(60, 50, 260, 50, L, 12) + text(40, 57, "L", 20, L) + wire(60, 100, 260, 100, N, 12) + text(40, 107, "N", 20, N) + pe(60, 150, 260, 150) + text(35, 157, "PE", 18, PE),
    "electrician": f'<circle cx="160" cy="70" r="34" fill="#FFE0B2" stroke="{INK}" stroke-width="4"/><path d="M122 62 q38 -50 76 0 z" fill="#FFCA28" stroke="{INK}" stroke-width="4"/><path d="M100 180 q0 -60 60 -60 q60 0 60 60 z" fill="#1E88E5" stroke="{INK}" stroke-width="4"/>' + f'<path d="M150 135 l-8 18 h10 l-6 16" fill="none" stroke="#FFEB3B" stroke-width="4"/>',
    "bulb": f'<path d="M160 30 a50 50 0 0 1 30 90 v20 h-60 v-20 a50 50 0 0 1 30 -90 z" fill="#FFF59D" stroke="{INK}" stroke-width="4"/><rect x="132" y="140" width="56" height="30" rx="4" fill="{MUTED}" stroke="{INK}" stroke-width="3"/><path d="M135 150 h50 M135 160 h50" stroke="{INK}" stroke-width="2"/>' + f'<path d="M230 70 a40 40 0 0 1 0 50" fill="none" stroke="{INK}" stroke-width="4" marker-end="none"/><polygon points="222,122 236,118 232,132" fill="{INK}"/>',
    "socket_box": f'<rect x="20" y="20" width="280" height="160" fill="#D7CCC8"/><circle cx="160" cy="100" r="62" fill="#FFF3E0" stroke="{INK}" stroke-width="4"/><circle cx="160" cy="100" r="52" fill="none" stroke="{MUTED}" stroke-width="3" stroke-dasharray="6 5"/>' + wire(130, 100, 100, 40, L, 6) + wire(160, 100, 160, 30, N, 6) + pe(190, 100, 220, 40),
    "socket_wiring": socket(125, 70, 70) + wire(140, 105, 40, 40, L, 6) + text(30, 35, "L", 18, L) + wire(180, 105, 280, 40, N, 6) + text(292, 35, "N", 18, N) + pe(160, 140, 160, 190) + text(190, 190, "PE", 16, PE),
    "switch_single": wire(20, 60, 90, 60, L, 6) + switch(90, 60, "S") + wire(140, 60, 240, 60, LS, 6) + wire(240, 60, 240, 98, LS, 6) + lamp(240, 120) + wire(240, 142, 240, 175, N, 6) + wire(20, 175, 240, 175, N, 6) + text(30, 50, "L", 16, L) + text(30, 168, "N", 16, N),
    "switch_double": wire(20, 50, 80, 50, L, 6) + wire(80, 50, 80, 100, L, 6) + switch(80, 50, "S1") + switch(80, 100, "") + wire(130, 50, 210, 50, LS, 6) + wire(130, 100, 270, 100, L, 6) + wire(210, 50, 210, 105, LS, 6) + lamp(210, 125, 18) + lamp(270, 125, 18) + wire(210, 143, 210, 178, N, 6) + wire(270, 143, 270, 178, N, 6) + wire(20, 178, 270, 178, N, 6) + text(30, 40, "L", 16, L),
    "switch_pass": wire(15, 80, 60, 80, L, 6) + f'<circle cx="60" cy="80" r="6" fill="{INK}"/><circle cx="100" cy="55" r="6" fill="{INK}"/><circle cx="100" cy="105" r="6" fill="{INK}"/><line x1="60" y1="80" x2="96" y2="58" stroke="{INK}" stroke-width="4"/>' + wire(100, 55, 200, 55, INK, 5) + wire(100, 105, 200, 105, RED, 5) + f'<circle cx="200" cy="55" r="6" fill="{INK}"/><circle cx="200" cy="105" r="6" fill="{INK}"/><circle cx="240" cy="80" r="6" fill="{INK}"/><line x1="240" y1="80" x2="204" y2="58" stroke="{INK}" stroke-width="4"/>' + wire(240, 80, 280, 80, LS, 6) + wire(280, 80, 280, 110, LS, 6) + lamp(280, 130, 18) + wire(280, 148, 280, 180, N, 6) + wire(15, 180, 280, 180, N, 6) + text(80, 40, "S1", 14) + text(220, 40, "S2", 14) + text(150, 48, "L1", 13) + text(150, 125, "L2", 13),
    "junction_box": f'<circle cx="160" cy="100" r="75" fill="#ECEFF1" stroke="{INK}" stroke-width="5"/>' + wire(85, 70, 140, 85, L, 6) + wire(85, 100, 140, 100, N, 6) + pe(85, 130, 140, 115) + wire(235, 70, 180, 85, L, 6) + wire(235, 100, 180, 100, N, 6) + pe(235, 130, 180, 115) + f'<rect x="138" y="76" width="44" height="16" rx="4" fill="#FF9800" stroke="{INK}" stroke-width="2"/><rect x="138" y="92" width="44" height="16" rx="4" fill="#FF9800" stroke="{INK}" stroke-width="2"/><rect x="138" y="108" width="44" height="16" rx="4" fill="#FF9800" stroke="{INK}" stroke-width="2"/>',
    "wago": f'<rect x="80" y="70" width="160" height="60" rx="10" fill="#ECEFF1" stroke="{INK}" stroke-width="4"/><rect x="95" y="50" width="30" height="30" rx="4" fill="#FF9800" stroke="{INK}" stroke-width="3"/><rect x="145" y="50" width="30" height="30" rx="4" fill="#FF9800" stroke="{INK}" stroke-width="3"/><rect x="195" y="50" width="30" height="30" rx="4" fill="#FF9800" stroke="{INK}" stroke-width="3"/>' + wire(110, 130, 110, 190, N, 6) + wire(160, 130, 160, 190, N, 6) + wire(210, 130, 210, 190, N, 6) + text(270, 110, "11 mm", 14, INK, "start"),
    "lamp": f'<rect x="100" y="20" width="120" height="14" fill="{MUTED}" stroke="{INK}" stroke-width="3"/>' + wire(160, 34, 160, 70, INK, 4) + f'<path d="M100 120 q60 -70 120 0 z" fill="#FFF59D" stroke="{INK}" stroke-width="4"/>' + f'<path d="M120 140 l-15 30 M160 140 v35 M200 140 l15 30" stroke="#FBC02D" stroke-width="4" stroke-linecap="round"/>',
    "lamp_wiring": f'<rect x="20" y="20" width="280" height="22" fill="{MUTED}"/>' + wire(70, 42, 70, 90, LS, 6) + wire(110, 42, 110, 90, N, 6) + pe(150, 42, 150, 90) + f'<rect x="55" y="88" width="110" height="20" rx="4" fill="#FF9800" stroke="{INK}" stroke-width="2"/>' + wire(70, 108, 200, 140, LS, 5) + wire(110, 108, 210, 150, N, 5) + lamp(240, 150, 26) + text(60, 135, "L", 16, LS) + text(105, 135, "N", 16, N),
    "cable_route": f'<rect x="20" y="15" width="280" height="170" fill="#FAFAFA" stroke="{INK}" stroke-width="3"/>' + f'<line x1="20" y1="38" x2="300" y2="38" stroke="{MUTED}" stroke-dasharray="6 6" stroke-width="2"/>' + text(250, 33, "15 cm", 12, MUTED) + wire(60, 38, 260, 38, L, 6) + wire(80, 38, 80, 120, L, 6) + f'<rect x="68" y="110" width="24" height="34" rx="4" fill="#fff" stroke="{INK}" stroke-width="3"/>' + wire(220, 38, 220, 150, L, 6) + socket(205, 145, 30) + cross(160, 110) + f'<line x1="130" y1="140" x2="190" y2="80" stroke="{L}" stroke-width="4" stroke-dasharray="6 6"/>',
    "wall_chase": f'<rect x="20" y="20" width="280" height="160" fill="#D7CCC8"/><rect x="140" y="20" width="24" height="160" fill="#8D6E63" stroke="{INK}" stroke-width="2"/>' + wire(152, 20, 152, 180, L, 8) + f'<path d="M210 60 l40 -20 l10 20 l-40 20 z" fill="{MUTED}" stroke="{INK}" stroke-width="3"/><circle cx="260" cy="50" r="10" fill="#FFCA28" stroke="{INK}" stroke-width="2"/>' + text(80, 110, "20–25", 18) + text(80, 132, "mm", 14),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, body in ART.items():
        (OUT / f"{name}.svg").write_text(svg(body), encoding="utf-8")
    print(f"wrote {len(ART)} illustrations to {OUT}")


if __name__ == "__main__":
    main()
