// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Uzbek (`uz`).
class AppLocalizationsUz extends AppLocalizations {
  AppLocalizationsUz([String locale = 'uz']) : super(locale);

  @override
  String get appTitle => 'ElektrUy';

  @override
  String get next => 'Keyingi';

  @override
  String get back => 'Orqaga';

  @override
  String get cancel => 'Bekor qilish';

  @override
  String get save => 'Saqlash';

  @override
  String get delete => 'O\'chirish';

  @override
  String get edit => 'Tahrirlash';

  @override
  String get done => 'Tayyor';

  @override
  String get close => 'Yopish';

  @override
  String get retry => 'Qayta urinish';

  @override
  String get continueLabel => 'Davom etish';

  @override
  String get skip => 'O\'tkazib yuborish';

  @override
  String get yes => 'Ha';

  @override
  String get no => 'Yo\'q';

  @override
  String get ok => 'OK';

  @override
  String get add => 'Qo\'shish';

  @override
  String get search => 'Qidirish';

  @override
  String get loading => 'Yuklanmoqda…';

  @override
  String get offlineBanner =>
      'Internet yo\'q. Darslar, kalkulyatorlar va 3D ko\'rinish oflayn ishlaydi.';

  @override
  String get errorGeneric => 'Xatolik yuz berdi. Qayta urinib ko\'ring.';

  @override
  String get errorNetwork => 'Internetga ulanish yo\'q.';

  @override
  String errorWithDetail(String detail) {
    return 'Xato: $detail';
  }

  @override
  String get needsSignIn => 'Bu funksiyadan foydalanish uchun tizimga kiring.';

  @override
  String get needsOnline => 'Bu funksiya uchun internet kerak.';

  @override
  String get unitM => 'm';

  @override
  String get unitCm => 'sm';

  @override
  String get unitPcs => 'dona';

  @override
  String get unitKg => 'kg';

  @override
  String get currencyUZS => 'so\'m';

  @override
  String get currencyUSD => 'USD';

  @override
  String get savedLocally => 'Telefonda saqlandi';

  @override
  String get synced => 'Sinxronlandi';

  @override
  String get chooseLanguage => 'Tilni tanlang';

  @override
  String get languageUz => 'O\'zbekcha';

  @override
  String get languageRu => 'Русский';

  @override
  String get languageEn => 'English';

  @override
  String get onb1Title => 'Xona elektr simlarini rejalashtiring';

  @override
  String get onb1Body =>
      'Xonani suratga oling, rozetka, kalit va chiroqlarni belgilang — kabel trassasi, sxema va materiallar ro\'yxatini oling.';

  @override
  String get onb2Title => 'Qadam-baqadam o\'rganing';

  @override
  String get onb2Body =>
      'Rasmli qisqa darslar va har bir qadamni o\'qib beradigan ovozli yordamchi — qo\'llaringiz band bo\'lsa ham.';

  @override
  String get onb3Title => 'Avvalo xavfsizlik';

  @override
  String get onb3Body =>
      'Hech qachon kuchlanish ostida ishlamang. Ish xavfli bo\'lsa, ilova litsenziyali elektrik chaqirishni maslahat beradi.';

  @override
  String get disclaimerTitle => 'Xavfsizlik va javobgarlikdan voz kechish';

  @override
  String get privacyTitle => 'Maxfiylik siyosati';

  @override
  String get acceptDisclaimer =>
      'Xavfsizlik qoidalari va javobgarlikdan voz kechishni o\'qidim va qabul qilaman';

  @override
  String get acceptPrivacy => 'Maxfiylik siyosatini qabul qilaman';

  @override
  String get mustAccept => 'Davom etish uchun ikkalasini ham qabul qiling.';

  @override
  String get reconsentTitle => 'Shartlar yangilandi';

  @override
  String get reconsentBody =>
      'Davom etish uchun yangi versiyani o\'qing va qabul qiling.';

