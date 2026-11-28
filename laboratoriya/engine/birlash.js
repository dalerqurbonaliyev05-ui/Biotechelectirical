// Statik mesh'larni birlashtirish (draw call kamaytirish). Faqat chizishga ta’sir qiladi, sahna mantig‘iga emas.
// Bir xil (material, soya bayroqlari, renderOrder) li mesh'lar jahon koordinatasida bitta geometriyaga yig‘iladi.
// Birlashtirilmaydi: shaffof materiallar (tartiblash buzilmasin), ko‘p materialli, instansli, userData.tur bor
// (bosiladigan/hit), boshqa qatlamdagi, ko‘rinmas, vertex rangli yoki morfli mesh'lar.

function mumkin(m) {
  if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh) return false;
  const mat = m.material, g = m.geometry;
  if (!mat || Array.isArray(mat) || mat.transparent || mat.vertexColors || !m.visible) return false;
  if (m.userData.tur || m.layers.mask !== 1) return false;
  if (!g.attributes.position || !g.attributes.normal || g.morphAttributes?.position) return false;
  if (Number.isFinite(g.drawRange.count)) return false;
  return true;
}

/**
 * meshlar: Mesh ro‘yxati (matrixWorld yangilangan bo‘lishi shart). ota: birlashgan mesh'lar qo‘shiladigan obyekt (sahna).
 * istisno: birlashtirilmasligi kerak mesh'lar to‘plami (Set). Qaytaradi: { oldin, keyin }.
 */
export function statikBirlashtir(THREE, meshlar, ota, istisno = new Set()) {
  const guruhlar = new Map();
  let oldin = 0;
  for (const m of meshlar) {
    if (istisno.has(m) || !mumkin(m)) continue;
    const kalit = `${m.material.id}|${+m.castShadow}${+m.receiveShadow}|${m.renderOrder}`;
    if (!guruhlar.has(kalit)) guruhlar.set(kalit, []);
    guruhlar.get(kalit).push(m);
    oldin++;
  }
  let keyin = 0;
  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  for (const royxat of guruhlar.values()) {
    if (royxat.length < 2) continue; // yolg‘iz mesh'ni birlashtirishdan foyda yo‘q
    let n = 0;
    const geos = royxat.map((m) => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry));
    for (const g of geos) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
    let o = 0;
    royxat.forEach((m, i) => {
      const g = geos[i];
      const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
      nm.getNormalMatrix(m.matrixWorld);
      const teskari = m.matrixWorld.determinant() < 0; // ko‘zgu: uchburchak yo‘nalishini almashtirish kerak
      const cnt = pos.count;
      for (let k = 0; k < cnt; k++) {
        // teskari bo‘lsa har uchburchakda 2- va 3-uchlar o‘rin almashadi
        const src = teskari ? (k % 3 === 1 ? k + 1 : k % 3 === 2 ? k - 1 : k) : k;
        v.fromBufferAttribute(pos, src).applyMatrix4(m.matrixWorld);
        P.set([v.x, v.y, v.z], (o + k) * 3);
        v.fromBufferAttribute(nor, src).applyMatrix3(nm).normalize();
        N.set([v.x, v.y, v.z], (o + k) * 3);
        if (uv) U.set([uv.getX(src), uv.getY(src)], (o + k) * 2);
      }
      o += cnt;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    geo.computeBoundingSphere();
    const bosh = royxat[0];
    const mesh = new THREE.Mesh(geo, bosh.material);
    mesh.castShadow = bosh.castShadow;
    mesh.receiveShadow = bosh.receiveShadow;
    mesh.renderOrder = bosh.renderOrder;
    mesh.userData.birlashgan = royxat.length;
    ota.add(mesh);
    for (const m of royxat) m.parent?.remove(m);
    keyin++;
  }
  return { oldin, keyin };
}
