// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appTitle => 'ElektrUy';

  @override
  String get next => 'Далее';

  @override
  String get back => 'Назад';

  @override
  String get cancel => 'Отмена';

  @override
  String get save => 'Сохранить';

  @override
  String get delete => 'Удалить';

  @override
  String get edit => 'Изменить';

  @override
  String get done => 'Готово';

  @override
  String get close => 'Закрыть';

  @override
  String get retry => 'Повторить';

  @override
  String get continueLabel => 'Продолжить';

  @override
  String get skip => 'Пропустить';

  @override
  String get yes => 'Да';

  @override
  String get no => 'Нет';

  @override
  String get ok => 'OK';

  @override
  String get add => 'Добавить';

  @override
  String get search => 'Поиск';

  @override
  String get loading => 'Загрузка…';

  @override
  String get offlineBanner =>
      'Нет интернета. Уроки, калькуляторы и 3D-просмотр работают офлайн.';

  @override
  String get errorGeneric => 'Что-то пошло не так. Попробуйте ещё раз.';

  @override
  String get errorNetwork => 'Нет подключения к интернету.';

  @override
  String errorWithDetail(String detail) {
    return 'Ошибка: $detail';
  }

  @override
  String get needsSignIn => 'Войдите, чтобы пользоваться этой функцией.';

  @override
  String get needsOnline => 'Для этой функции нужен интернет.';

  @override
  String get unitM => 'м';

  @override
  String get unitCm => 'см';

  @override
  String get unitPcs => 'шт';

  @override
  String get unitKg => 'кг';

  @override
  String get currencyUZS => 'сум';

  @override
  String get currencyUSD => 'USD';

  @override
  String get savedLocally => 'Сохранено на телефоне';

  @override
  String get synced => 'Синхронизировано';

  @override
  String get chooseLanguage => 'Выберите язык';

  @override
  String get languageUz => 'O\'zbekcha';

  @override
  String get languageRu => 'Русский';

  @override
  String get languageEn => 'English';

  @override
  String get onb1Title => 'Спланируйте проводку комнаты';

  @override
  String get onb1Body =>
      'Сфотографируйте комнату, отметьте розетки, выключатели и лампы — получите трассу кабеля, схему и список материалов.';

  @override
  String get onb2Title => 'Учитесь шаг за шагом';

  @override
  String get onb2Body =>
      'Короткие уроки с картинками и голосовой гид, который читает каждый шаг — даже если руки заняты.';

  @override
  String get onb3Title => 'Безопасность прежде всего';

  @override
  String get onb3Body =>
      'Никогда не работайте под напряжением. Если работа опасна, приложение посоветует вызвать лицензированного электрика.';

  @override
  String get disclaimerTitle => 'Безопасность и отказ от ответственности';

  @override
  String get privacyTitle => 'Политика конфиденциальности';

  @override
  String get acceptDisclaimer =>
      'Я прочитал(а) и принимаю правила безопасности и отказ от ответственности';

  @override
  String get acceptPrivacy => 'Я принимаю политику конфиденциальности';

  @override
  String get mustAccept => 'Чтобы продолжить, примите оба пункта.';

  @override
  String get reconsentTitle => 'Условия обновлены';

  @override
  String get reconsentBody =>
      'Пожалуйста, прочитайте и примите новую версию, чтобы продолжить.';

  @override
  String get signInTitle => 'Вход';

  @override
  String get signInBody =>
      'Войдите через Google, чтобы сохранять проекты, синхронизировать прогресс и пользоваться ИИ-проверкой.';

  @override
  String get signInGoogle => 'Продолжить с Google';

  @override
  String signInError(String error) {
    return 'Не удалось войти: $error';
  }

  @override
  String get signInNotConfigured =>
      'Вход через Google не настроен в этой сборке.';

  @override
  String get continueOffline => 'Продолжить офлайн (уроки и калькуляторы)';

  @override
  String get signOut => 'Выйти';

  @override
  String signedInAs(String email) {
    return 'Вы вошли как $email';
  }

  @override
  String get notSignedIn => 'Вы не вошли';

  @override
  String homeGreeting(String name) {
    return 'Здравствуйте, $name!';
  }

  @override
  String get homeGreetingAnon => 'Здравствуйте!';

  @override
  String get myProjects => 'Мои проекты';

  @override
  String get newProject => 'Новый проект комнаты';

  @override
  String get lessons => 'Уроки';

  @override
  String get materialsCalc => 'Калькулятор материалов';

  @override
  String get electricians => 'Электрики';

  @override
  String get settings => 'Настройки';

  @override
  String get checkWork => 'Проверить работу';

  @override
  String get noProjects => 'Пока нет проектов';

  @override
  String get noProjectsHint => 'Начните с фотографий одной небольшой комнаты.';

  @override
  String get projectUntitled => 'Проект комнаты';

  @override
  String get projectTitleLabel => 'Название проекта';

  @override
  String get deleteProjectConfirm => 'Удалить проект и его фото?';

  @override
  String get statusDraft => 'Черновик';

  @override
  String get statusPlanned => 'Спланирован';

  @override
  String get statusInProgress => 'В работе';

  @override
  String get statusDone => 'Готово';

  @override
  String get statusOutOfScope => 'Нужен электрик';

  @override
  String get wizardTitle => 'Проект комнаты';

  @override
  String get stepPhotos => 'Фото';

  @override
  String get stepMarkers => 'Метки';

  @override
  String get stepDimensions => 'Размеры';

  @override
  String get stepQuestions => 'Вопросы';

  @override
  String stepOf(int current, int total) {
    return 'Шаг $current из $total';
  }

  @override
  String get photosTitle => 'Добавьте 1–6 фото комнаты';

  @override
  String get photosHint =>
      'Снимайте каждую стену с противоположной стороны, чтобы были видны пол и потолок. Розетки, выключатели и лампы должны быть хорошо видны.';

  @override
  String get takePhoto => 'Сделать фото';

  @override
  String get pickFromGallery => 'Галерея';

  @override
  String get photoLimit => 'Не более 6 фото';

  @override
  String get photoShowsWall => 'На фото стена:';

  @override
  String wallName(String name) {
    return 'Стена $name';
  }

  @override
  String get wallsHelp =>
      'Встаньте лицом к стене с дверью — это стена A. Повернитесь налево: следующая стена B, затем C и D.';

  @override
  String get needOnePhoto => 'Добавьте хотя бы одно фото.';

  @override
  String get markersTitle => 'Отметьте точки';

  @override
  String get markersHint =>
      'Выберите тип и нажмите на фото. Перетащите метку, чтобы сдвинуть; нажмите, чтобы изменить или удалить.';

  @override
  String get markerInput => 'Вводной кабель';

  @override
  String get markerSocket => 'Розетка';

  @override
  String get markerSwitch => 'Выключатель';

  @override
  String get markerLamp => 'Светильник';

  @override
  String get markerJunction => 'Распаечная коробка';

  @override
  String get markerNote => 'Заметка';

  @override
  String get markerDelete => 'Удалить метку';

  @override
  String get markerSamePoint => 'Та же точка, что на другом фото';

  @override
  String get markerSamePointNone => 'Новая точка';

  @override
  String get switchType => 'Тип выключателя';

  @override
  String get switchSingle => 'Одноклавишный';

  @override
  String get switchDouble => 'Двухклавишный';

  @override
  String get switchPass => 'Проходной';

  @override
  String get lampMount => 'Крепление';

  @override
  String get lampCeiling => 'Потолок';

  @override
  String get lampWall => 'Стена';

  @override
  String markersCount(int sockets, int switches, int lamps) {
    return 'Розеток: $sockets · выключателей: $switches · светильников: $lamps';
  }

  @override
  String get markersNone =>
      'Меток пока нет — можно пропустить и добавить устройства на плане.';

  @override
  String get dimsTitle => 'Размеры комнаты';

  @override
  String get dimLength => 'Длина';

  @override
  String get dimWidth => 'Ширина';

  @override
  String get dimHeight => 'Высота';

  @override
  String get dimManual => 'Ввести вручную';

  @override
  String get dimAi => 'Оценка ИИ по фото';

  @override
  String get dimAr => 'Измерить камерой (AR)';

  @override
  String dimInvalid(String min, String max) {
    return 'Введите значение от $min до $max';
  }

  @override
  String get aiEstimating => 'Оцениваем по фото…';

  @override
  String get aiResultTitle => 'Оценка ИИ';

  @override
  String aiConfidence(String level) {
    return 'Уверенность: $level';
  }

  @override
  String get confidenceLow => 'низкая';

  @override
  String get confidenceMedium => 'средняя';

  @override
  String get confidenceHigh => 'высокая';

  @override
  String get aiConfirmHint =>
      'Оценка ИИ приблизительна. Проверьте рулеткой и исправьте значения, прежде чем продолжить.';

  @override
  String get aiUnusable =>
      'ИИ не смог оценить размеры по этим фото. Введите их вручную.';

  @override
  String get useValues => 'Использовать эти значения';

  @override
  String get arUnsupported =>
      'Этот телефон не поддерживает AR-измерение. Введите размеры вручную.';

  @override
  String get arMeasureWhat => 'Что измерить?';

  @override
  String get arTapFirst => 'Нажмите на первую точку';

  @override
  String get arTapSecond => 'Нажмите на вторую точку';

  @override
  String get arScanHint =>
      'Медленно ведите телефоном, чтобы он нашёл пол и стены.';

  @override
  String get arUse => 'Использовать';

  @override
  String get arReset => 'Сбросить';

  @override
  String arResult(String value) {
    return 'Измерено: $value м';
  }

  @override
  String get questionsTitle => 'Несколько вопросов';

  @override
  String get qSockets => 'Розетки';

  @override
  String get qLamps => 'Светильники';

  @override
  String get qSwitches => 'Выключатели';

  @override
  String get qCountsHint =>
      'Количество берётся из меток. Устройства без метки размещаются автоматически — передвиньте их на плане.';

  @override
  String get qJunctionBox => 'В комнате уже есть распаечная коробка';

  @override
  String get qWallMaterial => 'Материал стен';

  @override
  String get wallBrick => 'Кирпич';

  @override
  String get wallConcrete => 'Бетон';

  @override
  String get wallGypsum => 'Гипсокартон';

  @override
  String get wallWood => 'Дерево';

  @override
  String get qWiringType => 'Тип проводки';

  @override
  String get wiringHidden => 'Скрытая (в штробах)';

  @override
  String get wiringOpen => 'Открытая (кабель-канал или гофра)';

  @override
  String get qHasPe => 'Есть жёлто-зелёный провод заземления (PE)';

  @override
  String get qPanelDistance => 'Примерная длина кабеля до электрощита, м';

  @override
  String get qLampPower => 'Мощность одного светильника, Вт';

  @override
  String get qAppliances => 'Планируемые приборы';

  @override
  String get qAppliancePower => 'Мощность, Вт';

  @override
  String get qApplianceSocket => 'Розетка для прибора';

  @override
  String get qApplianceAutoSocket => 'Добавить новую розетку';

  @override
  String get qChecksTitle => 'Важно — ответьте честно';

  @override
  String get qPanelWork => 'Нужны работы внутри электрощита';

  @override
  String get qGrounding => 'Нужно сделать или изменить заземление';

  @override
  String get qThreePhase => 'В доме трёхфазная сеть';

  @override
  String get qWetZone => 'Это ванная, душевая или другое влажное помещение';

  @override
  String get qAluminium => 'Старая проводка алюминиевая';

  @override
  String get qDamaged => 'Вижу следы гари, чувствую запах или вижу искры';

  @override
  String get qUnsure => 'Не уверены? Сначала спросите электрика.';

  @override
  String get buildPlan => 'Построить план';

  @override
  String get resultTitle => 'План проводки';

  @override
  String get tabPlan => 'План 2D';

  @override
  String get tab3d => '3D';

  @override
  String get tabRoute => 'Трасса';

  @override
  String get tabDiagram => 'Схема';

  @override
  String get tabMaterials => 'Материалы';

  @override
  String get tabSteps => 'Шаги';

  @override
  String get topView => 'Вид сверху';

  @override
  String get planDragHint =>
      'Удерживайте устройство и тяните вдоль стены, чтобы переместить.';

  @override
  String get legendPhase => 'Фаза (L)';

  @override
  String get legendNeutral => 'Ноль (N)';

  @override
  String get legendPe => 'Земля (PE)';

  @override
  String get legendSwitched => 'Коммутируемая фаза';

  @override
  String get legendTraveller => 'Перемычка';

  @override
  String get viewer3dError =>
      'Не удалось запустить 3D-просмотр на этом телефоне.';

  @override
  String get circuitLighting => 'Освещение';

  @override
  String circuitSockets(int n) {
    return 'Розетки, группа $n';
  }

  @override
  String circuitDedicated(String appliance) {
    return 'Отдельная линия: $appliance';
  }

  @override
  String breakerA(int a) {
    return 'Автомат $a А';
  }

  @override
  String crossSection(String mm2) {
    return 'Медь $mm2 мм²';
  }

  @override
  String designCurrent(int power, String current) {
    return 'Нагрузка $power Вт · $current А';
  }

  @override
  String vdrop(String pct) {
    return 'Потери напряжения $pct%';
  }

  @override
  String get panelWorkNote =>
      'Подключение в щите — только лицензированный электрик.';

  @override
  String segmentFromTo(String from, String to) {
    return '$from → $to';
  }

  @override
  String segmentLength(String m, String cable) {
    return '$m м кабеля ($cable)';
  }

  @override
  String routeTotal(String m) {
    return 'Общая длина трассы $m м';
  }

  @override
  String get routingRulesTitle => 'Правила прокладки';

  @override
  String get routingRules =>
      'Только вертикальные и горизонтальные трассы, без диагоналей.\nГоризонталь — на 15 см ниже потолка.\nВертикаль — не ближе 15 см от углов, дверей и окон.\nСоединения только в коробках.\nРозетки на 30 см, выключатели на 90–110 см от пола.';

  @override
  String get devInput => 'Ввод';

  @override
  String get devJunction => 'Коробка';

  @override
  String get devSocket => 'Розетка';

  @override
  String get devSwitch => 'Выключатель';

  @override
  String get devLamp => 'Светильник';

  @override
  String get diagramSingle => 'Одноклавишный выключатель и светильник';

  @override
  String get diagramDouble => 'Двухклавишный выключатель, две группы';

  @override
  String get diagramPass => 'Проходные выключатели';

  @override
  String get diagramSockets => 'Розеточная группа';

  @override
  String get diagramDedicated => 'Отдельная линия прибора';

  @override
  String get diagramNote =>
      'Цвета: коричневый/красный — фаза L, синий — ноль N, жёлто-зелёный — земля PE. Всегда проверяйте тестером.';

  @override
  String get materialsTotal => 'Итого';

  @override
  String get materialsOptional => 'Дополнительно (инструменты и светильники)';

  @override
  String materialsPricesNote(String region) {
    return 'Цены ориентировочные для региона $region. Нажмите на строку, чтобы изменить количество или цену.';
  }

  @override
  String materialsReserveNote(int pct) {
    return 'Кабель указан с запасом $pct%.';
  }

  @override
  String get quantity => 'Количество';

  @override
  String get unitPrice => 'Цена за единицу';

  @override
  String get includeInTotal => 'Учитывать в итоге';

  @override
  String get reasonElectricianInstalls => 'Устанавливает электрик в щите';

  @override
  String get reasonSafety => 'Обязательно для безопасности';

  @override
  String get reasonConduit => 'Обязательно в гипсокартоне и дереве';

  @override
  String get exportPdf => 'Экспорт PDF';

  @override
  String get stepsIntro => 'Рекомендуемый порядок работ';

  @override
  String get openLesson => 'Открыть урок';

  @override
  String get startWork => 'Начать работу (проверка безопасности)';

  @override
  String get markDone => 'Отметить проект как готовый';

  @override
  String get warningsTitle => 'Обратите внимание';

  @override
  String get editProject => 'Изменить проект';

  @override
  String get projectSaved => 'Проект сохранён';

  @override
  String get warn_input_assumed =>
      'Вводной кабель не отмечен — считаем, что он входит у стены A. Отметьте его для точного плана.';

  @override
  String get warn_switch_auto_added =>
      'Выключатель не отмечен — добавлен рядом с коробкой. Передвиньте его на плане.';

  @override
  String get warn_pass_unpaired =>
      'Проходные выключатели работают парами. Одиночный считается обычным.';

  @override
  String get warn_near_corner =>
      'Устройство было слишком близко к углу и сдвинуто на 15 см.';

  @override
  String get warn_too_many_lamps =>
      'Много светильников в одной группе. Проверьте общую мощность.';

  @override
  String get warn_extra_socket_groups =>
      'Розетки разделены на несколько групп. Каждая дополнительная группа — новая линия от щита, её подключает электрик.';

  @override
  String get warn_dedicated_socket_auto =>
      'Для мощного прибора добавлена розетка. Передвиньте её в нужное место.';

  @override
  String get warn_cable_upsized =>
      'Сечение кабеля увеличено из-за большой длины.';

  @override
  String get warn_switch_without_lamp =>
      'Есть выключатели, но нет светильников. Отметьте светильники.';

  @override
  String get warn_lighting_overload =>
      'Нагрузка освещения слишком велика для одной группы.';

  @override
  String get warn_socket_overload => 'Розеточная группа перегружена.';

  @override
  String get oosTitle => 'Эта работа — для лицензированного электрика';

  @override
  String get oosBody =>
      'Ради вашей безопасности ElektrUy не даёт инструкций для такой работы. Вызовите лицензированного электрика.';

  @override
  String get oosReasons => 'Почему:';

  @override
  String get oosFindElectrician => 'Найти электрика';

  @override
  String get oosLessons => 'Уроки остаются доступны';

  @override
  String get oosChangeAnswers => 'Изменить ответы';

  @override
  String get gateTitle => 'Проверка безопасности';

  @override
  String get gateBody => 'Отметьте все пункты. Без этого продолжить нельзя.';

  @override
  String get gateContinue => 'Всё сделано — продолжить';

  @override
  String get lessonsTitle => 'Уроки';

  @override
  String lessonMinutes(int n) {
    return '$n мин';
  }

  @override
  String get difficulty1 => 'Легко';

  @override
  String get difficulty2 => 'Средне';

  @override
  String get difficulty3 => 'Сложно';

  @override
  String get lessonCompleted => 'Пройден';

  @override
  String get lessonStart => 'Начать';

  @override
  String get lessonContinue => 'Продолжить';

  @override
  String lessonStepOf(int current, int total) {
    return 'Шаг $current из $total';
  }

  @override
  String get toolsNeeded => 'Инструменты';

  @override
  String get warningLabel => 'Внимание';

  @override
  String get stepDoneCheck => 'Я выполнил(а) этот шаг';

  @override
  String get nextStep => 'Следующий шаг';

  @override
  String get prevStep => 'Предыдущий';

  @override
  String get toQuiz => 'К тесту';

  @override
  String get quizTitle => 'Короткий тест';

  @override
  String get quizCorrect => 'Верно!';

  @override
  String get quizWrong => 'Не совсем.';

  @override
  String quizScore(int score) {
    return 'Ваш результат: $score%';
  }

  @override
  String get quizRetry => 'Пройти снова';

  @override
  String get quizFinish => 'Завершить урок';

  @override
  String get voiceGuide => 'Голосовой гид';

  @override
  String get voiceCommandsHint => 'Скажите «далее», «назад» или «повтор»';

  @override
  String get voiceUnavailable =>
      'Голосовые команды недоступны на этом телефоне.';

  @override
  String get voiceListening => 'Слушаю…';

  @override
  String get reportMistake => 'Сообщить об ошибке';

  @override
  String get lessonsOfflineReady => 'Все уроки доступны офлайн.';

  @override
  String get downloadsTitle => 'Офлайн-контент';

  @override
  String get downloadsBody =>
      'Уроки, тексты по безопасности, цены и 3D-просмотр хранятся на телефоне. Обновляйте их при наличии интернета.';

  @override
  String get downloadImages => 'Скачать картинки уроков';

  @override
  String get syncNow => 'Обновить сейчас';

  @override
  String lastSync(String date) {
    return 'Последнее обновление: $date';
  }

  @override
  String get neverSynced => 'Используется встроенный контент';

  @override
  String cachedItems(int lessons, int materials) {
    return 'Уроков: $lessons · материалов: $materials';
  }

  @override
  String get clearCache => 'Очистить загруженный контент';

  @override
  String get electriciansTitle => 'Электрики';

  @override
  String get filterRegion => 'Регион';

  @override
  String get filterDistrict => 'Район';

  @override
  String get allRegions => 'Все регионы';

  @override
  String get searchName => 'Поиск по имени или услуге';

  @override
  String get noElectricians => 'Здесь пока нет электриков.';

  @override
  String experienceYears(int n) {
    return 'Опыт $n лет';
  }

  @override
  String priceRange(String from, String to, String currency) {
    return '$from–$to $currency';
  }

  @override
  String ratingLabel(String avg, int count) {
    return '$avg ★ · отзывов: $count';
  }

  @override
  String get call => 'Позвонить';

  @override
  String get telegram => 'Telegram';

  @override
  String get reviews => 'Отзывы';

  @override
  String get noReviews => 'Отзывов пока нет';

  @override
  String get writeReview => 'Оставить отзыв';

  @override
  String get editReview => 'Изменить мой отзыв';

  @override
  String get yourRating => 'Ваша оценка';

  @override
  String get reviewText => 'Комментарий (необязательно)';

  @override
  String get reviewSaved => 'Спасибо за отзыв!';

  @override
  String get becomeElectrician => 'Я электрик';

  @override
  String get applyTitle => 'Анкета электрика';

  @override
  String get applyName => 'Имя и фамилия';

  @override
  String get applyPhone => 'Телефон, например +998 90 123 45 67';

  @override
  String get applyTelegram => 'Telegram (необязательно)';

  @override
  String get applyExperience => 'Опыт, лет';

  @override
  String get applyPriceFrom => 'Цена от';

  @override
  String get applyPriceTo => 'Цена до';

  @override
  String get applyBio => 'О себе и своей работе';

  @override
  String get applyServices => 'Услуги';

  @override
  String get applySubmit => 'Отправить на проверку';

  @override
  String get applyPending => 'Ваша анкета ожидает проверки администратором.';

  @override
  String get applyApproved => 'Ваша анкета опубликована.';

  @override
  String get applyRejected =>
      'Анкета не одобрена. Исправьте и отправьте снова.';

  @override
  String get applyBlocked => 'Ваша анкета заблокирована.';

  @override
  String get applyEditNote =>
      'Любое изменение снова отправляет анкету на проверку.';

  @override
  String get fieldRequired => 'Обязательно';

  @override
  String get phoneInvalid => 'Введите корректный номер';

  @override
  String get serviceSockets => 'Розетки и выключатели';

  @override
  String get serviceLighting => 'Освещение';

  @override
  String get serviceWiring => 'Замена проводки';

  @override
  String get servicePanel => 'Электрощит';

  @override
  String get serviceGrounding => 'Заземление';

  @override
  String get serviceInspection => 'Проверка';

  @override
  String get reportElectrician => 'Пожаловаться на анкету';

  @override
  String get checkTitle => 'Проверка работы';

  @override
  String get checkIntro =>
      'Сделайте 1–4 чётких фото готовой работы крупным планом (открытые коробки, клеммы, трассы). Перед вскрытием отключите питание.';

  @override
  String get checkContext => 'Что вы делали? (необязательно)';

  @override
  String get checkSend => 'Проверить с ИИ';

  @override
  String get checkChecking => 'Проверяем фото…';

  @override
  String get checkOk => 'Видимых проблем не найдено';

  @override
  String get checkWarning => 'Есть замечания';

  @override
  String get checkCritical => 'Критические проблемы';

  @override
  String get checkUnclear => 'Фото недостаточно чёткие';

  @override
  String get checkCallElectrician =>
      'Не включайте. Вызовите лицензированного электрика.';

  @override
  String get checkPositives => 'Хорошо сделано';

  @override
  String get checkFlagWrong => 'ИИ ошибся';

  @override
  String get checkFlagged => 'Спасибо — администратор проверит этот результат.';

  @override
  String get checkHistory => 'Предыдущие проверки';

  @override
  String get severityInfo => 'Совет';

  @override
  String get severityWarning => 'Замечание';

  @override
  String get severityCritical => 'Критично';

  @override
  String get aiDisclaimerShort =>
      'ИИ может пропустить ошибки. Это не экспертиза.';

  @override
  String get settingsTitle => 'Настройки';

  @override
  String get language => 'Язык';

  @override
  String get theme => 'Тема';

  @override
  String get themeSystem => 'Как в системе';

  @override
  String get themeLight => 'Светлая';

  @override
  String get themeDark => 'Тёмная';

  @override
  String get units => 'Единицы';

  @override
  String get unitsMeters => 'Метры';

  @override
  String get unitsCentimeters => 'Сантиметры';

  @override
  String get region => 'Регион (для цен)';

  @override
  String get currency => 'Валюта';

  @override
  String get legal => 'Юридические тексты';

  @override
  String appVersion(String v) {
    return 'Версия $v';
  }

  @override
  String get account => 'Аккаунт';

  @override
  String get deleteAccount => 'Удалить мои данные';

  @override
  String get deleteAccountBody =>
      'Это навсегда удалит все ваши проекты, фото, прогресс уроков, отзывы и ИИ-проверки в ElektrUy. Отменить нельзя.';

  @override
  String get deleteAccountTypeHint => 'Введите DELETE для подтверждения';

  @override
  String get deleteAccountDone => 'Ваши данные удалены.';

  @override
  String get about => 'О приложении';

  @override
  String get reportTitle => 'Сообщить о проблеме';

  @override
  String get reportText => 'Опишите проблему';

  @override
  String get reportSend => 'Отправить';

  @override
  String get reportSent => 'Отправлено. Спасибо!';

  @override
  String get pdfTitle => 'ElektrUy — план проводки комнаты';

  @override
  String pdfGenerated(String date) {
    return 'Создано $date';
  }

  @override
  String pdfRoom(String l, String w, String h) {
    return 'Комната $l × $w × $h м';
  }

  @override
  String get pdfCircuits => 'Группы';

  @override
  String get pdfCableRoute => 'Трасса кабеля';

  @override
  String get pdfMaterials => 'Материалы';

  @override
  String get pdfDiagrams => 'Схемы подключения';

  @override
  String get pdfItem => 'Позиция';

  @override
  String get pdfQty => 'Кол-во';

  @override
  String get pdfPrice => 'Цена';

  @override
  String get pdfSum => 'Сумма';

  @override
  String get signOutUnsynced =>
      'Часть изменений ещё не синхронизирована. Если выйти сейчас, они будут удалены с телефона.';

  @override
  String get voiceGuideAuto => 'Автоматически читать шаги урока вслух';

  @override
  String get voiceNoLanguage =>
      'Голос для этого языка не установлен — используется системный. Установите его в настройках Android → Синтез речи.';

  @override
  String legalAcceptedOn(String v, String date) {
    return 'Принята версия $v от $date';
  }

  @override
  String imagesDownloaded(int n) {
    return 'Загружено картинок: $n';
  }

  @override
  String get contentUpdated => 'Контент обновлён';

  @override
  String get privacyNote =>
      'Ваши фото приватны. Их видите только вы; администраторы видят фото проверки ИИ, только если вы пожаловались на результат.';

  @override
  String get offlineModeOn => 'Офлайн-режим (без аккаунта)';
}
