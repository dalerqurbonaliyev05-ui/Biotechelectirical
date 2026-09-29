/*
 * docx-builder.js — hisoblash natijalari asosida DOCX hisobot yaratish (docx.js v8, brauzerda).
 * Formulalar mini-belgilashda yoziladi: "P_{2}^{2}" → P₂² (pastki/yuqori indeks TextRun lari).
 */
(function () {
  'use strict';

  const FONT = 'Times New Roman';
  const SIZE = 28;        // 14 pt
  const SIZE_TBL = 22;    // 11 pt

  function build(r, meta) {
    const d = window.docx;
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
      HeadingLevel, PageBreak, ImageRun, Footer, PageNumber, VerticalAlign, PageOrientation
    } = d;
    const C = window.KursCalc;
    const Topo = window.KursTopology;
    const f = C.fmt;
    const n2 = (x) => f.n(x, 2);
    const n1 = (x) => f.n(x, 1);
    const n3 = (x) => f.n(x, 3);
    const cx = (s) => f.c(s.p, s.q);
    const kat = f.kat;
    const wireName = (l) => (l.n === 2 ? '2×' : '') + l.wire.marka;
    const trName = (t) => (t.n === 2 ? '2×' : '') + t.marka;
    const b = r.balance;
    const U = r.U;

    // -------------------------------------------------------------- yordamchilar
    /** mini-belgilashni TextRun larga aylantirish */
    function runs(str, base = {}) {
      const out = [];
      const re = /_\{([^}]*)\}|\^\{([^}]*)\}|\*\*([^*]+)\*\*|([^_^*]+|[_^*])/g;
      let m;
      while ((m = re.exec(String(str))) !== null) {
        if (m[1] != null) out.push(new TextRun({ ...base, text: m[1], subScript: true }));
        else if (m[2] != null) out.push(new TextRun({ ...base, text: m[2], superScript: true }));
        else if (m[3] != null) out.push(new TextRun({ ...base, text: m[3], bold: true }));
        else out.push(new TextRun({ ...base, text: m[4] }));
      }
      return out;
    }
    const P = (str, o = {}) => new Paragraph({
      alignment: o.align || AlignmentType.JUSTIFIED,
      indent: o.noIndent ? undefined : { firstLine: 709 },
      spacing: { after: o.after != null ? o.after : 60, before: o.before || 0 },
      keepNext: o.keepNext,
      children: runs(str, { bold: o.bold, italics: o.italics, size: o.size })
    });
    const FX = (str) => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: runs(str, { font: FONT })
    });
    const H1 = (t, pageBreak = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: runs(t) });
    const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(t) });
    const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: runs(t) });
    let tblNo = 0;
    function TBL(title, head, rows, opts = {}) {
      tblNo++;
      const cell = (txt, header, bold) => new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        shading: header ? { fill: 'E7EDF5' } : undefined,
        margins: { top: 40, bottom: 40, left: 70, right: 70 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: runs(txt, { size: SIZE_TBL, bold: header || bold })
        })]
      });
      const tRows = [new TableRow({ tableHeader: true, children: head.map((h) => cell(h, true)) })];
      rows.forEach((row) => tRows.push(new TableRow({ children: row.map((c) => cell(c, false)) })));
      if (opts.foot) tRows.push(new TableRow({ children: opts.foot.map((c) => cell(c, false, true)) }));
      return [
        new Paragraph({ alignment: AlignmentType.RIGHT, keepNext: true, spacing: { before: 120, after: 0 }, children: runs(`${tblNo}-jadval`, { italics: true, size: 24 }) }),
        new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 60 }, children: runs(title, { bold: true, size: 24 }) }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tRows }),
        new Paragraph({ spacing: { after: 60 }, children: [] })
      ];
    }

    const schema = meta.schema;
    const inp = r.input;
    const variantLabel = inp.variant + (inp.variantModified ? ' (qiymatlar tahrirlangan)' : '');
    const lineOf = (p) => r.lines.find((l) => l.pst === p);
    const hl6 = r.lines.find((l) => l.id === 'HL-6');
    const year = new Date().getFullYear();

    // ============================================================== SARLAVHA VARAG'I
    const title = [];
    const C_ = (t, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: o.before || 0, after: o.after || 0 }, children: runs(t, { bold: o.bold, size: o.size, allCaps: o.caps }) });
    title.push(C_("O'ZBEKISTON RESPUBLIKASI OLIY TA'LIM, FAN VA INNOVATSIYALAR VAZIRLIGI", { bold: true, size: 26 }));
    title.push(C_('ISLOM KARIMOV NOMIDAGI TOSHKENT DAVLAT TEXNIKA UNIVERSITETI', { bold: true, size: 26, before: 120 }));
    title.push(C_('Energetika fakulteti', { before: 240 }));
    title.push(C_('«Elektr ta\'minoti tizimida elektr tarmoqlari» fanidan', { before: 1600, size: 30 }));
    title.push(C_('KURS LOYIHASI', { bold: true, size: 44, before: 240 }));
    title.push(C_('Mavzu: Mintaqaviy elektr tarmog\'ini loyihalash (radial variant)', { before: 240, size: 28 }));
    title.push(C_(`Sxema № ${inp.schemaNum}, variant ${variantLabel}`, { before: 120, size: 28, bold: true }));
    const sign = (label, val) => new Paragraph({
      alignment: AlignmentType.LEFT, indent: { left: 5100 }, spacing: { after: 80 },
      children: [new TextRun({ text: label + ' ', bold: true }), new TextRun({ text: val })]
    });
    title.push(new Paragraph({ spacing: { before: 1600 }, children: [] }));
    title.push(sign('Bajardi:', meta.student));
    if (meta.group) title.push(sign('Guruh:', meta.group));
    title.push(sign('Qabul qildi:', meta.teacher || '____________________'));
    title.push(C_(`Toshkent – ${year}`, { before: 1800, bold: true }));

    // ============================================================== KIRISH
    const intro = [];
    intro.push(H1('Kirish', false));
    intro.push(P("Elektr energetikasi mamlakat iqtisodiyotining asosiy tarmoqlaridan biri bo'lib, sanoat, qishloq xo'jaligi, transport va maishiy iste'molchilarni ishonchli va sifatli elektr energiyasi bilan ta'minlash vazifasini bajaradi. Elektr energiyasini ishlab chiqaruvchi stansiyalardan iste'molchilargacha yetkazib berishda elektr tarmoqlari hal qiluvchi o'rin tutadi."));
    intro.push(P("Kurs loyihasining maqsadi — berilgan elektr stansiya va iste'molchi podstansiyalarini o'zaro hamda energotizim bilan bog'lovchi mintaqaviy elektr tarmog'ini loyihalash: aktiv va reaktiv quvvat balansini tuzish, nominal kuchlanishni tanlash, havo liniyalari simlarining kesim yuzasini va podstansiya transformatorlarini tanlash, tarmoqdagi quvvat va elektr energiya isroflarini aniqlash hamda iste'molchilar shinasidagi kuchlanishni rostlash choralarini belgilash."));
    intro.push(P(`Loyihalashda tarmoqning ochiq (radial-magistral) variantlari ko'rib chiqiladi: podstansiyalar elektr stansiya shinasidan to'g'ridan-to'g'ri yoki boshqa podstansiyalar orqali ta'minlanadi va jami ekvivalent uzunligi eng kichik texnik jihatdan yaroqli variant tanlanadi. Quyi oqimida I kategoriyali iste'molchi bo'lgan uchastkalar uchun ikki zanjirli liniyalar${r.opts.lineKat2 === 2 ? ' (II kategoriya uchun ham)' : ''} va ikki transformatorli podstansiyalar${r.opts.trafoKat2 === 2 ? ' (II kategoriya uchun ham)' : ''} qabul qilinadi. Hisob ToshDTU «Elektr ta'minoti tizimida elektr tarmoqlar» fanidan kurs loyihasini bajarish uchun uslubiy qo'llanma (2014) bo'yicha bajarilgan.`));
    intro.push(H2('Loyihalash uchun dastlabki ma\'lumotlar'));
    intro.push(P(`Manba: ${inp.manba}, generatorlar ${inp.generatorsText.replace(/x/gi, '×')} MVt (jami ${n1(r.P_st)} MVt), cosφ_{manba} = ${inp.cosManba}.`));
    intro.push(...TBL("Podstansiyalar yuklamalari", ['p/st', 'P, MVt', 'Kategoriya', 'cosφ', 'W, 10^{6} kVt·soat', 'T_{m}, soat'],
      C.PST.map((p) => { const l = r.loads[p]; return [p, n1(l.P), kat(l.kat), n2(l.cos), n1(l.W), f.i(l.Tm)]; })));
    // masofalar matritsasi: faqat ulanishi mumkin bo'lgan (masofasi berilgan) juftliklar
    const nodeName = (x) => (x === 'M' ? inp.manba : x === 'S' ? 'Sistema' : 'p/st ' + x);
    const pairs = Object.entries(inp.dist || {}).filter(([, v]) => v > 0)
      .map(([k, v]) => { const [a, b2] = k.split('-'); return [nodeName(a), nodeName(b2), n1(v)]; });
    intro.push(...TBL('Tugunlar orasidagi masofalar (ulanishi mumkin bo\'lgan juftliklar)', ['Tugun', 'Tugun', 'l, km'], pairs));

    // ============================================================== 1. BALANS
    const s1 = [];
    s1.push(H1('1. Aktiv va reaktiv quvvat balansi'));
    s1.push(H2('1.1. Aktiv quvvat balansi'));
    s1.push(P("Aktiv quvvat balansi elektr stansiyasi ishlab chiqaradigan quvvatning iste'molchilar yuklamasini, stansiyaning xususiy ehtiyojlarini va tarmoqdagi isroflarni qoplashga yetarliligini tekshirish uchun tuziladi."));
    s1.push(P("Podstansiyalarning umumiy aktiv yuklamasi:", { keepNext: true }));
    s1.push(FX(`ΣP_{yuk} = P_{A} + P_{B} + P_{C} + P_{D} + P_{E} = ${C.PST.map((p) => n1(r.loads[p].P)).join(' + ')} = ${n2(b.sumP)} MVt`));
    s1.push(P(`Stansiyaning xususiy ehtiyojlari generatorlar quvvatidan olinadi (GES — 1%, IES — 8%, DIES — 3–5%; ${inp.manba} uchun k_{xus} = ${f.n(b.kx * 100, 1)}%):`, { keepNext: true }));
    s1.push(FX(`P_{xus} = ΣP_{gen}·k_{xus} = ${n2(b.P_st)}·${f.n(b.kx, 3)} = ${n2(b.P_xus)} MVt`));
    s1.push(P(`Hisob boshida isrofning aniq qiymati noma'lum bo'lgani uchun tarmoqdagi aktiv quvvat isrofi yuklamalar yig'indisining ${r.opts.dPtarPct}% (6–10% oralig'ida) miqdorida qabul qilinadi:`, { keepNext: true }));
    s1.push(FX(`ΔP_{tar} = ${f.n(r.opts.dPtarPct / 100, 2)}·ΣP_{yuk} = ${f.n(r.opts.dPtarPct / 100, 2)}·${n2(b.sumP)} = ${n2(b.dP_tar)} MVt`));
    s1.push(P('Stansiyaning o\'rnatilgan quvvati:', { keepNext: true }));
    s1.push(FX(`ΣP_{st} = ${r.gens.map((g) => f.n(g, 0)).join(' + ')} = ${n2(b.P_st)} MVt`));
    s1.push(P('Quvvat zaxirasi (energotizim bilan almashinuv):', { keepNext: true }));
    s1.push(FX(`P_{rez} = ΣP_{st} − (ΣP_{yuk} + P_{xus} + ΔP_{tar}) = ${n2(b.P_st)} − (${n2(b.sumP)} + ${n2(b.P_xus)} + ${n2(b.dP_tar)}) = ${n2(b.P_rez)} MVt`));
    s1.push(P(b.P_rez >= 0
      ? `P_{rez} > 0 — stansiya quvvati yetarli, ortiqcha ${n2(b.P_rez)} MVt quvvat HL-6 liniyasi orqali energotizimga uzatiladi.`
      : `P_{rez} < 0 — stansiya quvvati yetarli emas, yetishmayotgan ${n2(-b.P_rez)} MVt quvvat HL-6 liniyasi orqali energotizimdan olinadi.`));

    s1.push(H2('1.2. Reaktiv quvvat balansi'));
    s1.push(P('Har bir podstansiyaning reaktiv yuklamasi Q_{i} = P_{i}·tg(arccos φ_{i}) formula bo\'yicha aniqlanadi:', { keepNext: true }));
    s1.push(...TBL("Podstansiyalarning reaktiv yuklamalari", ['p/st', 'P, MVt', 'cosφ', 'tgφ', 'Q, MVAr', 'S, MVA'],
      C.PST.map((p) => { const l = r.loads[p]; return [p, n2(l.P), n2(l.cos), n3(l.tg), n2(l.Q), n2(l.S)]; }),
      { foot: ['Σ', n2(b.sumP), '', '', n2(b.sumQ), ''] }));
    s1.push(FX(`Q_{xus} = P_{xus}·tgφ_{manba} = ${n2(b.P_xus)}·${n3(b.tgM)} = ${n2(b.Q_xus)} MVAr`));
    s1.push(P(`Tarmoqdagi reaktiv quvvat isrofi: transformatorlar po'lat o'zagidagi isrof ΣP_{yuk} ning ${r.opts.dQpulPct}% i, liniya va cho'lg'amlardagi isrof 3·ΔP_{tar}:`, { keepNext: true }));
    s1.push(FX(`ΔQ_{po'l} = ${f.n(r.opts.dQpulPct / 100, 2)}·${n2(b.sumP)} = ${n2(b.dQ_pul)} MVAr;   ΔQ_{M} = 3·${n2(b.dP_tar)} = ${n2(b.dQ_M)} MVAr`));
    s1.push(FX(`ΔQ_{tar} = ΔQ_{po'l} + ΔQ_{M} = ${n2(b.dQ_pul)} + ${n2(b.dQ_M)} = ${n2(b.dQ_tar)} MVAr`));
    s1.push(P(`Liniyalarning zaryad quvvati (${U} kV uchun q_{0} ≈ ${b.qkm} MVAr/km, Σ(l_{i}·n_{i}) = ${f.n(b.sumLn, 0)} km):`, { keepNext: true }));
    s1.push(FX(`Q_{zar} = ${b.qkm}·${f.n(b.sumLn, 0)} = ${n2(b.Q_zar)} MVAr`));
    s1.push(FX(`Q_{gen} = ΣP_{st}·tgφ_{manba} = ${n2(b.P_st)}·${n3(b.tgM)} = ${n2(b.Q_gen)} MVAr`));
    s1.push(FX(`Q_{rez} = Q_{gen} + Q_{zar} − ΣQ_{yuk} − Q_{xus} − ΔQ_{tar} = ${n2(b.Q_gen)} + ${n2(b.Q_zar)} − ${n2(b.sumQ)} − ${n2(b.Q_xus)} − ${n2(b.dQ_tar)} = ${n2(b.Q_rez)} MVAr`));
    if (b.compensation) {
      s1.push(P(`Q_{rez} < 0 — tarmoqda ${n2(b.compensation.Qdef)} MVAr reaktiv quvvat yetishmaydi. Uni sistemadan olish iqtisodiy jihatdan maqbul emas (qo'shimcha isroflar, kuchlanishni rostlash qiyinlashadi), shuning uchun podstansiyalarning PK tomonida kompensatsiyalovchi qurilmalar o'rnatiladi. Ular reaktiv yuklamaga proporsional taqsimlanadi (${b.compensation.unit.marka}, ${b.compensation.unit.Q_MVAr} MVAr):`));
      s1.push(...TBL('Kompensatsiya qurilmalarining taqsimoti', ['p/st', 'Q_{k}, MVAr', 'Batareyalar soni'],
        b.compensation.perPst.map((c) => [c.pst, n2(c.Qk), String(c.count)])));
    } else {
      s1.push(P(`Q_{rez} = ${n2(b.Q_rez)} MVAr > 0 — tarmoqda reaktiv quvvat ortiqcha. Bunday holda stansiyada reaktiv quvvat ishlab chiqarish kamaytiriladi, ya'ni generatorlarning cosφ i ko'tariladi; uning aniq qiymati 4.1-bo'limda sistema bilan bog'lovchi liniyada cosφ ≥ ${r.opts.cosTieMin} sharti bo'yicha aniqlanadi.`));
    }

    // ============================================================== 2. TARMOQ SXEMASI VARIANTLARI (qo'llanma 4-bob)
    const sT = [];
    const tp = r.topo;
    const sig = (parent) => Topo.signature(parent, C.PST, 'M');
    const sigLong = (parent) => C.PST.map((p) => `${p} ← ${parent[p] === 'M' ? inp.manba : parent[p]}`).join(', ');
    sT.push(H1('2. Tarmoq sxemasi variantlarini tanlash'));
    sT.push(P("Loyihalanayotgan tuman uchun elektr ta'minoti sxemasining variantlari tuziladi. Bunda I kategoriya iste'molchilarini uzluksiz ta'minlash, ta'mirlash va zaxira quvvat oqimi uchun qulaylik, ishlatiladigan material va uskunalar sonini kamaytirish, sxemani soddalashtirish talablariga amal qilinadi. Texnik jihatdan bir-biriga yaqin variantlardan liniyalarning umumiy (ekvivalent) uzunligi eng kichigi qoldiriladi (qo'llanma, 4-bob)."));
    sT.push(P(`Manba va 5 ta podstansiya uchun barcha ochiq (daraxt ko'rinishidagi) ulanish variantlari sanab chiqildi: nazariy jihatdan ${tp.stats.theoretical} ta, berilgan masofalar bilan ${tp.stats.withDistances} tasi mumkin. Har bir variant uchun uchastkalardagi tranzit quvvat, zanjirlar soni, sim kesimi (tojlanish va avariyadan keyingi qizish bilan) va manbadan eng uzoq podstansiyagacha kuchlanish yo'qotilishi tekshirildi: normal rejimda ΔU ≤ ${tp.limits.dUmaxNorm}%, avariyadan keyingi rejimda ΔU ≤ ${tp.limits.dUmaxAv}%.`));
    sT.push(FX('L_{ekv} = Σ l_{i}·n_{i}  →  min'));
    const tv = tp.variants.filter((v) => v.evaluated && v.dP != null).slice(0, 4);
    sT.push(...TBL("Ko'rib chiqilgan eng yaxshi variantlar", ['№', 'Topologiya (p/st ← qayerdan)', 'Uchastkalar (n×sim, l)', 'L_{ekv}, km', 'ΔP, MVt', 'ΔU_{max}, %', 'Natija'],
      tv.map((v, i) => [String(i + 1), sig(v.parent), (v.edges || []).map((e) => `${e.from === 'M' ? 'M' : e.from}–${e.to}: ${e.n}×${e.wire}, ${n1(e.l)}`).join('; '),
        n1(v.Lekv), n2(v.dP), n1(v.dUmax), v.key === tp.best.key ? 'tanlangan' : v.ok ? 'yaroqli' : 'yaroqsiz: ' + (v.reasons || []).join('; ')])));
    if (tp.rejectSummary && tp.rejectSummary.length) {
      sT.push(P(`Texnik cheklovlardan o'tmagan variantlar: ${tp.rejectSummary.map((g) => `${g.kind.toLowerCase()} — ${g.count} ta`).join(', ')}. Masalan, ${tp.rejectSummary.map((g) => `${sig(g.example.parent)}: ${g.example.reason}`).slice(0, 2).join('; ')}.`));
    }
    const bst = tp.best;
    const second = tv.find((v) => v.ok && v.key !== bst.key);
    sT.push(P(`**Xulosa:** ${tp.noneValid ? 'birorta variant barcha cheklovlardan o\'tmagani uchun kuchlanish yo\'qotilishi eng kichik variant olindi; ' : ''}eng kichik ekvivalent uzunlikka ega yaroqli variant — ${sigLong(bst.parent)} (L_{ekv} = ${n1(bst.Lekv)} km, ΔP = ${n2(bst.dP)} MVt, ΔU_{max} = ${n1(bst.dUmax)}%).` +
      (second ? ` Keyingi variant (${sig(second.parent)}) bilan farq L_{ekv} bo'yicha ${n1((second.Lekv - bst.Lekv) / bst.Lekv * 100)}%, ΔP bo'yicha ${n1((second.dP - bst.dP) / bst.dP * 100)}%; L_{ekv} lari 5% dan kam farq qilsa, quvvat isrofi kichigi tanlanadi.` : '')));
    if (tp.used === 'mine' && tp.mine) {
      const m = tp.mine, cp = tp.compare;
      sT.push(P(`Hisob talaba tomonidan taklif qilingan variant bo'yicha bajariladi: ${sigLong(m.parent)} (L_{ekv} = ${n1(m.Lekv)} km, ΔP = ${n2(m.dP)} MVt, ΔU_{max} = ${n1(m.dUmax)}%${m.ok ? '' : ' — texnik cheklovlardan o\'tmaydi: ' + m.reasons.join('; ')}).` +
        (cp && !cp.same ? ` U optimal variantdan L_{ekv} bo'yicha ${cp.dLekvPct >= 0 ? '+' : ''}${n1(cp.dLekvPct)}%, ΔP bo'yicha ${cp.dPPct >= 0 ? '+' : ''}${n1(cp.dPPct)}% farq qiladi.` : ' U optimal variant bilan bir xil.')));
    } else {
      sT.push(P(`Keyingi hisoblar tanlangan variant bo'yicha bajariladi. Liniyalar daraxt bo'yicha raqamlanadi: ${r.lines.filter((l) => l.pst).map((l) => l.name).join(', ')}.`));
    }

    // ============================================================== 3. TANLANGAN VARIANT
    const s2 = [];
    s2.push(H1('3. Tanlangan variantning elektr hisobi'));
    s2.push(H2('3.1. Nominal kuchlanishni tanlash'));
    s2.push(P('Liniyalarning ratsional nominal kuchlanishi quyidagi formula bo\'yicha aniqlanadi:', { keepNext: true }));
    s2.push(FX('U_{hisob} = 4.34·√(l + 0.016·P),  kV'));
    s2.push(P('bu yerda l — uchastka uzunligi, km; P — uchastkadan uzatiladigan (tranzit) quvvat, kVt. Formula bitta zanjir uchun berilgan, shuning uchun ikki zanjirli liniyalarda bir zanjir quvvati P/n olinadi. Sistema bilan bog\'lovchi liniya uchun maksimal va minimal rejimlardagi oqimning kattasi olinadi. Butun tarmoq bitta kuchlanishda bo\'ladi — eng katta hisobiy qiymat bo\'yicha.'));
    s2.push(...TBL('Nominal kuchlanishni tanlash', ['Liniya', 'l, km', 'n', 'P, MVt', 'P/n, MVt', 'U_{hisob}, kV', 'Standart, kV'],
      r.voltage.map((v) => [v.name, n1(v.l), String(v.n), n2(v.Ptot), n2(v.P), n2(v.Uh), String(v.Ustd)])));
    s2.push(P(`Hisob natijalariga ko'ra (tavsiya ${r.U_rec} kV) barcha liniyalar uchun nominal kuchlanish **U_{nom} = ${U} kV** qabul qilinadi.${r.autoRaised ? ` ${r.autoRaised.from.join(', ')} kV da simning hisobiy kesim yuzasi standart qatordan chiqib ketgani sababli kuchlanish ${U} kV gacha oshirildi.` : ''}`));

    s2.push(H2('3.2. Havo liniyalari simlarini tanlash va parametrlarini aniqlash'));
    s2.push(P('Simlarning kesim yuzasi tokning iqtisodiy zichligi bo\'yicha tanlanadi, toj razryadiga hamda normal va avariyadan keyingi rejimlarda ruxsat etilgan tok bo\'yicha tekshiriladi. Maksimal yuklamadan foydalanish vaqti T_{m} = W·10^{3}/P formula bilan aniqlanadi; T_{m} ga qarab tokning iqtisodiy zichligi j_{iqt} olinadi (O\'rta Osiyo uchun: 1000–3000 soat — 1.5; 3000–5000 soat — 1.4; 5000–8760 soat — 1.3 A/mm^{2}). 110 kV da 70 mm^{2} dan, 220 kV da 240 mm^{2} dan katta simlar tojlanmaydi.'));
    r.lines.forEach((l) => {
      s2.push(H3(`${l.name} liniyasi${l.pst ? '' : ' (energotizim bilan bog\'lovchi)'}`));
      if (l.pst) {
        const subs = l.sub.map((q) => r.loads[q]);
        const hasI = subs.some((q) => q.kat === 1);
        if (subs.length === 1) {
          const ld = subs[0];
          s2.push(P(`Uchastka faqat p/st ${l.pst} ni ta'minlaydi; u ${kat(ld.kat)} kategoriyali, shuning uchun ${l.n === 2 ? 'metall tayanchlarda joylashgan ikkita alohida parallel (ikki zanjirli)' : 'bir zanjirli'} liniya qabul qilinadi (n = ${l.n}).`));
          s2.push(FX(`S = P/cosφ = ${n2(ld.P)}/${n2(ld.cos)} = ${n2(l.S)} MVA`));
          s2.push(FX(`T_{m} = W·10^{3}/P = ${n1(ld.W)}·10^{3}/${n2(ld.P)} = ${f.i(l.Tm)} soat  →  j_{iqt} = ${l.j} A/mm^{2}`));
        } else {
          s2.push(P(`Uchastka orqali ${l.sub.map((q) => 'p/st ' + q).join(', ')} ta'minlanadi (tranzit). Quyi oqimda ${hasI ? 'I kategoriyali iste\'molchi bor, shuning uchun ikki zanjirli' : (l.n === 2 ? 'II kategoriyali iste\'molchi bor, sozlamaga ko\'ra ikki zanjirli' : 'I kategoriyali iste\'molchi yo\'q, shuning uchun bir zanjirli')} liniya qabul qilinadi (n = ${l.n}).`));
          s2.push(FX(`S = |ΣP_{i} + jΣQ_{i}| = |${n2(l.P)} + j${n2(l.Q)}| = ${n2(l.S)} MVA`));
          s2.push(FX(`T_{m.o'rt} = Σ(P_{i}·T_{m.i})/ΣP_{i} = (${subs.map((q) => `${n1(q.P)}·${f.i(q.Tm)}`).join(' + ')})/${n2(l.P)} = ${f.i(l.Tm)} soat  →  j_{iqt} = ${l.j} A/mm^{2}`));
        }
      } else {
        const m = l.modes;
        s2.push(P(`HL-6 ikki zanjirli liniya. Undan tarmoqning maksimal, minimal va avariyadan keyingi rejimlarida har xil quvvat o'tadi; oqimlar stansiya shinasi balansidan (4.1-bo'lim) aniqlanadi: maksimal — ${n2(m.Smax)} MVA, minimal (barcha yuklamalar ${r.opts.minLoadFactor * 100}%) — ${n2(m.Smin)} MVA, avariyadan keyingi (eng katta generator o'chgan, II va III kategoriya yuklamalari ${r.opts.avLoadFactor * 100}%) — ${n2(m.Sav)} MVA. Kesim yuza maksimal rejim bo'yicha (S = ${n2(l.S)} MVA) aniqlanadi; sistema bilan bog'lovchi liniya uchun T_{m} = ${f.i(l.Tm)} soat → j_{iqt} = ${l.j} A/mm^{2}.`));
      }
      s2.push(FX(`I_{max} = S·10^{3}/(√3·U_{nom}·n) = ${n2(l.S)}·10^{3}/(√3·${U}·${l.n}) = ${f.i(l.I_max)} A`));
      s2.push(FX(`F_{hisob} = I_{max}/j_{iqt} = ${f.i(l.I_max)}/${l.j} = ${n1(l.F_calc)} mm^{2}`));
      const note = l.F_calc < l.minF
        ? ` (toj razryadi sharti bo'yicha ${U} kV da minimal ruxsat etilgan kesim ${l.minF} mm^{2})`
        : ' (standart qatordan F_{hisob} dan katta eng yaqin kesim)';
      s2.push(P(`Qabul qilinadi: **${wireName(l)}**${note}${l.increasedForHeating ? `; iqtisodiy kesim bo'yicha ${l.econ} chiqqan edi, qizish sharti bajarilmagani uchun kattaroq kesim olindi` : ''}.`));
      if (l.pst && l.n === 2) {
        s2.push(FX(`I_{av} = S·10^{3}/(√3·U_{nom}) = ${n2(l.S)}·10^{3}/(√3·${U}) = ${f.i(l.I_heat)} A ${l.heatOk ? '<' : '>'} I_{ruh} = ${l.wire.Iruh} A`));
      } else if (!l.pst) {
        s2.push(FX(`I_{av} = max(S_{max}/(√3·U), S_{min}/(2√3·U), S_{av}/(2√3·U))·10^{3} = ${f.i(l.I_heat)} A ${l.heatOk ? '<' : '>'} I_{ruh} = ${l.wire.Iruh} A`));
      } else {
        s2.push(FX(`I_{max} = ${f.i(l.I_heat)} A ${l.heatOk ? '<' : '>'} I_{ruh} = ${l.wire.Iruh} A`));
      }
      s2.push(P(`Qizish sharti ${l.heatOk ? 'bajariladi' : 'bajarilmaydi'}. Liniya parametrlari (r_{0} = ${n3(l.wire.r0)} Om/km, x_{0} = ${n3(l.wire.x0)} Om/km, q_{0} = ${f.n(l.wire.q0, 4)} MVAr/km):`, { keepNext: true }));
      s2.push(FX(`R = r_{0}·l/n = ${n3(l.wire.r0)}·${n1(l.l)}/${l.n} = ${n2(l.R)} Om;   X = x_{0}·l/n = ${n3(l.wire.x0)}·${n1(l.l)}/${l.n} = ${n2(l.X)} Om`));
      s2.push(FX(`Q_{c} = q_{0}·l·n = ${f.n(l.wire.q0, 4)}·${n1(l.l)}·${l.n} = ${n2(l.Qc)} MVAr`));
    });
    s2.push(...TBL('Tanlangan simlar va liniya parametrlari', ['Liniya', 'Sim', 'l, km', 'I_{max}, A', 'I_{ruh}, A', 'R, Om', 'X, Om', 'Q_{c}, MVAr'],
      r.lines.map((l) => [l.name, wireName(l), n1(l.l), f.i(l.I_max), String(l.wire.Iruh), n2(l.R), n2(l.X), n2(l.Qc)])));
    if (meta.principalImage) s2.push(P("Tanlangan simlar, transformatorlar va yuklamalar ko'rsatilgan tarmoqning prinsipial sxemasi 1-rasmda keltirilgan."));

    s2.push(H2('3.3. Transformatorlarni tanlash'));
    s2.push(P(`Pasaytiruvchi podstansiyalarda transformatorlarning ratsional soni 2 ga teng. I kategoriyali iste'molchilar uchun transformatorlar 100% zaxirali qilib tanlanadi (S_{n} ≥ ${r.opts.kTrafoI}·S). II va III kategoriyali podstansiyalarda 2 ta transformator o'rnatilsa, har birining quvvati yuklamaning 70% iga hisoblanadi (S_{n} ≥ ${r.opts.kTrafo2}·S) — bu bitta transformator avariya holatida bo'lgan vaqt uchun kerak. Quvvati ${r.opts.kat3OneMax} MVA dan kam III kategoriyali podstansiyalarda bitta transformator o'rnatishga ruxsat etiladi (S_{n} ≥ ${r.opts.kTrafo1}·S). Pasaytiruvchi transformatorlarning nol shahobchasi 230 kV (220 kV sinf) bo'lgani afzal.`));
    C.PST.forEach((p) => {
      const t = r.trafos[p], ld = r.loads[p];
      s2.push(P(`**p/st ${p}** (${kat(ld.kat)} kategoriya, S = ${n2(ld.S)} MVA, ${t.n} ta transformator): S_{n} ≥ ${t.k}·${n2(ld.S)} = ${n2(t.Sreq)} MVA → qabul qilinadi **${trName(t)}** (k_{yuk} = ${n2(t.kz)}${t.kAv != null ? `, bittasi o'chganda k_{av} = ${n2(t.kAv)}` : ''}).${t.note ? ' ' + t.note : ''}`));
    });
    s2.push(...TBL('Pasaytiruvchi transformatorlar parametrlari', ['p/st', 'Transformator', 'S_{n}, MVA', 'U_{YuK}, kV', 'U_{PK}, kV', 'R_{t}, Om', 'X_{t}, Om', 'ΔP_{x}, kVt', 'ΔQ_{x}, kVAr'],
      C.PST.map((p) => { const t = r.trafos[p]; return [p, trName(t), String(t.Sn), String(t.UnYuK), String(t.UnPK), n2(t.Rt), n2(t.Xt), String(t.dPpul), String(t.dQpul)]; })));
    s2.push(P(`Stansiyada har bir generator uchun blok (ko'taruvchi) transformator o'rnatiladi, uning quvvati S_{n} ≥ S_{G} = P_{G}/cosφ_{manba} shartidan tanlanadi:`));
    r.stepUps.forEach((u) => {
      s2.push(FX(`S_{G} = ${f.n(u.Pg, 0)}/${inp.cosManba} = ${n2(u.Sg)} MVA  →  ${u.count}×${u.trafo.marka} (R_{t} = ${n2(u.trafo.Rt)} Om, X_{t} = ${n2(u.trafo.Xt)} Om)`));
    });

    // ============================================================== 3. QUVVAT ISROFI
    const s3 = [];
    s3.push(H1('4. Tarmoqdagi quvvat isroflari', !meta.principalImage));
    s3.push(P(`Quvvat taqsimoti tarmoq daraxti bo'yicha oxirgi podstansiyalardan manbaga qarab (barglardan ildizga), nominal kuchlanish U_{nom} = ${U} kV bo'yicha hisoblanadi. Har bir tugunda Kirxgofning birinchi qonuni qo'llanadi: tugunga keluvchi liniya oxiridagi quvvat shu p/st transformatori kirishidagi quvvat va shu tugundan ta'minlanadigan p/st larga ketayotgan liniyalar boshidagi quvvatlar yig'indisiga teng. Parallel ishlovchi ikki transformator uchun R_{t}/2, X_{t}/2 va 2·ΔS_{x} olinadi.${meta.equivalentImage ? " Ekvivalent almashtiruv sxemasida liniyalar Π-simon, transformatorlar Γ-simon ko'rinishda tasvirlanadi; hisoblangan quvvat oqimlari, kuchlanishlar va transformatsiya koeffitsientlari 2-rasmda ko'rsatilgan." : ''}`));
    if (r.compensation) {
      const cp = r.compensation;
      s3.push(P(`Sistema bilan bog'lovchi liniyada cosφ ≥ ${r.opts.cosTieMin} ni ta'minlash uchun${cp.fromBalance ? ' (hamda reaktiv quvvat balansiga ko\'ra)' : ''} podstansiyalarning PK tomonida jami ${n2(cp.total)} MVAr kompensatsiya qurilmalari o'rnatiladi va hisob qaytadan bajariladi: ${cp.perPst.filter((c) => c.Qk > 0.005).map((c) => `${c.pst} — ${n2(c.Qk)} MVAr (${c.count}×${cp.unit.marka})`).join('; ')}. Quyida S_{yuk} kompensatsiyadan keyingi qiymat.`));
    }
    r.tree.post.forEach((p) => {
      const c = r.chains[p], ln = lineOf(p), t = r.trafos[p];
      s3.push(H3(`p/st ${p} va ${ln.name} liniyasi`));
      s3.push(FX(`S_{yuk} = ${cx(c.Syuk)} MVA`));
      s3.push(FX(`ΔP_{t} = (P^{2}+Q^{2})/U^{2}·R_{t} = (${n2(c.Syuk.p)}^{2}+${n2(c.Syuk.q)}^{2})/${U}^{2}·${n2(c.Rt)} = ${n3(c.dPt)} MVt`));
      s3.push(FX(`ΔQ_{t} = (P^{2}+Q^{2})/U^{2}·X_{t} = (${n2(c.Syuk.p)}^{2}+${n2(c.Syuk.q)}^{2})/${U}^{2}·${n2(c.Xt)} = ${n3(c.dQt)} MVAr`));
      s3.push(FX(`ΔS_{x} = ${t.n}·(${n3(t.dPpul / 1000)} + j${n3(t.dQpul / 1000)}) = ${f.c(c.dPx, c.dQx, 3)} MVA`));
      s3.push(FX(`S_{1} = S_{yuk} + ΔS_{t} + ΔS_{x} = ${cx(c.S1)} MVA`));
      if (c.children.length) {
        s3.push(FX(`S_{tugun} = S_{1} + ${c.children.map((k) => `S_{4(${k})}`).join(' + ')} = ${cx(c.S1)} + ${c.children.map((k) => '(' + cx(r.chains[k].S4) + ')').join(' + ')} = ${cx(c.Snode)} MVA`));
        s3.push(FX(`S_{2} = S_{tugun} − jQ_{c}/2 = ${cx(c.Snode)} − j${n2(ln.Qc / 2)} = ${cx(c.S2)} MVA`));
      } else {
        s3.push(FX(`S_{2} = S_{1} − jQ_{c}/2 = ${cx(c.S1)} − j${n2(ln.Qc / 2)} = ${cx(c.S2)} MVA`));
      }
      s3.push(FX(`ΔS_{HL} = (P_{2}^{2}+Q_{2}^{2})/U^{2}·(R+jX) = (${n2(c.S2.p)}^{2}+${n2(c.S2.q)}^{2})/${U}^{2}·(${n2(ln.R)}+j${n2(ln.X)}) = ${f.c(c.dPl, c.dQl, 3)} MVA`));
      s3.push(FX(`S_{3} = S_{2} + ΔS_{HL} = ${cx(c.S3)} MVA;   S_{4} = S_{3} − jQ_{c}/2 = ${cx(c.S4)} MVA`));
    });
    s3.push(...TBL('Quvvat taqsimoti natijalari (maksimal rejim), MVA', ['p/st', 'S_{yuk}', 'ΔS_{t}+ΔS_{x}', 'S_{1}', 'S_{tugun}', 'Liniya', 'ΔS_{HL}', 'S_{4}'],
      r.tree.post.map((p) => { const c = r.chains[p]; return [p, cx(c.Syuk), cx(c.dSt), cx(c.S1), cx(c.Snode), lineOf(p).name, f.c(c.dPl, c.dQl), cx(c.S4)]; })));

    const st = r.station;
    s3.push(H2('4.1. Stansiya shinasi balansi va HL-6 liniyasi'));
    s3.push(P("Stansiya generatorlari ishlab chiqarayotgan quvvatdan xususiy ehtiyoj va ko'taruvchi transformatorlardagi isroflar ayiriladi; sistema bilan bog'lovchi HL-6 dagi quvvatning yo'nalishi va miqdori Kirxgofning birinchi qonuniga asosan topiladi (manfiy bo'lsa — energotizimdan olinadi)."));
    const mName = { max: 'Maksimal', min: `Minimal (${r.opts.minLoadFactor * 100}%)`, av: 'Avariyadan keyingi' };
    s3.push(FX(`S_{HL-6} = (P_{gen} + jQ_{gen}) − S_{xus} − ΔS_{T.ko'tar} − ΣS_{4(manbadan)};     cosφ_{HL-6} = P_{HL-6}/S_{HL-6} ≥ ${r.opts.cosTieMin}`));
    s3.push(...TBL('HL-6 liniyasining ish rejimlari', ['Rejim', 'P_{gen}+jQ_{gen}, MVA', 'ΣS_{4}, MVA', 'ΔS_{T.ko\'tar}, MVA', 'S_{HL-6}, MVA', 'cosφ', 'ΔP_{HL-6}, MVt', 'I, A', 'I_{ruh}, A'],
      ['max', 'min', 'av'].map((k, i) => {
        const s = st[k], ch = r.hl6Check[i];
        return [mName[k], f.c(s.Pg, s.Qg), cx(s.need), f.c(s.dPup, s.dQup), cx(s.S6), n3(s.cos6), n3(s.dP6), f.i(ch.Iworst), String(hl6.wire.Iruh)];
      })));
    s3.push(P(`Avariyadan keyingi rejimda eng katta generator o'chirilgan, II va III kategoriya yuklamalari ${r.opts.avLoadFactor * 100}% gacha kamaytirilgan. HL-6 qizish sharti bo'yicha ${r.hl6Check.every((c) => c.ok) ? 'barcha rejimlarda tekshiruvdan o\'tadi' : '**tekshiruvdan o\'tmaydi — kattaroq kesim talab qilinadi**'} (maksimal rejimda bitta zanjir o'chganda, minimal va avariyadan keyingi rejimlarda ikkala zanjir ishlaganda).`));
    s3.push(P(st.max.genQreduced
      ? `Generatorlar nominal cosφ = ${inp.cosManba} bilan ishlaganda HL-6 orqali sistemaga ortiqcha reaktiv quvvat uzatilib, cosφ_{HL-6} < ${r.opts.cosTieMin} bo'lar edi. Shuning uchun generatorlarning reaktiv quvvati ${n2(st.max.Qg_nom)} dan ${n2(st.max.Qg)} MVAr gacha kamaytiriladi (cosφ_{gen} = ${n3(st.max.cosGen)}), bunda maksimal rejimda cosφ_{HL-6} = ${n3(st.max.cos6)}.`
      : `Maksimal rejimda generatorlar nominal cosφ bilan ishlaydi (Q_{gen} = ${n2(st.max.Qg)} MVAr), sistema bilan bog'lovchi liniyada cosφ_{HL-6} = ${n3(st.max.cos6)}${st.max.cos6 >= r.opts.cosTieMin - 0.005 ? ' — talab bajariladi' : ' — talabdan past, kompensatsiya kerak'}.`));
    const lt = r.lossTotals;
    s3.push(...TBL('Tarmoqdagi umumiy quvvat isroflari (maksimal rejim)', ['Element', 'ΔP, MVt', 'ΔQ, MVAr'],
      [['Liniyalar', n3(lt.dPl), n3(lt.dQl)], ['Transformatorlar', n3(lt.dPt), n3(lt.dQt)]],
      { foot: ['Jami', n3(lt.dP), n3(lt.dQ)] }));
    s3.push(P(`Umumiy aktiv quvvat isrofi ΔP_{Σ} = ${n3(lt.dP)} MVt, bu iste'molchilar yuklamasining ${n2(lt.pct)}% ini tashkil etadi. Uzatish FIK:`, { keepNext: true }));
    s3.push(FX(`η = P_{yetkazilgan}/P_{uzatilgan}·100% = ${n2(r.efficiency.delivered)}/${n2(r.efficiency.sent)}·100% = ${n2(r.efficiency.eta)}%`));

    // ============================================================== 4. ENERGIYA
    const e = r.energy;
    const s4 = [];
    s4.push(H1('5. Yillik elektr energiya isrofi', !meta.equivalentImage));
    s4.push(P(`Liniyalardagi va transformatorlardagi yillik elektr energiya isrofi eng katta isroflar vaqti τ orqali aniqlanadi. τ qiymati T_{m} va element orqali o'tayotgan quvvatning cosφ iga bog'liq holda 2-ilovaning 4-jadvalidan (chiziqli interpolatsiya bilan) olinadi. Bir nechta p/st ni ta'minlovchi uchastkalar uchun o'rtacha T_{m.o'rt} olinadi; stansiya va sistema bilan bog'lovchi liniya uchun T = ${e.Tst} soat qabul qilinadi.`));
    s4.push(FX('ΔW_{HL} = ΔP_{HL}·τ;     ΔW_{T} = ΔP_{t}·τ + ΔP_{x}·8760'));
    s4.push(...TBL('Yillik elektr energiya isrofi', ['Element', 'T_{m}, soat', 'cosφ', 'τ, soat', 'ΔP_{yuk}, MVt', 'ΔP_{x}, MVt', 'ΔW, MVt·soat'],
      e.rows.map((x) => [x.el, f.i(x.Tm), n2(x.cos), f.i(x.tau), n3(x.dP), x.dPx ? n3(x.dPx) : '—', n1(x.dW)]),
      { foot: ['Jami', '', '', '', '', '', n1(e.dW)] }));
    s4.push(P(`Stansiyaning maksimal quvvati va T = ${e.Tst} soat bo'yicha ishlab chiqargan energiyasi W_{st} = ${n2(r.P_st)}·${e.Tst} = ${f.i(e.Wst)} MVt·soat. Energiya isrofining foizdagi qiymati:`, { keepNext: true }));
    s4.push(FX(`ΔW_{%} = ΔW_{Σ}/W_{st}·100% = ${n1(e.dW)}/${f.i(e.Wst)}·100% = ${n2(e.pct)}%`));

    // ============================================================== 5. KUCHLANISH
    const s5 = [];
    s5.push(H1('6. Kuchlanish yo\'qotilishi va kuchlanishni rostlash'));
    s5.push(P(`Maksimal rejimda stansiyaning yuqori kuchlanish shinasida U_{A} = ${n2(r.volt[0].Ubus)} kV saqlanadi deb qabul qilinadi. Liniya va transformatordagi kuchlanish yo'qotilishi bo'ylama tashkil etuvchi bo'yicha hisoblanadi; past kuchlanish (PK) tarafida ${n2(r.volt[0].Udes)} kV (±5%) ta'minlanishi uchun transformatorlarning yuklama ostida rostlash (RPN) shahobchasi tanlanadi.`));
    s5.push(H2('6.1. Ko\'taruvchi podstansiya'));
    s5.push(P(`Manbaning YuK tomonida U_{A} = ${n2(r.volt[0].Ubus)} kV o'zgarmas deb qabul qilinadi va uni ushlab turish uchun generator kuchlanishi aniqlanadi. Ko'taruvchi transformatorlarda kuchlanish ПБВ yordamida ±2×2.5% oralig'ida rostlanadi.`));
    r.stepUpVolt.forEach((s) => {
      s5.push(FX(`${s.marka}: ΔU_{T} = (${n2(s.p)}·${n2(s.Rt)} + ${n2(s.q)}·${n2(s.Xt)})/${n2(r.volt[0].Ubus)} = ${n2(s.dU)} kV;   U'_{G} = ${n2(r.volt[0].Ubus)} + ${n2(s.dU)} = ${n2(s.Ug_ref)} kV`));
      s5.push(P(`Transformatsiya koeffitsienti K_{T} = ${s.UnG}/${n2(s.tap.Uotv)} (${s.tap.pct > 0 ? '+' : ''}${s.tap.pct}% shahobcha) tanlanadi, generatordagi haqiqiy kuchlanish U_{G} = ${n2(s.Ug_ref)}·${s.UnG}/${n2(s.tap.Uotv)} = **${n2(s.tap.Ug)} kV**.`));
    });
    s5.push(H2('6.2. Pasaytiruvchi podstansiyalar'));
    s5.push(P("Kuchlanish yo'qotilishi manbadan boshlab quvvat yo'nalishi bo'yicha ketma-ket aniqlanadi: har bir uchastka boshidagi kuchlanish — uni ta'minlovchi tugundagi kuchlanish (qo'llanma 7.2)."));
    s5.push(FX('ΔU_{HL} = (P_{3}·R + Q_{3}·X)/U_{boshi};   ΔU_{t} = (P\'·R_{t} + Q\'·X_{t})/U_{oxiri};   U_{PK} = U\'_{PK}·U_{nPK}/U_{otv}'));
    r.tree.order.map((p) => r.volt.find((v) => v.pst === p)).forEach((v) => {
      s5.push(H3(`p/st ${v.pst} (${v.lineName})`));
      s5.push(FX(`ΔU_{HL} = (${n2(v.P3)}·${n2(v.R)} + ${n2(v.Q3)}·${n2(v.X)})/${n2(v.Ustart)} = ${n2(v.dUl)} kV;   U_{oxiri} = ${n2(v.Ustart)} − ${n2(v.dUl)} = ${n2(v.Uend)} kV;   manbadan ΔU = ${n1(v.dUpath)}%`));
      s5.push(FX(`ΔU_{t} = (${n2(v.Pp)}·${n2(v.Rt)} + ${n2(v.Qp)}·${n2(v.Xt)})/${n2(v.Uend)} = ${n2(v.dUt)} kV;   U'_{PK} = ${n2(v.Uend)} − ${n2(v.dUt)} = ${n2(v.Uref)} kV`));
      s5.push(FX(`RPN siz: U_{PK} = ${n2(v.Uref)}·${v.UnPK}/${v.UnYuK} = ${n2(v.U0)} kV`));
      s5.push(FX(`U_{otv.hisob} = U'_{PK}·U_{nPK}/U_{PK.ist} = ${n2(v.Uref)}·${v.UnPK}/${n2(v.Udes)} = ${n2(v.Uref * v.UnPK / v.Udes)} kV`));
      s5.push(P(`Eng yaqin shahobcha: **${v.tap.pct > 0 ? '+' : ''}${v.tap.pct}%** (U_{otv} = ${n2(v.tap.Uotv)} kV), u holda U_{PK} = ${n2(v.Uref)}·${v.UnPK}/${n2(v.tap.Uotv)} = **${n2(v.tap.Upk)} kV** — ${v.ok ? 'ruxsat etilgan chegarada' : 'ruxsat etilgan chegaradan tashqarida'}.`));
      if (v.comp) {
        s5.push(P(`Barcha RPN shahobchalari yetarli emas, shuning uchun taxminan Q_{k} = ${n2(v.comp.Qk)} MVAr kompensatsiya qurilmasi o'rnatiladi: ${v.comp.type === 'SK' ? 'sinxron kompensator ' + v.comp.device.marka : v.comp.count + '×' + v.comp.device.marka + ' kondensator batareyasi'}.`));
      }
    });
    s5.push(...TBL('Kuchlanishlar va tanlangan RPN shahobchalari', ['p/st', 'ΔU_{HL}, kV', 'ΔU_{t}, kV', 'U\'_{PK}, kV', 'U_{PK}(0), kV', 'RPN', 'U_{otv}, kV', 'U_{PK}, kV'],
      r.volt.map((v) => [v.pst, n2(v.dUl), n2(v.dUt), n2(v.Uref), n2(v.U0), `${v.tap.pct > 0 ? '+' : ''}${v.tap.pct}%`, n2(v.tap.Uotv), n2(v.tap.Upk)])));
    s5.push(P(`HL-6 liniyasida kuchlanish yo'qotilishi ΔU = ${n2(r.voltHL6.dU)} kV, energotizim shinasidagi kuchlanish ≈ ${n2(r.voltHL6.Usys)} kV.`));

    // ============================================================== XULOSA
    const s6 = [];
    s6.push(H1('Xulosa'));
    s6.push(P(`Kurs loyihasida sxema № ${inp.schemaNum}, variant ${inp.variant} bo'yicha mintaqaviy elektr tarmog'i loyihalandi. ${tp.stats.withDistances} ta mumkin bo'lgan ulanish variantidan ${tp.used === 'mine' ? 'talaba taklif qilgan' : 'ekvivalent uzunligi eng kichik texnik yaroqli'} variant qabul qilindi: ${sigLong(r.tree.parent)}. Nominal kuchlanish ${U} kV qabul qilindi.`));
    s6.push(P(`Liniyalar uchun simlar: ${r.lines.map((l) => `${l.name} — ${wireName(l)}`).join('; ')}.`));
    s6.push(P(`Podstansiya transformatorlari: ${C.PST.map((p) => `${p} — ${trName(r.trafos[p])}`).join('; ')}. Ko'taruvchi transformatorlar: ${r.stepUps.map((u) => u.count + '×' + u.trafo.marka).join(', ')}.`));
    s6.push(P(`Maksimal rejimda tarmoqdagi aktiv quvvat isrofi ${n2(lt.dP)} MVt (${n2(lt.pct)}%), yillik elektr energiya isrofi ${f.i(e.dW)} MVt·soat (${n2(e.pct)}%). Iste'molchilar shinasida talab qilingan kuchlanish ${r.volt.every((v) => v.ok) ? 'transformatorlarning RPN qurilmalari yordamida ta\'minlanadi' : 'RPN va qo\'shimcha kompensatsiya qurilmalari yordamida ta\'minlanadi'}.`));

    // ============================================================== ADABIYOTLAR
    const s7 = [];
    s7.push(H1('Foydalanilgan adabiyotlar'));
    [
      "Rasulov A.N., Mamarasulova F.S., To'ychiyev F.N. «Elektr ta'minoti tizimida elektr tarmoqlar» fanidan kurs loyihasini bajarish uchun uslubiy qo'llanma. — Toshkent: ToshDTU, 2014.",
      'Крючков И.П., Неклепаев Б.Н. Электрическая часть электростанций. — М.: Энергия, 1978.',
      'Петренко Л.И. Электрические сети: Сб. задач. — Киев: Вища школа, 1976.',
      'Боровиков В.А., Кесарев В.К., Ходот Г.А. Электрические сети энергетических систем. — Л.: Энергия, 1977.',
      'Справочник по проектированию электроэнергетических систем / Под ред. С.С. Рокотяна и И.М. Шапиро. — М., 1977.',
      'Веников В.А. Электрические системы в примерах и иллюстрациях. — М.: Энергоатомиздат, 1983.',
      'Мельников Н.А. Электрические сети и системы. — М.: Энергия, 1969.',
      "Karimov X.G., Rasulov A.N. Elektr tarmoqlari. — Toshkent, 1996."
    ].forEach((t, i) => s7.push(new Paragraph({ spacing: { after: 80 }, indent: { left: 426, hanging: 426 }, children: runs(`${i + 1}. ${t}`) })));

    // ============================================================== HUJJAT
    const footer = new Footer({
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 24 })] })]
    });
    const MARGIN = { top: 1134, right: 850, bottom: 1134, left: 1701 };
    let firstPortrait = true;
    const portrait = (children) => {
      const page = { margin: MARGIN };
      if (firstPortrait) { page.pageNumbers = { start: 2 }; firstPortrait = false; }
      return { properties: { page }, footers: { default: footer }, children };
    };
    /** Sxema rasmi alohida A4 landshaft sahifada (keng sxema tik sahifada juda kichik bo'lib qoladi) */
    const figurePage = (img, caption) => {
      const maxW = 990, maxH = 600;           // px: A4 landshaft, 1.5–2 sm hoshiyalar
      const k = Math.min(maxW / img.W, maxH / img.H);
      return {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 850, right: 850, bottom: 850, left: 1134 } } },
        footers: { default: footer },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 }, keepNext: true,
            children: [new ImageRun({ data: img.data, transformation: { width: Math.round(img.W * k), height: Math.round(img.H * k) } })]
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: runs(caption, { italics: true, size: 26 }) })
        ]
      };
    };
    const sections = [{ properties: { page: { margin: MARGIN } }, children: title }];
    let body = [...intro, ...s1, ...sT, ...s2];
    if (meta.principalImage) {
      sections.push(portrait(body), figurePage(meta.principalImage, '1-rasm. Radial variantning prinsipial sxemasi'));
      body = [];
    }
    body.push(...s3);
    if (meta.equivalentImage) {
      sections.push(portrait(body), figurePage(meta.equivalentImage, '2-rasm. Radial variantning ekvivalent almashtiruv sxemasi'));
      body = [];
    }
    body.push(...s4, ...s5, ...s6, ...s7);
    sections.push(portrait(body));
    const doc = new Document({
      creator: meta.student,
      title: `Kurs loyihasi — sxema ${inp.schemaNum}, variant ${inp.variant}`,
      description: "Elektr ta'minoti tizimida elektr tarmoqlari — kurs loyihasi hisoboti",
      styles: {
        default: {
          document: { run: { font: FONT, size: SIZE }, paragraph: { spacing: { line: 360 } } }
        },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { font: FONT, size: 32, bold: true, color: '000000' },
            paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 }, keepNext: true } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { font: FONT, size: 28, bold: true, color: '000000' },
            paragraph: { spacing: { before: 240, after: 120 }, indent: { firstLine: 709 }, keepNext: true } },
          { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { font: FONT, size: 28, bold: true, italics: true, color: '000000' },
            paragraph: { spacing: { before: 180, after: 60 }, indent: { firstLine: 709 }, keepNext: true } }
        ]
      },
      sections
    });
    return Packer.toBlob(doc);
  }

  window.DocxBuilder = { build };
})();