  @override
  String get signInTitle => 'Kirish';

  @override
  String get signInBody =>
      'Loyihalarni saqlash, progressni sinxronlash va AI tekshiruvidan foydalanish uchun Google orqali kiring.';

  @override
  String get signInGoogle => 'Google orqali davom etish';

  @override
  String signInError(String error) {
    return 'Kirish amalga oshmadi: $error';
  }

  @override
  String get signInNotConfigured =>
      'Bu versiyada Google orqali kirish sozlanmagan.';

  @override
  String get continueOffline =>
      'Oflayn davom etish (darslar va kalkulyatorlar)';

  @override
  String get signOut => 'Chiqish';

  @override
  String signedInAs(String email) {
    return 'Siz $email sifatida kirdingiz';
  }

  @override
  String get notSignedIn => 'Tizimga kirilmagan';

  @override
  String homeGreeting(String name) {
    return 'Salom, $name!';
  }

  @override
  String get homeGreetingAnon => 'Salom!';

  @override
  String get myProjects => 'Mening loyihalarim';

  @override
  String get newProject => 'Yangi xona loyihasi';

  @override
  String get lessons => 'Darslar';

  @override
  String get materialsCalc => 'Materiallar kalkulyatori';

  @override
  String get electricians => 'Elektriklar';

  @override
  String get settings => 'Sozlamalar';

  @override
  String get checkWork => 'Ishimni tekshirish';

  @override
  String get noProjects => 'Hali loyihalar yo\'q';

  @override
  String get noProjectsHint => 'Bitta kichik xonani suratga olishdan boshlang.';

  @override
  String get projectUntitled => 'Xona loyihasi';

  @override
  String get projectTitleLabel => 'Loyiha nomi';

  @override
  String get deleteProjectConfirm => 'Loyiha va uning rasmlari o\'chirilsinmi?';

  @override
  String get statusDraft => 'Qoralama';

  @override
  String get statusPlanned => 'Rejalashtirilgan';

  @override
  String get statusInProgress => 'Jarayonda';

  @override
  String get statusDone => 'Tugallangan';

  @override
  String get statusOutOfScope => 'Elektrik kerak';

  @override
  String get wizardTitle => 'Xona loyihasi';

  @override
  String get stepPhotos => 'Rasmlar';

  @override
  String get stepMarkers => 'Belgilar';

  @override
  String get stepDimensions => 'O\'lchamlar';

  @override
  String get stepQuestions => 'Savollar';

  @override
  String stepOf(int current, int total) {
    return '$total dan $current-qadam';
  }

  @override
  String get photosTitle => 'Xonaning 1–6 ta rasmini qo\'shing';

  @override
  String get photosHint =>
      'Har bir devorni qarama-qarshi tomondan suratga oling — pol va shift ko\'rinsin. Rozetka, kalit va chiroqlar aniq ko\'rinishi kerak.';

  @override
  String get takePhoto => 'Suratga olish';

  @override
  String get pickFromGallery => 'Galereya';

  @override
  String get photoLimit => 'Ko\'pi bilan 6 ta rasm';

  @override
  String get photoShowsWall => 'Rasmda devor:';

  @override
  String wallName(String name) {
    return '$name devor';
  }

  @override
  String get wallsHelp =>
      'Eshik joylashgan devorga qarab turing — bu A devor. Chapga buriling: keyingisi B, so\'ng C va D.';

  @override
  String get needOnePhoto => 'Kamida bitta rasm qo\'shing.';

  @override
  String get markersTitle => 'Nuqtalarni belgilang';

  @override
  String get markersHint =>
      'Turini tanlang va rasmga bosing. Belgini siljitish uchun suring, tahrirlash yoki o\'chirish uchun bosing.';

  @override
  String get markerInput => 'Kirish simi';

  @override
  String get markerSocket => 'Rozetka';

  @override
  String get markerSwitch => 'Kalit';

