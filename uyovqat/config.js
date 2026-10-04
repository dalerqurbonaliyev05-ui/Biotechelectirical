/* =========================================================
   Uy taomlari: yuklab olish sahifasi sozlamalari.
   Yangi APK chiqqanda FAQAT shu fayl va apk/ papkasi yangilanadi:
     1. apk/uyovqat-*.apk fayllarini almashtiring (nomi o'sha-o'sha qolsin)
     2. VERSION, bayt hajmi va SHA-256 ni yangilang:
        Linux/Mac:  sha256sum apk/*.apk        PowerShell:  Get-FileHash apk\*.apk
   ========================================================= */
window.UYOVQAT = {
    VERSION: '1.0',
    APPS: {
        buyer:   { file: '/uyovqat/apk/uyovqat-buyer.apk',   bytes: 4593260, sha256: '021bd820ac1e70f9f35846ef1b3d424ddd4c42d86c86b9ded541775da4cbbbb6' },
        seller:  { file: '/uyovqat/apk/uyovqat-seller.apk',  bytes: 4587692, sha256: '0d5ba389f9882aa5eecbb6c38bff92b01209169d40cf1536987a5752d42d433e' },
        courier: { file: '/uyovqat/apk/uyovqat-courier.apk', bytes: 4593546, sha256: '4b280e4bce8be87aafd2b16e188bf581bb6e4322ddde0063a373e3aca24466ab' }
    }
};
