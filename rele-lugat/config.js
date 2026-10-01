/* =========================================================
   Rele Lug'at — yuklab olish sahifasi sozlamalari.
   Yangi APK chiqqanda FAQAT shu faylni yangilang:
     1. rele-lugat.apk faylini almashtiring (yoki APK_URL ni o'zgartiring)
     2. VERSION va SIZE_MB ni yangilang
   SIZE_MB = bayt / 1 048 576, bitta kasr bilan
   (PowerShell: (Get-Item rele-lugat.apk).Length / 1MB).
   ========================================================= */
window.RELE_LUGAT = {
    APK_URL: '/rele-lugat/rele-lugat.apk',
    VERSION: '2.0.0',
    SIZE_MB: 4.8,          // 5 005 191 bayt
    // Sahifaning to'liq manzili — QR-kod (qr.svg) va ulashish uchun.
    // Domen o'zgarsa qr.svg ni ham qayta yarating.
    PAGE_URL: 'https://energyvibe.uz/rele-lugat/'
};