  @override
  String get markerLamp => 'Chiroq';

  @override
  String get markerJunction => 'Tarqatish qutisi';

  @override
  String get markerNote => 'Izoh';

  @override
  String get markerDelete => 'Belgini o\'chirish';

  @override
  String get markerSamePoint => 'Boshqa rasmdagi bilan bir xil nuqta';

  @override
  String get markerSamePointNone => 'Yangi nuqta';

  @override
  String get switchType => 'Kalit turi';

  @override
  String get switchSingle => 'Bir klavishli';

  @override
  String get switchDouble => 'Ikki klavishli';

  @override
  String get switchPass => 'O\'tish (proxodnoy)';

  @override
  String get lampMount => 'O\'rnatilgan joyi';

  @override
  String get lampCeiling => 'Shift';

  @override
  String get lampWall => 'Devor';

  @override
  String markersCount(int sockets, int switches, int lamps) {
    return 'Rozetka: $sockets · kalit: $switches · chiroq: $lamps';
  }

  @override
  String get markersNone =>
      'Hali belgi yo\'q — o\'tkazib yuborib, qurilmalarni rejada qo\'shishingiz mumkin.';

  @override
  String get dimsTitle => 'Xona o\'lchamlari';

  @override
  String get dimLength => 'Uzunlik';

  @override
  String get dimWidth => 'Kenglik';

  @override
  String get dimHeight => 'Balandlik';

  @override
  String get dimManual => 'Qo\'lda kiritish';

  @override
  String get dimAi => 'Rasm bo\'yicha AI baholashi';

  @override
  String get dimAr => 'Kamera bilan o\'lchash (AR)';

  @override
  String dimInvalid(String min, String max) {
    return '$min dan $max gacha qiymat kiriting';
  }

  @override
  String get aiEstimating => 'Rasmlar bo\'yicha baholanmoqda…';

  @override
  String get aiResultTitle => 'AI baholashi';

  @override
  String aiConfidence(String level) {
    return 'Ishonch darajasi: $level';
  }

  @override
  String get confidenceLow => 'past';

  @override
  String get confidenceMedium => 'o\'rtacha';

  @override
  String get confidenceHigh => 'yuqori';

  @override
  String get aiConfirmHint =>
      'AI baholashi taxminiy. Davom etishdan oldin ruletka bilan tekshiring va raqamlarni to\'g\'rilang.';

  @override
  String get aiUnusable =>
      'AI bu rasmlardan o\'lchamni aniqlay olmadi. Qo\'lda kiriting.';

  @override
  String get useValues => 'Shu qiymatlardan foydalanish';

  @override
  String get arUnsupported =>
      'Bu telefon AR o\'lchashni qo\'llab-quvvatlamaydi. O\'lchamni qo\'lda kiriting.';

  @override
  String get arMeasureWhat => 'Nimani o\'lchaysiz?';

  @override
  String get arTapFirst => 'Birinchi nuqtaga bosing';

  @override
  String get arTapSecond => 'Ikkinchi nuqtaga bosing';

  @override
  String get arScanHint =>
      'Telefonni sekin harakatlantiring, u pol va devorlarni topsin.';

  @override
  String get arUse => 'Foydalanish';

  @override
  String get arReset => 'Qayta';

  @override
  String arResult(String value) {
    return 'O\'lchandi: $value m';
  }

  @override
  String get questionsTitle => 'Bir nechta savol';

  @override
  String get qSockets => 'Rozetkalar';

  @override
  String get qLamps => 'Chiroqlar';

  @override
  String get qSwitches => 'Kalitlar';

  @override
  String get qCountsHint =>
      'Soni belgilardan olinadi. Belgisiz qurilmalar avtomatik joylashtiriladi — ularni rejada siljiting.';

  @override
  String get qJunctionBox => 'Xonada tayyor tarqatish qutisi bor';

  @override
  String get qWallMaterial => 'Devor materiali';

