// VR uchun sof matematika (DOM'siz, Node'da sinaladi). THREE tashqaridan beriladi (bundler yo‘q, importmap faqat brauzerda).

/**
 * Qurilma yo‘nalishi (DeviceOrientation: alpha, beta, gamma — gradus) va ekran burilishi (gradus) → kamera kvaternioni.
 * three.js'ning eski DeviceOrientationControls formulasi: telefon tik (portret, beta=90) tursa, kamera gorizontga (−Z) qaraydi.
 */
export function qurilmaKvaternioni(THREE, alpha, beta, gamma, orient, out = new THREE.Quaternion()) {
  const d = THREE.MathUtils.degToRad;
  const e = new THREE.Euler(d(beta || 0), d(alpha || 0), -d(gamma || 0), 'YXZ');
  out.setFromEuler(e);
  out.multiply(new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2)); // kamera qurilma orqasiga qaraydi
  out.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -d(orient || 0)));
  return out;
}

/** Kamera qarab turgan gorizontal yo‘nalish burchagi (radian, Y o‘qi atrofida; 0 = −Z). */
export function yonalishBurchagi(THREE, q) {
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  return Math.atan2(-f.x, -f.z);
}

/** Markazlash: qurilma kvaternioni hozir qaysi tomonga qaramasin, natija `maqsad` burchakka qarasin — Y bo‘yicha qo‘shimcha burilish. */
export function markazlashBurchagi(THREE, qurilmaQ, maqsad) {
  return maqsad - yonalishBurchagi(THREE, qurilmaQ);
}

/** DeviceOrientation hodisasi haqiqiy ma’lumot beradimi (sensor bormi). Sensor bo‘lmasa brauzer null yuboradi. */
export function sensorMalumotimi(e) {
  return !!e && [e.alpha, e.beta, e.gamma].some((v) => typeof v === 'number' && !Number.isNaN(v));
}
