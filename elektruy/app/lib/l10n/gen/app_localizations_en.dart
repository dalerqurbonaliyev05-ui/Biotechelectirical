// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'ElektrUy';

  @override
  String get next => 'Next';

  @override
  String get back => 'Back';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get done => 'Done';

  @override
  String get close => 'Close';

  @override
  String get retry => 'Try again';

  @override
  String get continueLabel => 'Continue';

  @override
  String get skip => 'Skip';

  @override
  String get yes => 'Yes';

  @override
  String get no => 'No';

  @override
  String get ok => 'OK';

  @override
  String get add => 'Add';

  @override
  String get search => 'Search';

  @override
  String get loading => 'Loading…';

  @override
  String get offlineBanner =>
      'You are offline. Lessons, calculators and the 3D viewer still work.';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorNetwork => 'No internet connection.';

  @override
  String errorWithDetail(String detail) {
    return 'Error: $detail';
  }

  @override
  String get needsSignIn => 'Sign in to use this feature.';

  @override
  String get needsOnline => 'This feature needs internet.';

  @override
  String get unitM => 'm';

  @override
  String get unitCm => 'cm';

  @override
  String get unitPcs => 'pcs';

  @override
  String get unitKg => 'kg';

  @override
  String get currencyUZS => 'UZS';

  @override
  String get currencyUSD => 'USD';

  @override
  String get savedLocally => 'Saved on this phone';

  @override
  String get synced => 'Synced';

  @override
  String get chooseLanguage => 'Choose language';

  @override
  String get languageUz => 'O\'zbekcha';

  @override
  String get languageRu => 'Русский';

  @override
  String get languageEn => 'English';

  @override
  String get onb1Title => 'Plan your room wiring';

  @override
  String get onb1Body =>
      'Take photos, mark sockets, switches and lamps — get the cable route, diagram and material list.';

  @override
  String get onb2Title => 'Learn step by step';

  @override
  String get onb2Body =>
      'Short lessons with pictures and a voice guide that reads every step — even with dirty hands.';

  @override
  String get onb3Title => 'Safety first';

  @override
  String get onb3Body =>
      'Never work on live wires. If the job is too risky, the app tells you to call a licensed electrician.';

  @override
  String get disclaimerTitle => 'Safety and disclaimer';

  @override
  String get privacyTitle => 'Privacy policy';

  @override
  String get acceptDisclaimer =>
      'I have read and accept the safety rules and disclaimer';

  @override
  String get acceptPrivacy => 'I accept the privacy policy';

  @override
  String get mustAccept => 'Please accept both to continue.';

  @override
  String get reconsentTitle => 'The terms have been updated';

  @override
  String get reconsentBody =>
      'Please read and accept the new version to continue.';

  @override
  String get signInTitle => 'Sign in';

  @override
  String get signInBody =>
      'Sign in with Google to save projects, sync progress and use AI checks.';

  @override
  String get signInGoogle => 'Continue with Google';

  @override
  String signInError(String error) {
    return 'Sign-in failed: $error';
  }

  @override
  String get signInNotConfigured =>
      'Google sign-in is not configured in this build.';

  @override
  String get continueOffline => 'Continue offline (lessons and calculators)';

  @override
  String get signOut => 'Sign out';

  @override
  String signedInAs(String email) {
    return 'Signed in as $email';
  }

  @override
  String get notSignedIn => 'Not signed in';

  @override
  String homeGreeting(String name) {
    return 'Hello, $name!';
  }

  @override
  String get homeGreetingAnon => 'Hello!';

  @override
  String get myProjects => 'My projects';

  @override
  String get newProject => 'New room project';

  @override
  String get lessons => 'Lessons';

  @override
  String get materialsCalc => 'Materials calculator';

  @override
  String get electricians => 'Electricians';

  @override
  String get settings => 'Settings';

  @override
  String get checkWork => 'Check my work';

  @override
  String get noProjects => 'No projects yet';

  @override
  String get noProjectsHint => 'Start by taking photos of one small room.';

  @override
  String get projectUntitled => 'Room project';

  @override
  String get projectTitleLabel => 'Project name';

  @override
  String get deleteProjectConfirm => 'Delete this project and its photos?';

  @override
  String get statusDraft => 'Draft';

  @override
  String get statusPlanned => 'Planned';

  @override
  String get statusInProgress => 'In progress';

  @override
  String get statusDone => 'Done';

  @override
  String get statusOutOfScope => 'Electrician needed';

  @override
  String get wizardTitle => 'Room project';

  @override
  String get stepPhotos => 'Photos';

  @override
  String get stepMarkers => 'Markers';

  @override
  String get stepDimensions => 'Size';

  @override
  String get stepQuestions => 'Questions';

  @override
  String stepOf(int current, int total) {
    return 'Step $current of $total';
  }

  @override
  String get photosTitle => 'Add 1–6 photos of the room';

  @override
  String get photosHint =>
      'Photograph each wall from the opposite side so the floor and ceiling are visible. Sockets, switches and lamps should be clearly seen.';

  @override
  String get takePhoto => 'Take photo';

  @override
  String get pickFromGallery => 'Gallery';

  @override
  String get photoLimit => 'Up to 6 photos';

  @override
  String get photoShowsWall => 'This photo shows wall:';

  @override
  String wallName(String name) {
    return 'Wall $name';
  }

  @override
  String get wallsHelp =>
      'Stand in the room facing the wall with the door — that is wall A. Turn to your left: the next wall is B, then C, then D.';

  @override
  String get needOnePhoto => 'Add at least one photo.';

  @override
  String get markersTitle => 'Mark the points';

  @override
  String get markersHint =>
      'Choose a type and tap the photo. Drag a marker to move it, tap it to edit or delete.';

  @override
  String get markerInput => 'Input cable';

  @override
  String get markerSocket => 'Socket';

  @override
  String get markerSwitch => 'Switch';

  @override
  String get markerLamp => 'Lamp';

  @override
  String get markerJunction => 'Junction box';

  @override
  String get markerNote => 'Note';

  @override
  String get markerDelete => 'Delete marker';

  @override
  String get markerSamePoint => 'Same point as on another photo';

  @override
  String get markerSamePointNone => 'New point';

  @override
  String get switchType => 'Switch type';

  @override
  String get switchSingle => 'Single-gang';

  @override
  String get switchDouble => 'Double-gang';

  @override
  String get switchPass => 'Pass-through (two-way)';

  @override
  String get lampMount => 'Mounted on';

  @override
  String get lampCeiling => 'Ceiling';

  @override
  String get lampWall => 'Wall';

  @override
  String markersCount(int sockets, int switches, int lamps) {
    return '$sockets sockets · $switches switches · $lamps lamps';
  }

  @override
  String get markersNone =>
      'No markers yet — you can also skip and add devices on the plan.';

  @override
  String get dimsTitle => 'Room dimensions';

  @override
  String get dimLength => 'Length';

  @override
  String get dimWidth => 'Width';

  @override
  String get dimHeight => 'Height';

  @override
  String get dimManual => 'Enter manually';

  @override
  String get dimAi => 'AI estimate from photo';

  @override
  String get dimAr => 'Measure with camera (AR)';

  @override
  String dimInvalid(String min, String max) {
    return 'Enter a value between $min and $max';
  }

  @override
  String get aiEstimating => 'Estimating from your photos…';

  @override
  String get aiResultTitle => 'AI estimate';

  @override
  String aiConfidence(String level) {
    return 'Confidence: $level';
  }

  @override
  String get confidenceLow => 'low';

  @override
  String get confidenceMedium => 'medium';

  @override
  String get confidenceHigh => 'high';

  @override
  String get aiConfirmHint =>
      'AI estimates are approximate. Check with a tape measure and correct the numbers before you continue.';

  @override
  String get aiUnusable =>
      'The AI could not estimate the size from these photos. Please enter it manually.';

  @override
  String get useValues => 'Use these values';

  @override
  String get arUnsupported =>
      'This phone does not support AR measuring. Please enter the size manually.';

  @override
  String get arMeasureWhat => 'What do you want to measure?';

  @override
  String get arTapFirst => 'Tap the first point';

  @override
  String get arTapSecond => 'Tap the second point';

  @override
  String get arScanHint =>
      'Move the phone slowly so it can find the floor and walls.';

  @override
  String get arUse => 'Use';

  @override
  String get arReset => 'Reset';

  @override
  String arResult(String value) {
    return 'Measured: $value m';
  }

  @override
  String get questionsTitle => 'A few questions';

  @override
  String get qSockets => 'Sockets';

  @override
  String get qLamps => 'Lamps';

  @override
  String get qSwitches => 'Switches';

  @override
  String get qCountsHint =>
      'Counts come from your markers. Devices without a marker are placed automatically — move them on the plan.';

  @override
  String get qJunctionBox => 'There is already a junction box in the room';

  @override
  String get qWallMaterial => 'Wall material';

  @override
  String get wallBrick => 'Brick';

  @override
  String get wallConcrete => 'Concrete';

  @override
  String get wallGypsum => 'Gypsum board';

  @override
  String get wallWood => 'Wood';

  @override
  String get qWiringType => 'Wiring type';

  @override
  String get wiringHidden => 'Hidden (in wall chases)';

  @override
  String get wiringOpen => 'Open (cable channel or conduit)';

  @override
  String get qHasPe => 'There is a yellow-green earth (PE) wire';

  @override
  String get qPanelDistance =>
      'Approximate cable length to the electric panel, m';

  @override
  String get qLampPower => 'Power per lamp, W';

  @override
  String get qAppliances => 'Planned appliances';

  @override
  String get qAppliancePower => 'Power, W';

  @override
  String get qApplianceSocket => 'Socket for this appliance';

  @override
  String get qApplianceAutoSocket => 'Add a new socket';

  @override
  String get qChecksTitle => 'Important — answer honestly';

  @override
  String get qPanelWork => 'The job needs work inside the electric panel';

  @override
  String get qGrounding => 'I need to install or change grounding';

  @override
  String get qThreePhase => 'The house has a 3-phase supply';

  @override
  String get qWetZone => 'This is a bathroom, shower or other wet room';

  @override
  String get qAluminium => 'The old wiring is aluminium';

  @override
  String get qDamaged => 'I see burn marks, smell burning or see sparks';

  @override
  String get qUnsure =>
      'Not sure about any of these? Ask an electrician first.';

  @override
  String get buildPlan => 'Build plan';

  @override
  String get resultTitle => 'Wiring plan';

  @override
  String get tabPlan => 'Plan 2D';

  @override
  String get tab3d => '3D';

  @override
  String get tabRoute => 'Cable route';

  @override
  String get tabDiagram => 'Diagram';

  @override
  String get tabMaterials => 'Materials';

  @override
  String get tabSteps => 'Steps';

  @override
  String get topView => 'Top view';

  @override
  String get planDragHint =>
      'Long-press a device and drag it along the wall to move it.';

  @override
  String get legendPhase => 'Phase (L)';

  @override
  String get legendNeutral => 'Neutral (N)';

  @override
  String get legendPe => 'Earth (PE)';

  @override
  String get legendSwitched => 'Switched phase';

  @override
  String get legendTraveller => 'Traveller';

  @override
  String get viewer3dError => 'The 3D view could not start on this phone.';

  @override
  String get circuitLighting => 'Lighting';

  @override
  String circuitSockets(int n) {
    return 'Sockets, group $n';
  }

  @override
  String circuitDedicated(String appliance) {
    return 'Dedicated line: $appliance';
  }

  @override
  String breakerA(int a) {
    return 'Breaker $a A';
  }

  @override
  String crossSection(String mm2) {
    return 'Copper $mm2 mm²';
  }

  @override
  String designCurrent(int power, String current) {
    return 'Load $power W · $current A';
  }

  @override
  String vdrop(String pct) {
    return 'Voltage drop $pct%';
  }

  @override
  String get panelWorkNote =>
      'Connection in the panel: licensed electrician only.';

  @override
  String segmentFromTo(String from, String to) {
    return '$from → $to';
  }

  @override
  String segmentLength(String m, String cable) {
    return '$m m of cable ($cable)';
  }

  @override
  String routeTotal(String m) {
    return 'Total cable route $m m';
  }

  @override
  String get routingRulesTitle => 'Routing rules';

  @override
  String get routingRules =>
      'Only vertical and horizontal runs, never diagonal.\nHorizontal runs 15 cm below the ceiling.\nVertical runs at least 15 cm from corners, doors and windows.\nJoints only inside junction or socket boxes.\nSockets 30 cm and switches 90–110 cm above the floor.';

  @override
  String get devInput => 'Input';

  @override
  String get devJunction => 'Junction box';

  @override
  String get devSocket => 'Socket';

  @override
  String get devSwitch => 'Switch';

  @override
  String get devLamp => 'Lamp';

  @override
  String get diagramSingle => 'Single-gang switch and lamp';

  @override
  String get diagramDouble => 'Double-gang switch, two lamp groups';

  @override
  String get diagramPass => 'Two-way (pass-through) switches';

  @override
  String get diagramSockets => 'Socket group';

  @override
  String get diagramDedicated => 'Dedicated appliance line';

  @override
  String get diagramNote =>
      'Wire colours: brown/red — phase L, blue — neutral N, yellow-green — earth PE. Always verify with a tester.';

  @override
  String get materialsTotal => 'Total';

  @override
  String get materialsOptional => 'Optional (tools and fixtures)';

  @override
  String materialsPricesNote(String region) {
    return 'Prices are estimates for $region. Tap a line to change quantity or price.';
  }

  @override
  String materialsReserveNote(int pct) {
    return 'Cable includes a $pct% reserve.';
  }

  @override
  String get quantity => 'Quantity';

  @override
  String get unitPrice => 'Unit price';

  @override
  String get includeInTotal => 'Include in total';

  @override
  String get reasonElectricianInstalls =>
      'Installed in the panel by an electrician';

  @override
  String get reasonSafety => 'Required for safety';

  @override
  String get reasonConduit => 'Required in drywall and wooden walls';

  @override
  String get exportPdf => 'Export PDF';

  @override
  String get stepsIntro => 'Recommended order of work';

  @override
  String get openLesson => 'Open lesson';

  @override
  String get startWork => 'Start work (safety check)';

  @override
  String get markDone => 'Mark project as done';

  @override
  String get warningsTitle => 'Check these';

  @override
  String get editProject => 'Edit project';

  @override
  String get projectSaved => 'Project saved';

  @override
  String get warn_input_assumed =>
      'No input cable was marked — we assumed it enters near wall A. Mark it for a better plan.';

  @override
  String get warn_switch_auto_added =>
      'No switch was marked — one was added next to the junction box. Move it on the plan.';

  @override
  String get warn_pass_unpaired =>
      'Pass-through switches work in pairs. The single one is treated as a normal switch.';

  @override
  String get warn_near_corner =>
      'A device was too close to a corner and was moved 15 cm away.';

  @override
  String get warn_too_many_lamps =>
      'Many lamps on one circuit. Check the total power.';

  @override
  String get warn_extra_socket_groups =>
      'Sockets were split into several groups. Each extra group is a new line from the panel — an electrician must connect it.';

  @override
  String get warn_dedicated_socket_auto =>
      'A socket was added for a powerful appliance. Move it to the right place.';

  @override
  String get warn_cable_upsized =>
      'The cable was made thicker because of a long run.';

  @override
  String get warn_switch_without_lamp =>
      'There are switches but no lamps. Mark the lamps.';

  @override
  String get warn_lighting_overload =>
      'The lighting load is too high for one circuit.';

  @override
  String get warn_socket_overload => 'A socket group is overloaded.';

  @override
  String get oosTitle => 'This job needs a licensed electrician';

  @override
  String get oosBody =>
      'For your safety ElektrUy does not give instructions for this work. Please call a licensed electrician.';

  @override
  String get oosReasons => 'Why:';

  @override
  String get oosFindElectrician => 'Find an electrician';

  @override
  String get oosLessons => 'You can still read the lessons';

  @override
  String get oosChangeAnswers => 'Change answers';

  @override
  String get gateTitle => 'Safety check';

  @override
  String get gateBody =>
      'Tick every item. You cannot continue until all are done.';

  @override
  String get gateContinue => 'All done — continue';

  @override
  String get lessonsTitle => 'Lessons';

  @override
  String lessonMinutes(int n) {
    return '$n min';
  }

  @override
  String get difficulty1 => 'Easy';

  @override
  String get difficulty2 => 'Medium';

  @override
  String get difficulty3 => 'Hard';

  @override
  String get lessonCompleted => 'Completed';

  @override
  String get lessonStart => 'Start';

  @override
  String get lessonContinue => 'Continue';

  @override
  String lessonStepOf(int current, int total) {
    return 'Step $current of $total';
  }

  @override
  String get toolsNeeded => 'Tools';

  @override
  String get warningLabel => 'Warning';

  @override
  String get stepDoneCheck => 'I did this step';

  @override
  String get nextStep => 'Next step';

  @override
  String get prevStep => 'Previous';

  @override
  String get toQuiz => 'Go to quiz';

  @override
  String get quizTitle => 'Quick quiz';

  @override
  String get quizCorrect => 'Correct!';

  @override
  String get quizWrong => 'Not quite.';

  @override
  String quizScore(int score) {
    return 'Your score: $score%';
  }

  @override
  String get quizRetry => 'Try again';

  @override
  String get quizFinish => 'Finish lesson';

  @override
  String get voiceGuide => 'Voice guide';

  @override
  String get voiceCommandsHint => 'Say \"next\", \"back\" or \"repeat\"';

  @override
  String get voiceUnavailable =>
      'Voice commands are not available on this phone.';

  @override
  String get voiceListening => 'Listening…';

  @override
  String get reportMistake => 'Report a mistake';

  @override
  String get lessonsOfflineReady => 'All lessons are available offline.';

  @override
  String get downloadsTitle => 'Offline content';

  @override
  String get downloadsBody =>
      'Lessons, safety texts, prices and the 3D viewer are stored on your phone. Update them when you have internet.';

  @override
  String get downloadImages => 'Download lesson pictures';

  @override
  String get syncNow => 'Update now';

  @override
  String lastSync(String date) {
    return 'Last update: $date';
  }

  @override
  String get neverSynced => 'Using the built-in content';

  @override
  String cachedItems(int lessons, int materials) {
    return '$lessons lessons · $materials materials';
  }

  @override
  String get clearCache => 'Clear downloaded content';

  @override
  String get electriciansTitle => 'Electricians';

  @override
  String get filterRegion => 'Region';

  @override
  String get filterDistrict => 'District';

  @override
  String get allRegions => 'All regions';

  @override
  String get searchName => 'Search by name or service';

  @override
  String get noElectricians => 'No electricians found here yet.';

  @override
  String experienceYears(int n) {
    return '$n years of experience';
  }

  @override
  String priceRange(String from, String to, String currency) {
    return '$from–$to $currency';
  }

  @override
  String ratingLabel(String avg, int count) {
    return '$avg ★ · $count reviews';
  }

  @override
  String get call => 'Call';

  @override
  String get telegram => 'Telegram';

  @override
  String get reviews => 'Reviews';

  @override
  String get noReviews => 'No reviews yet';

  @override
  String get writeReview => 'Write a review';

  @override
  String get editReview => 'Edit my review';

  @override
  String get yourRating => 'Your rating';

  @override
  String get reviewText => 'Comment (optional)';

  @override
  String get reviewSaved => 'Thank you for your review!';

  @override
  String get becomeElectrician => 'I am an electrician';

  @override
  String get applyTitle => 'Electrician profile';

  @override
  String get applyName => 'Full name';

  @override
  String get applyPhone => 'Phone, e.g. +998 90 123 45 67';

  @override
  String get applyTelegram => 'Telegram username (optional)';

  @override
  String get applyExperience => 'Experience, years';

  @override
  String get applyPriceFrom => 'Price from';

  @override
  String get applyPriceTo => 'Price to';

  @override
  String get applyBio => 'About you and your work';

  @override
  String get applyServices => 'Services';

  @override
  String get applySubmit => 'Send for review';

  @override
  String get applyPending => 'Your profile is waiting for review by an admin.';

  @override
  String get applyApproved => 'Your profile is published.';

  @override
  String get applyRejected =>
      'Your profile was not approved. Edit it and send again.';

  @override
  String get applyBlocked => 'Your profile is blocked.';

  @override
  String get applyEditNote => 'Any change sends the profile for review again.';

  @override
  String get fieldRequired => 'Required';

  @override
  String get phoneInvalid => 'Enter a valid phone number';

  @override
  String get serviceSockets => 'Sockets and switches';

  @override
  String get serviceLighting => 'Lighting';

  @override
  String get serviceWiring => 'Full rewiring';

  @override
  String get servicePanel => 'Distribution panel';

  @override
  String get serviceGrounding => 'Grounding';

  @override
  String get serviceInspection => 'Inspection';

  @override
  String get reportElectrician => 'Report this profile';

  @override
  String get checkTitle => 'Check my work';

  @override
  String get checkIntro =>
      'Take 1–4 clear, close photos of the finished work (open boxes, terminals, cable routes). Switch the power off before opening anything.';

  @override
  String get checkContext => 'What did you do? (optional)';

  @override
  String get checkSend => 'Check with AI';

  @override
  String get checkChecking => 'Checking your photos…';

  @override
  String get checkOk => 'No visible problems found';

  @override
  String get checkWarning => 'Warnings found';

  @override
  String get checkCritical => 'Critical problems';

  @override
  String get checkUnclear => 'The photos are not clear enough';

  @override
  String get checkCallElectrician =>
      'Do not switch on. Call a licensed electrician.';

  @override
  String get checkPositives => 'Looks good';

  @override
  String get checkFlagWrong => 'The AI is wrong';

  @override
  String get checkFlagged => 'Thank you — an admin will review this result.';

  @override
  String get checkHistory => 'Previous checks';

  @override
  String get severityInfo => 'Info';

  @override
  String get severityWarning => 'Warning';

  @override
  String get severityCritical => 'Critical';

  @override
  String get aiDisclaimerShort =>
      'AI can miss problems. This is not an inspection.';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get theme => 'Theme';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get units => 'Units';

  @override
  String get unitsMeters => 'Metres';

  @override
  String get unitsCentimeters => 'Centimetres';

  @override
  String get region => 'Region (for prices)';

  @override
  String get currency => 'Currency';

  @override
  String get legal => 'Legal texts';

  @override
  String appVersion(String v) {
    return 'Version $v';
  }

  @override
  String get account => 'Account';

  @override
  String get deleteAccount => 'Delete my data';

  @override
  String get deleteAccountBody =>
      'This permanently deletes all your projects, photos, lesson progress, reviews and AI checks in ElektrUy. It cannot be undone.';

  @override
  String get deleteAccountTypeHint => 'Type DELETE to confirm';

  @override
  String get deleteAccountDone => 'Your data was deleted.';

  @override
  String get about => 'About';

  @override
  String get reportTitle => 'Report a problem';

  @override
  String get reportText => 'Describe the problem';

  @override
  String get reportSend => 'Send';

  @override
  String get reportSent => 'Sent. Thank you!';

  @override
  String get pdfTitle => 'ElektrUy — room wiring plan';

  @override
  String pdfGenerated(String date) {
    return 'Created $date';
  }

  @override
  String pdfRoom(String l, String w, String h) {
    return 'Room $l × $w × $h m';
  }

  @override
  String get pdfCircuits => 'Circuits';

  @override
  String get pdfCableRoute => 'Cable route';

  @override
  String get pdfMaterials => 'Materials';

  @override
  String get pdfDiagrams => 'Wiring diagrams';

  @override
  String get pdfItem => 'Item';

  @override
  String get pdfQty => 'Qty';

  @override
  String get pdfPrice => 'Price';

  @override
  String get pdfSum => 'Sum';

  @override
  String get signOutUnsynced =>
      'Some changes are not synced yet. If you sign out now they will be removed from this phone.';

  @override
  String get voiceGuideAuto => 'Read lesson steps aloud automatically';

  @override
  String get voiceNoLanguage =>
      'No voice for this language is installed — the system voice is used. Install it in Android settings → Text-to-speech.';

  @override
  String legalAcceptedOn(String v, String date) {
    return 'Accepted version $v on $date';
  }

  @override
  String imagesDownloaded(int n) {
    return '$n pictures downloaded';
  }

  @override
  String get contentUpdated => 'Content updated';

  @override
  String get privacyNote =>
      'Your photos are private. Only you can see them; admins see AI-check photos only if you flag the result.';

  @override
  String get offlineModeOn => 'Offline mode (no account)';
}