  @override
  String get wallBrick => 'G\'isht';

  @override
  String get wallConcrete => 'Beton';

  @override
  String get wallGypsum => 'Gipsokarton';

  @override
  String get wallWood => 'Yog\'och';

  @override
  String get qWiringType => 'Simlarni yotqizish turi';

  @override
  String get wiringHidden => 'Yashirin (shtrobada)';

  @override
  String get wiringOpen => 'Ochiq (kabel kanali yoki gofra)';

  @override
  String get qHasPe => 'Sariq-yashil yerga ulash (PE) simi bor';

  @override
  String get qPanelDistance => 'Elektr shchitigacha taxminiy kabel uzunligi, m';

  @override
  String get qLampPower => 'Bitta chiroq quvvati, W';

  @override
  String get qAppliances => 'Rejalashtirilgan qurilmalar';

  @override
  String get qAppliancePower => 'Quvvat, W';

  @override
  String get qApplianceSocket => 'Qurilma uchun rozetka';

  @override
  String get qApplianceAutoSocket => 'Yangi rozetka qo\'shish';

  @override
  String get qChecksTitle => 'Muhim — rostini javob bering';

  @override
  String get qPanelWork => 'Elektr shchiti ichida ish qilish kerak';

  @override
  String get qGrounding => 'Yerga ulashni o\'rnatish yoki o\'zgartirish kerak';

  @override
  String get qThreePhase => 'Uyda 3 fazali tarmoq';

  @override
  String get qWetZone => 'Bu vannaxona, dush yoki boshqa ho\'l xona';

  @override
  String get qAluminium => 'Eski simlar alyuminiy';

  @override
  String get qDamaged => 'Kuyish izi, hid yoki uchqun bor';

  @override
  String get qUnsure =>
      'Ishonchingiz komil emasmi? Avval elektrikdan so\'rang.';

  @override
  String get buildPlan => 'Rejani tuzish';

  @override
  String get resultTitle => 'Simlar rejasi';

  @override
  String get tabPlan => 'Reja 2D';

  @override
  String get tab3d => '3D';

  @override
  String get tabRoute => 'Trassa';

  @override
  String get tabDiagram => 'Sxema';

  @override
  String get tabMaterials => 'Materiallar';

  @override
  String get tabSteps => 'Qadamlar';

  @override
  String get topView => 'Yuqoridan ko\'rinish';

  @override
  String get planDragHint =>
      'Qurilmani siljitish uchun bosib turing va devor bo\'ylab suring.';

  @override
  String get legendPhase => 'Faza (L)';

  @override
  String get legendNeutral => 'Nol (N)';

  @override
  String get legendPe => 'Yerga ulash (PE)';

  @override
  String get legendSwitched => 'Kalitdan keyingi faza';

  @override
  String get legendTraveller => 'O\'tish simi';

  @override
  String get viewer3dError =>
      'Bu telefonda 3D ko\'rinishni ishga tushirib bo\'lmadi.';

  @override
  String get circuitLighting => 'Yoritish';

  @override
  String circuitSockets(int n) {
    return 'Rozetkalar, $n-guruh';
  }

  @override
  String circuitDedicated(String appliance) {
    return 'Alohida liniya: $appliance';
  }

  @override
  String breakerA(int a) {
    return 'Avtomat $a A';
  }

  @override
  String crossSection(String mm2) {
    return 'Mis $mm2 mm²';
  }

  @override
  String designCurrent(int power, String current) {
    return 'Yuklama $power W · $current A';
  }

  @override
  String vdrop(String pct) {
    return 'Kuchlanish yo\'qotilishi $pct%';
  }

  @override
  String get panelWorkNote => 'Shchitga ulash — faqat litsenziyali elektrik.';

  @override
  String segmentFromTo(String from, String to) {
    return '$from → $to';
  }

  @override
  String segmentLength(String m, String cable) {
    return '$m m kabel ($cable)';
  }

  @override
  String routeTotal(String m) {
    return 'Trassaning umumiy uzunligi $m m';
  }

  @override
  String get routingRulesTitle => 'Yotqizish qoidalari';

  @override
  String get routingRules =>
      'Faqat vertikal va gorizontal yo\'nalish, diagonal emas.\nGorizontal trassa shiftdan 15 sm pastda.\nVertikal trassa burchak, eshik va derazadan kamida 15 sm uzoqda.\nUlanishlar faqat qutilar ichida.\nRozetkalar poldan 30 sm, kalitlar 90–110 sm balandlikda.';

  @override
  String get devInput => 'Kirish';

  @override
  String get devJunction => 'Quti';

  @override
  String get devSocket => 'Rozetka';

  @override
  String get devSwitch => 'Kalit';

  @override
  String get devLamp => 'Chiroq';

  @override
  String get diagramSingle => 'Bir klavishli kalit va chiroq';

  @override
  String get diagramDouble => 'Ikki klavishli kalit, ikki guruh chiroq';

  @override
  String get diagramPass => 'O\'tish kalitlari';

  @override
  String get diagramSockets => 'Rozetka guruhi';

  @override
  String get diagramDedicated => 'Qurilma uchun alohida liniya';

  @override
  String get diagramNote =>
      'Ranglar: jigarrang/qizil — faza L, ko\'k — nol N, sariq-yashil — yerga ulash PE. Har doim tester bilan tekshiring.';

  @override
  String get materialsTotal => 'Jami';

  @override
  String get materialsOptional => 'Qo\'shimcha (asboblar va chiroqlar)';

  @override
  String materialsPricesNote(String region) {
    return 'Narxlar $region uchun taxminiy. Miqdor yoki narxni o\'zgartirish uchun qatorga bosing.';
  }

  @override
  String materialsReserveNote(int pct) {
    return 'Kabel $pct% zaxira bilan ko\'rsatilgan.';
  }

  @override
  String get quantity => 'Miqdor';

  @override
  String get unitPrice => 'Birlik narxi';

  @override
  String get includeInTotal => 'Jamiga qo\'shish';

  @override
  String get reasonElectricianInstalls => 'Shchitga elektrik o\'rnatadi';

  @override
  String get reasonSafety => 'Xavfsizlik uchun majburiy';

  @override
  String get reasonConduit => 'Gipsokarton va yog\'och devorlarda majburiy';

  @override
  String get exportPdf => 'PDF eksport';

  @override
  String get stepsIntro => 'Ishlarning tavsiya etilgan tartibi';

  @override
  String get openLesson => 'Darsni ochish';

  @override
  String get startWork => 'Ishni boshlash (xavfsizlik tekshiruvi)';

  @override
  String get markDone => 'Loyihani tugallangan deb belgilash';

  @override
  String get warningsTitle => 'E\'tibor bering';

  @override
  String get editProject => 'Loyihani tahrirlash';

  @override
  String get projectSaved => 'Loyiha saqlandi';

  @override
  String get warn_input_assumed =>
      'Kirish simi belgilanmagan — u A devor yonidan kiradi deb hisoblandi. Aniqroq reja uchun uni belgilang.';

  @override
  String get warn_switch_auto_added =>
      'Kalit belgilanmagan — quti yoniga qo\'shildi. Uni rejada siljiting.';

  @override
  String get warn_pass_unpaired =>
      'O\'tish kalitlari juft ishlaydi. Yakkasi oddiy kalit sifatida hisoblandi.';

  @override
  String get warn_near_corner =>
      'Qurilma burchakka juda yaqin edi va 15 sm uzoqlashtirildi.';

  @override
  String get warn_too_many_lamps =>
      'Bitta guruhda chiroqlar ko\'p. Umumiy quvvatni tekshiring.';

  @override
  String get warn_extra_socket_groups =>
      'Rozetkalar bir nechta guruhga bo\'lindi. Har bir qo\'shimcha guruh shchitdan yangi liniya — uni elektrik ulaydi.';

  @override
  String get warn_dedicated_socket_auto =>
      'Kuchli qurilma uchun rozetka qo\'shildi. Uni kerakli joyga siljiting.';

  @override
  String get warn_cable_upsized =>
      'Uzun masofa sababli kabel kesimi oshirildi.';

  @override
  String get warn_switch_without_lamp =>
      'Kalitlar bor, lekin chiroqlar yo\'q. Chiroqlarni belgilang.';

  @override
  String get warn_lighting_overload =>
      'Yoritish yuklamasi bitta guruh uchun juda katta.';

  @override
  String get warn_socket_overload => 'Rozetka guruhi ortiqcha yuklangan.';

  @override
  String get oosTitle => 'Bu ish litsenziyali elektrik uchun';

  @override
  String get oosBody =>
      'Xavfsizligingiz uchun ElektrUy bunday ish bo\'yicha ko\'rsatma bermaydi. Litsenziyali elektrik chaqiring.';

  @override
  String get oosReasons => 'Sababi:';

  @override
  String get oosFindElectrician => 'Elektrik topish';

  @override
  String get oosLessons => 'Darslarni o\'qishingiz mumkin';

  @override
  String get oosChangeAnswers => 'Javoblarni o\'zgartirish';

  @override
  String get gateTitle => 'Xavfsizlik tekshiruvi';

  @override
  String get gateBody =>
      'Barcha bandlarni belgilang. Ularsiz davom etib bo\'lmaydi.';

  @override
  String get gateContinue => 'Hammasi bajarildi — davom etish';

  @override
  String get lessonsTitle => 'Darslar';

  @override
  String lessonMinutes(int n) {
    return '$n daq';
  }

  @override
  String get difficulty1 => 'Oson';

  @override
  String get difficulty2 => 'O\'rtacha';

  @override
  String get difficulty3 => 'Qiyin';

  @override
  String get lessonCompleted => 'Tugallangan';

  @override
  String get lessonStart => 'Boshlash';

  @override
  String get lessonContinue => 'Davom etish';

  @override
  String lessonStepOf(int current, int total) {
    return '$total dan $current-qadam';
  }

  @override
  String get toolsNeeded => 'Asboblar';

  @override
  String get warningLabel => 'Diqqat';

  @override
  String get stepDoneCheck => 'Bu qadamni bajardim';

  @override
  String get nextStep => 'Keyingi qadam';

  @override
  String get prevStep => 'Oldingi';

  @override
  String get toQuiz => 'Testga o\'tish';

  @override
  String get quizTitle => 'Qisqa test';

  @override
  String get quizCorrect => 'To\'g\'ri!';

  @override
  String get quizWrong => 'Unchalik to\'g\'ri emas.';

  @override
  String quizScore(int score) {
    return 'Natijangiz: $score%';
  }

  @override
  String get quizRetry => 'Qayta topshirish';

  @override
  String get quizFinish => 'Darsni yakunlash';

  @override
  String get voiceGuide => 'Ovozli yordamchi';

  @override
  String get voiceCommandsHint =>
      'Ayting: «keyingi», «oldingi» yoki «takrorla»';

  @override
  String get voiceUnavailable => 'Bu telefonda ovozli buyruqlar mavjud emas.';

  @override
  String get voiceListening => 'Tinglanmoqda…';

  @override
  String get reportMistake => 'Xato haqida xabar berish';

  @override
  String get lessonsOfflineReady => 'Barcha darslar oflayn mavjud.';

  @override
  String get downloadsTitle => 'Oflayn kontent';

  @override
  String get downloadsBody =>
      'Darslar, xavfsizlik matnlari, narxlar va 3D ko\'rinish telefoningizda saqlanadi. Internet bo\'lganda yangilang.';

  @override
  String get downloadImages => 'Dars rasmlarini yuklab olish';

  @override
  String get syncNow => 'Hozir yangilash';

  @override
  String lastSync(String date) {
    return 'Oxirgi yangilanish: $date';
  }

  @override
  String get neverSynced => 'Ichki kontent ishlatilmoqda';

  @override
  String cachedItems(int lessons, int materials) {
    return 'Dars: $lessons · material: $materials';
  }

  @override
  String get clearCache => 'Yuklangan kontentni tozalash';

  @override
  String get electriciansTitle => 'Elektriklar';

  @override
  String get filterRegion => 'Hudud';

  @override
  String get filterDistrict => 'Tuman';

  @override
  String get allRegions => 'Barcha hududlar';

  @override
  String get searchName => 'Ism yoki xizmat bo\'yicha qidirish';

  @override
  String get noElectricians => 'Bu yerda hali elektriklar yo\'q.';

  @override
  String experienceYears(int n) {
    return '$n yillik tajriba';
  }

  @override
  String priceRange(String from, String to, String currency) {
    return '$from–$to $currency';
  }

  @override
  String ratingLabel(String avg, int count) {
    return '$avg ★ · $count ta sharh';
  }

  @override
  String get call => 'Qo\'ng\'iroq';

  @override
  String get telegram => 'Telegram';

  @override
  String get reviews => 'Sharhlar';

  @override
  String get noReviews => 'Hali sharh yo\'q';

  @override
  String get writeReview => 'Sharh qoldirish';

  @override
  String get editReview => 'Sharhimni o\'zgartirish';

  @override
  String get yourRating => 'Bahoyingiz';

  @override
  String get reviewText => 'Izoh (ixtiyoriy)';

  @override
  String get reviewSaved => 'Sharhingiz uchun rahmat!';

  @override
  String get becomeElectrician => 'Men elektrikman';

  @override
  String get applyTitle => 'Elektrik anketasi';

  @override
  String get applyName => 'Ism va familiya';

  @override
  String get applyPhone => 'Telefon, masalan +998 90 123 45 67';

  @override
  String get applyTelegram => 'Telegram (ixtiyoriy)';

  @override
  String get applyExperience => 'Tajriba, yil';

  @override
  String get applyPriceFrom => 'Narx ...dan';

  @override
  String get applyPriceTo => 'Narx ...gacha';

  @override
  String get applyBio => 'O\'zingiz va ishingiz haqida';

  @override
  String get applyServices => 'Xizmatlar';

  @override
  String get applySubmit => 'Tekshiruvga yuborish';

  @override
  String get applyPending => 'Anketangiz administrator tekshiruvini kutmoqda.';

  @override
  String get applyApproved => 'Anketangiz e\'lon qilingan.';

  @override
  String get applyRejected => 'Anketa tasdiqlanmadi. Tahrirlab qayta yuboring.';

  @override
  String get applyBlocked => 'Anketangiz bloklangan.';

  @override
  String get applyEditNote =>
      'Har qanday o\'zgarish anketani qayta tekshiruvga yuboradi.';

  @override
  String get fieldRequired => 'Majburiy';

  @override
  String get phoneInvalid => 'To\'g\'ri raqam kiriting';

  @override
  String get serviceSockets => 'Rozetka va kalitlar';

  @override
  String get serviceLighting => 'Yoritish';

  @override
  String get serviceWiring => 'Simlarni to\'liq almashtirish';

  @override
  String get servicePanel => 'Elektr shchiti';

  @override
  String get serviceGrounding => 'Yerga ulash';

  @override
  String get serviceInspection => 'Tekshiruv';

  @override
  String get reportElectrician => 'Anketa ustidan shikoyat';

  @override
  String get checkTitle => 'Ishni tekshirish';

  @override
  String get checkIntro =>
      'Tayyor ishning 1–4 ta aniq, yaqin rasmini oling (ochiq qutilar, klemmalar, trassalar). Biror narsani ochishdan oldin tokni o\'chiring.';

  @override
  String get checkContext => 'Nima qildingiz? (ixtiyoriy)';

  @override
  String get checkSend => 'AI bilan tekshirish';

  @override
  String get checkChecking => 'Rasmlar tekshirilmoqda…';

  @override
  String get checkOk => 'Ko\'rinadigan muammo topilmadi';

  @override
  String get checkWarning => 'Ogohlantirishlar bor';

  @override
  String get checkCritical => 'Jiddiy muammolar';

  @override
  String get checkUnclear => 'Rasmlar yetarlicha aniq emas';

  @override
  String get checkCallElectrician =>
      'Yoqmang. Litsenziyali elektrik chaqiring.';

  @override
  String get checkPositives => 'Yaxshi bajarilgan';

  @override
  String get checkFlagWrong => 'AI xato qildi';

  @override
  String get checkFlagged =>
      'Rahmat — administrator bu natijani ko\'rib chiqadi.';

  @override
  String get checkHistory => 'Oldingi tekshiruvlar';

  @override
  String get severityInfo => 'Maslahat';

  @override
  String get severityWarning => 'Ogohlantirish';

  @override
  String get severityCritical => 'Jiddiy';

  @override
  String get aiDisclaimerShort =>
      'AI xatolarni o\'tkazib yuborishi mumkin. Bu ekspertiza emas.';

  @override
  String get settingsTitle => 'Sozlamalar';

  @override
  String get language => 'Til';

  @override
  String get theme => 'Mavzu';

  @override
  String get themeSystem => 'Tizim bo\'yicha';

  @override
  String get themeLight => 'Yorug\'';

  @override
  String get themeDark => 'Qorong\'i';

  @override
  String get units => 'O\'lchov birligi';

  @override
  String get unitsMeters => 'Metr';

  @override
  String get unitsCentimeters => 'Santimetr';

  @override
  String get region => 'Hudud (narxlar uchun)';

  @override
  String get currency => 'Valyuta';

  @override
  String get legal => 'Huquqiy matnlar';

  @override
  String appVersion(String v) {
    return 'Versiya $v';
  }

  @override
  String get account => 'Hisob';

  @override
  String get deleteAccount => 'Ma\'lumotlarimni o\'chirish';

  @override
  String get deleteAccountBody =>
      'Bu ElektrUy dagi barcha loyihalar, rasmlar, dars progressi, sharhlar va AI tekshiruvlarini butunlay o\'chiradi. Qaytarib bo\'lmaydi.';

  @override
  String get deleteAccountTypeHint => 'Tasdiqlash uchun DELETE deb yozing';

  @override
  String get deleteAccountDone => 'Ma\'lumotlaringiz o\'chirildi.';

  @override
  String get about => 'Ilova haqida';

  @override
  String get reportTitle => 'Muammo haqida xabar berish';

  @override
  String get reportText => 'Muammoni tasvirlang';

  @override
  String get reportSend => 'Yuborish';

  @override
  String get reportSent => 'Yuborildi. Rahmat!';

  @override
  String get pdfTitle => 'ElektrUy — xona simlari rejasi';

  @override
  String pdfGenerated(String date) {
    return 'Yaratilgan sana: $date';
  }

  @override
  String pdfRoom(String l, String w, String h) {
    return 'Xona $l × $w × $h m';
  }

  @override
  String get pdfCircuits => 'Guruhlar';

  @override
  String get pdfCableRoute => 'Kabel trassasi';

  @override
  String get pdfMaterials => 'Materiallar';

  @override
  String get pdfDiagrams => 'Ulanish sxemalari';

  @override
  String get pdfItem => 'Nomi';

  @override
  String get pdfQty => 'Soni';

  @override
  String get pdfPrice => 'Narx';

  @override
  String get pdfSum => 'Summa';
}
