import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ru.dart';
import 'app_localizations_uz.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ru'),
    Locale('uz'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'ElektrUy'**
  String get appTitle;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get next;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// No description provided for @skip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get skip;

  /// No description provided for @yes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get yes;

  /// No description provided for @no.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get no;

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @offlineBanner.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Lessons, calculators and the 3D viewer still work.'**
  String get offlineBanner;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'No internet connection.'**
  String get errorNetwork;

  /// No description provided for @errorWithDetail.
  ///
  /// In en, this message translates to:
  /// **'Error: {detail}'**
  String errorWithDetail(String detail);

  /// No description provided for @needsSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to use this feature.'**
  String get needsSignIn;

  /// No description provided for @needsOnline.
  ///
  /// In en, this message translates to:
  /// **'This feature needs internet.'**
  String get needsOnline;

  /// No description provided for @unitM.
  ///
  /// In en, this message translates to:
  /// **'m'**
  String get unitM;

  /// No description provided for @unitCm.
  ///
  /// In en, this message translates to:
  /// **'cm'**
  String get unitCm;

  /// No description provided for @unitPcs.
  ///
  /// In en, this message translates to:
  /// **'pcs'**
  String get unitPcs;

  /// No description provided for @unitKg.
  ///
  /// In en, this message translates to:
  /// **'kg'**
  String get unitKg;

  /// No description provided for @currencyUZS.
  ///
  /// In en, this message translates to:
  /// **'UZS'**
  String get currencyUZS;

  /// No description provided for @currencyUSD.
  ///
  /// In en, this message translates to:
  /// **'USD'**
  String get currencyUSD;

  /// No description provided for @savedLocally.
  ///
  /// In en, this message translates to:
  /// **'Saved on this phone'**
  String get savedLocally;

  /// No description provided for @synced.
  ///
  /// In en, this message translates to:
  /// **'Synced'**
  String get synced;

  /// No description provided for @chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose language'**
  String get chooseLanguage;

  /// No description provided for @languageUz.
  ///
  /// In en, this message translates to:
  /// **'O\'zbekcha'**
  String get languageUz;

  /// No description provided for @languageRu.
  ///
  /// In en, this message translates to:
  /// **'Русский'**
  String get languageRu;

  /// No description provided for @languageEn.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEn;

  /// No description provided for @onb1Title.
  ///
  /// In en, this message translates to:
  /// **'Plan your room wiring'**
  String get onb1Title;

  /// No description provided for @onb1Body.
  ///
  /// In en, this message translates to:
  /// **'Take photos, mark sockets, switches and lamps — get the cable route, diagram and material list.'**
  String get onb1Body;

  /// No description provided for @onb2Title.
  ///
  /// In en, this message translates to:
  /// **'Learn step by step'**
  String get onb2Title;

  /// No description provided for @onb2Body.
  ///
  /// In en, this message translates to:
  /// **'Short lessons with pictures and a voice guide that reads every step — even with dirty hands.'**
  String get onb2Body;

  /// No description provided for @onb3Title.
  ///
  /// In en, this message translates to:
  /// **'Safety first'**
  String get onb3Title;

  /// No description provided for @onb3Body.
  ///
  /// In en, this message translates to:
  /// **'Never work on live wires. If the job is too risky, the app tells you to call a licensed electrician.'**
  String get onb3Body;

  /// No description provided for @disclaimerTitle.
  ///
  /// In en, this message translates to:
  /// **'Safety and disclaimer'**
  String get disclaimerTitle;

  /// No description provided for @privacyTitle.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get privacyTitle;

  /// No description provided for @acceptDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'I have read and accept the safety rules and disclaimer'**
  String get acceptDisclaimer;

  /// No description provided for @acceptPrivacy.
  ///
  /// In en, this message translates to:
  /// **'I accept the privacy policy'**
  String get acceptPrivacy;

  /// No description provided for @mustAccept.
  ///
  /// In en, this message translates to:
  /// **'Please accept both to continue.'**
  String get mustAccept;

  /// No description provided for @reconsentTitle.
  ///
  /// In en, this message translates to:
  /// **'The terms have been updated'**
  String get reconsentTitle;

  /// No description provided for @reconsentBody.
  ///
  /// In en, this message translates to:
  /// **'Please read and accept the new version to continue.'**
  String get reconsentBody;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInTitle;

  /// No description provided for @signInBody.
  ///
  /// In en, this message translates to:
  /// **'Sign in with Google to save projects, sync progress and use AI checks.'**
  String get signInBody;

  /// No description provided for @signInGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get signInGoogle;

  /// No description provided for @signInError.
  ///
  /// In en, this message translates to:
  /// **'Sign-in failed: {error}'**
  String signInError(String error);

  /// No description provided for @signInNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Google sign-in is not configured in this build.'**
  String get signInNotConfigured;

  /// No description provided for @continueOffline.
  ///
  /// In en, this message translates to:
  /// **'Continue offline (lessons and calculators)'**
  String get continueOffline;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @signedInAs.
  ///
  /// In en, this message translates to:
  /// **'Signed in as {email}'**
  String signedInAs(String email);

  /// No description provided for @notSignedIn.
  ///
  /// In en, this message translates to:
  /// **'Not signed in'**
  String get notSignedIn;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}!'**
  String homeGreeting(String name);

  /// No description provided for @homeGreetingAnon.
  ///
  /// In en, this message translates to:
  /// **'Hello!'**
  String get homeGreetingAnon;

  /// No description provided for @myProjects.
  ///
  /// In en, this message translates to:
  /// **'My projects'**
  String get myProjects;

  /// No description provided for @newProject.
  ///
  /// In en, this message translates to:
  /// **'New room project'**
  String get newProject;

  /// No description provided for @lessons.
  ///
  /// In en, this message translates to:
  /// **'Lessons'**
  String get lessons;

  /// No description provided for @materialsCalc.
  ///
  /// In en, this message translates to:
  /// **'Materials calculator'**
  String get materialsCalc;

  /// No description provided for @electricians.
  ///
  /// In en, this message translates to:
  /// **'Electricians'**
  String get electricians;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @checkWork.
  ///
  /// In en, this message translates to:
  /// **'Check my work'**
  String get checkWork;

  /// No description provided for @noProjects.
  ///
  /// In en, this message translates to:
  /// **'No projects yet'**
  String get noProjects;

  /// No description provided for @noProjectsHint.
  ///
  /// In en, this message translates to:
  /// **'Start by taking photos of one small room.'**
  String get noProjectsHint;

  /// No description provided for @projectUntitled.
  ///
  /// In en, this message translates to:
  /// **'Room project'**
  String get projectUntitled;

  /// No description provided for @projectTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Project name'**
  String get projectTitleLabel;

  /// No description provided for @deleteProjectConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this project and its photos?'**
  String get deleteProjectConfirm;

  /// No description provided for @statusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get statusDraft;

  /// No description provided for @statusPlanned.
  ///
  /// In en, this message translates to:
  /// **'Planned'**
  String get statusPlanned;

  /// No description provided for @statusInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get statusInProgress;

  /// No description provided for @statusDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get statusDone;

  /// No description provided for @statusOutOfScope.
  ///
  /// In en, this message translates to:
  /// **'Electrician needed'**
  String get statusOutOfScope;

  /// No description provided for @wizardTitle.
  ///
  /// In en, this message translates to:
  /// **'Room project'**
  String get wizardTitle;

  /// No description provided for @stepPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get stepPhotos;

  /// No description provided for @stepMarkers.
  ///
  /// In en, this message translates to:
  /// **'Markers'**
  String get stepMarkers;

  /// No description provided for @stepDimensions.
  ///
  /// In en, this message translates to:
  /// **'Size'**
  String get stepDimensions;

  /// No description provided for @stepQuestions.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get stepQuestions;

  /// No description provided for @stepOf.
  ///
  /// In en, this message translates to:
  /// **'Step {current} of {total}'**
  String stepOf(int current, int total);

  /// No description provided for @photosTitle.
  ///
  /// In en, this message translates to:
  /// **'Add 1–6 photos of the room'**
  String get photosTitle;

  /// No description provided for @photosHint.
  ///
  /// In en, this message translates to:
  /// **'Photograph each wall from the opposite side so the floor and ceiling are visible. Sockets, switches and lamps should be clearly seen.'**
  String get photosHint;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get takePhoto;

  /// No description provided for @pickFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Gallery'**
  String get pickFromGallery;

  /// No description provided for @photoLimit.
  ///
  /// In en, this message translates to:
  /// **'Up to 6 photos'**
  String get photoLimit;

  /// No description provided for @photoShowsWall.
  ///
  /// In en, this message translates to:
  /// **'This photo shows wall:'**
  String get photoShowsWall;

  /// No description provided for @wallName.
  ///
  /// In en, this message translates to:
  /// **'Wall {name}'**
  String wallName(String name);

  /// No description provided for @wallsHelp.
  ///
  /// In en, this message translates to:
  /// **'Stand in the room facing the wall with the door — that is wall A. Turn to your left: the next wall is B, then C, then D.'**
  String get wallsHelp;

  /// No description provided for @needOnePhoto.
  ///
  /// In en, this message translates to:
  /// **'Add at least one photo.'**
  String get needOnePhoto;

  /// No description provided for @markersTitle.
  ///
  /// In en, this message translates to:
  /// **'Mark the points'**
  String get markersTitle;

  /// No description provided for @markersHint.
  ///
  /// In en, this message translates to:
  /// **'Choose a type and tap the photo. Drag a marker to move it, tap it to edit or delete.'**
  String get markersHint;

  /// No description provided for @markerInput.
  ///
  /// In en, this message translates to:
  /// **'Input cable'**
  String get markerInput;

  /// No description provided for @markerSocket.
  ///
  /// In en, this message translates to:
  /// **'Socket'**
  String get markerSocket;

  /// No description provided for @markerSwitch.
  ///
  /// In en, this message translates to:
  /// **'Switch'**
  String get markerSwitch;

  /// No description provided for @markerLamp.
  ///
  /// In en, this message translates to:
  /// **'Lamp'**
  String get markerLamp;

  /// No description provided for @markerJunction.
  ///
  /// In en, this message translates to:
  /// **'Junction box'**
  String get markerJunction;

  /// No description provided for @markerNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get markerNote;

  /// No description provided for @markerDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete marker'**
  String get markerDelete;

  /// No description provided for @markerSamePoint.
  ///
  /// In en, this message translates to:
  /// **'Same point as on another photo'**
  String get markerSamePoint;

  /// No description provided for @markerSamePointNone.
  ///
  /// In en, this message translates to:
  /// **'New point'**
  String get markerSamePointNone;

  /// No description provided for @switchType.
  ///
  /// In en, this message translates to:
  /// **'Switch type'**
  String get switchType;

  /// No description provided for @switchSingle.
  ///
  /// In en, this message translates to:
  /// **'Single-gang'**
  String get switchSingle;

  /// No description provided for @switchDouble.
  ///
  /// In en, this message translates to:
  /// **'Double-gang'**
  String get switchDouble;

  /// No description provided for @switchPass.
  ///
  /// In en, this message translates to:
  /// **'Pass-through (two-way)'**
  String get switchPass;

  /// No description provided for @lampMount.
  ///
  /// In en, this message translates to:
  /// **'Mounted on'**
  String get lampMount;

  /// No description provided for @lampCeiling.
  ///
  /// In en, this message translates to:
  /// **'Ceiling'**
  String get lampCeiling;

  /// No description provided for @lampWall.
  ///
  /// In en, this message translates to:
  /// **'Wall'**
  String get lampWall;

  /// No description provided for @markersCount.
  ///
  /// In en, this message translates to:
  /// **'{sockets} sockets · {switches} switches · {lamps} lamps'**
  String markersCount(int sockets, int switches, int lamps);

  /// No description provided for @markersNone.
  ///
  /// In en, this message translates to:
  /// **'No markers yet — you can also skip and add devices on the plan.'**
  String get markersNone;

  /// No description provided for @dimsTitle.
  ///
  /// In en, this message translates to:
  /// **'Room dimensions'**
  String get dimsTitle;

  /// No description provided for @dimLength.
  ///
  /// In en, this message translates to:
  /// **'Length'**
  String get dimLength;

  /// No description provided for @dimWidth.
  ///
  /// In en, this message translates to:
  /// **'Width'**
  String get dimWidth;

  /// No description provided for @dimHeight.
  ///
  /// In en, this message translates to:
  /// **'Height'**
  String get dimHeight;

  /// No description provided for @dimManual.
  ///
  /// In en, this message translates to:
  /// **'Enter manually'**
  String get dimManual;

  /// No description provided for @dimAi.
  ///
  /// In en, this message translates to:
  /// **'AI estimate from photo'**
  String get dimAi;

  /// No description provided for @dimAr.
  ///
  /// In en, this message translates to:
  /// **'Measure with camera (AR)'**
  String get dimAr;

  /// No description provided for @dimInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a value between {min} and {max}'**
  String dimInvalid(String min, String max);

  /// No description provided for @aiEstimating.
  ///
  /// In en, this message translates to:
  /// **'Estimating from your photos…'**
  String get aiEstimating;

  /// No description provided for @aiResultTitle.
  ///
  /// In en, this message translates to:
  /// **'AI estimate'**
  String get aiResultTitle;

  /// No description provided for @aiConfidence.
  ///
  /// In en, this message translates to:
  /// **'Confidence: {level}'**
  String aiConfidence(String level);

  /// No description provided for @confidenceLow.
  ///
  /// In en, this message translates to:
  /// **'low'**
  String get confidenceLow;

  /// No description provided for @confidenceMedium.
  ///
  /// In en, this message translates to:
  /// **'medium'**
  String get confidenceMedium;

  /// No description provided for @confidenceHigh.
  ///
  /// In en, this message translates to:
  /// **'high'**
  String get confidenceHigh;

  /// No description provided for @aiConfirmHint.
  ///
  /// In en, this message translates to:
  /// **'AI estimates are approximate. Check with a tape measure and correct the numbers before you continue.'**
  String get aiConfirmHint;

  /// No description provided for @aiUnusable.
  ///
  /// In en, this message translates to:
  /// **'The AI could not estimate the size from these photos. Please enter it manually.'**
  String get aiUnusable;

  /// No description provided for @useValues.
  ///
  /// In en, this message translates to:
  /// **'Use these values'**
  String get useValues;

  /// No description provided for @arUnsupported.
  ///
  /// In en, this message translates to:
  /// **'This phone does not support AR measuring. Please enter the size manually.'**
  String get arUnsupported;

  /// No description provided for @arMeasureWhat.
  ///
  /// In en, this message translates to:
  /// **'What do you want to measure?'**
  String get arMeasureWhat;

  /// No description provided for @arTapFirst.
  ///
  /// In en, this message translates to:
  /// **'Tap the first point'**
  String get arTapFirst;

  /// No description provided for @arTapSecond.
  ///
  /// In en, this message translates to:
  /// **'Tap the second point'**
  String get arTapSecond;

  /// No description provided for @arScanHint.
  ///
  /// In en, this message translates to:
  /// **'Move the phone slowly so it can find the floor and walls.'**
  String get arScanHint;

  /// No description provided for @arUse.
  ///
  /// In en, this message translates to:
  /// **'Use'**
  String get arUse;

  /// No description provided for @arReset.
  ///
  /// In en, this message translates to:
  /// **'Reset'**
  String get arReset;

  /// No description provided for @arResult.
  ///
  /// In en, this message translates to:
  /// **'Measured: {value} m'**
  String arResult(String value);

  /// No description provided for @questionsTitle.
  ///
  /// In en, this message translates to:
  /// **'A few questions'**
  String get questionsTitle;

  /// No description provided for @qSockets.
  ///
  /// In en, this message translates to:
  /// **'Sockets'**
  String get qSockets;

  /// No description provided for @qLamps.
  ///
  /// In en, this message translates to:
  /// **'Lamps'**
  String get qLamps;

  /// No description provided for @qSwitches.
  ///
  /// In en, this message translates to:
  /// **'Switches'**
  String get qSwitches;

  /// No description provided for @qCountsHint.
  ///
  /// In en, this message translates to:
  /// **'Counts come from your markers. Devices without a marker are placed automatically — move them on the plan.'**
  String get qCountsHint;

  /// No description provided for @qJunctionBox.
  ///
  /// In en, this message translates to:
  /// **'There is already a junction box in the room'**
  String get qJunctionBox;

  /// No description provided for @qWallMaterial.
  ///
  /// In en, this message translates to:
  /// **'Wall material'**
  String get qWallMaterial;

  /// No description provided for @wallBrick.
  ///
  /// In en, this message translates to:
  /// **'Brick'**
  String get wallBrick;

  /// No description provided for @wallConcrete.
  ///
  /// In en, this message translates to:
  /// **'Concrete'**
  String get wallConcrete;

  /// No description provided for @wallGypsum.
  ///
  /// In en, this message translates to:
  /// **'Gypsum board'**
  String get wallGypsum;

  /// No description provided for @wallWood.
  ///
  /// In en, this message translates to:
  /// **'Wood'**
  String get wallWood;

  /// No description provided for @qWiringType.
  ///
  /// In en, this message translates to:
  /// **'Wiring type'**
  String get qWiringType;

  /// No description provided for @wiringHidden.
  ///
  /// In en, this message translates to:
  /// **'Hidden (in wall chases)'**
  String get wiringHidden;

  /// No description provided for @wiringOpen.
  ///
  /// In en, this message translates to:
  /// **'Open (cable channel or conduit)'**
  String get wiringOpen;

  /// No description provided for @qHasPe.
  ///
  /// In en, this message translates to:
  /// **'There is a yellow-green earth (PE) wire'**
  String get qHasPe;

  /// No description provided for @qPanelDistance.
  ///
  /// In en, this message translates to:
  /// **'Approximate cable length to the electric panel, m'**
  String get qPanelDistance;

  /// No description provided for @qLampPower.
  ///
  /// In en, this message translates to:
  /// **'Power per lamp, W'**
  String get qLampPower;

  /// No description provided for @qAppliances.
  ///
  /// In en, this message translates to:
  /// **'Planned appliances'**
  String get qAppliances;

  /// No description provided for @qAppliancePower.
  ///
  /// In en, this message translates to:
  /// **'Power, W'**
  String get qAppliancePower;

  /// No description provided for @qApplianceSocket.
  ///
  /// In en, this message translates to:
  /// **'Socket for this appliance'**
  String get qApplianceSocket;

  /// No description provided for @qApplianceAutoSocket.
  ///
  /// In en, this message translates to:
  /// **'Add a new socket'**
  String get qApplianceAutoSocket;

  /// No description provided for @qChecksTitle.
  ///
  /// In en, this message translates to:
  /// **'Important — answer honestly'**
  String get qChecksTitle;

  /// No description provided for @qPanelWork.
  ///
  /// In en, this message translates to:
  /// **'The job needs work inside the electric panel'**
  String get qPanelWork;

  /// No description provided for @qGrounding.
  ///
  /// In en, this message translates to:
  /// **'I need to install or change grounding'**
  String get qGrounding;

  /// No description provided for @qThreePhase.
  ///
  /// In en, this message translates to:
  /// **'The house has a 3-phase supply'**
  String get qThreePhase;

  /// No description provided for @qWetZone.
  ///
  /// In en, this message translates to:
  /// **'This is a bathroom, shower or other wet room'**
  String get qWetZone;

  /// No description provided for @qAluminium.
  ///
  /// In en, this message translates to:
  /// **'The old wiring is aluminium'**
  String get qAluminium;

  /// No description provided for @qDamaged.
  ///
  /// In en, this message translates to:
  /// **'I see burn marks, smell burning or see sparks'**
  String get qDamaged;

  /// No description provided for @qUnsure.
  ///
  /// In en, this message translates to:
  /// **'Not sure about any of these? Ask an electrician first.'**
  String get qUnsure;

  /// No description provided for @buildPlan.
  ///
  /// In en, this message translates to:
  /// **'Build plan'**
  String get buildPlan;

  /// No description provided for @resultTitle.
  ///
  /// In en, this message translates to:
  /// **'Wiring plan'**
  String get resultTitle;

  /// No description provided for @tabPlan.
  ///
  /// In en, this message translates to:
  /// **'Plan 2D'**
  String get tabPlan;

  /// No description provided for @tab3d.
  ///
  /// In en, this message translates to:
  /// **'3D'**
  String get tab3d;

  /// No description provided for @tabRoute.
  ///
  /// In en, this message translates to:
  /// **'Cable route'**
  String get tabRoute;

  /// No description provided for @tabDiagram.
  ///
  /// In en, this message translates to:
  /// **'Diagram'**
  String get tabDiagram;

  /// No description provided for @tabMaterials.
  ///
  /// In en, this message translates to:
  /// **'Materials'**
  String get tabMaterials;

  /// No description provided for @tabSteps.
  ///
  /// In en, this message translates to:
  /// **'Steps'**
  String get tabSteps;

  /// No description provided for @topView.
  ///
  /// In en, this message translates to:
  /// **'Top view'**
  String get topView;

  /// No description provided for @planDragHint.
  ///
  /// In en, this message translates to:
  /// **'Long-press a device and drag it along the wall to move it.'**
  String get planDragHint;

  /// No description provided for @legendPhase.
  ///
  /// In en, this message translates to:
  /// **'Phase (L)'**
  String get legendPhase;

  /// No description provided for @legendNeutral.
  ///
  /// In en, this message translates to:
  /// **'Neutral (N)'**
  String get legendNeutral;

  /// No description provided for @legendPe.
  ///
  /// In en, this message translates to:
  /// **'Earth (PE)'**
  String get legendPe;

  /// No description provided for @legendSwitched.
  ///
  /// In en, this message translates to:
  /// **'Switched phase'**
  String get legendSwitched;

  /// No description provided for @legendTraveller.
  ///
  /// In en, this message translates to:
  /// **'Traveller'**
  String get legendTraveller;

  /// No description provided for @viewer3dError.
  ///
  /// In en, this message translates to:
  /// **'The 3D view could not start on this phone.'**
  String get viewer3dError;

  /// No description provided for @circuitLighting.
  ///
  /// In en, this message translates to:
  /// **'Lighting'**
  String get circuitLighting;

  /// No description provided for @circuitSockets.
  ///
  /// In en, this message translates to:
  /// **'Sockets, group {n}'**
  String circuitSockets(int n);

  /// No description provided for @circuitDedicated.
  ///
  /// In en, this message translates to:
  /// **'Dedicated line: {appliance}'**
  String circuitDedicated(String appliance);

  /// No description provided for @breakerA.
  ///
  /// In en, this message translates to:
  /// **'Breaker {a} A'**
  String breakerA(int a);

  /// No description provided for @crossSection.
  ///
  /// In en, this message translates to:
  /// **'Copper {mm2} mm²'**
  String crossSection(String mm2);

  /// No description provided for @designCurrent.
  ///
  /// In en, this message translates to:
  /// **'Load {power} W · {current} A'**
  String designCurrent(int power, String current);

  /// No description provided for @vdrop.
  ///
  /// In en, this message translates to:
  /// **'Voltage drop {pct}%'**
  String vdrop(String pct);

  /// No description provided for @panelWorkNote.
  ///
  /// In en, this message translates to:
  /// **'Connection in the panel: licensed electrician only.'**
  String get panelWorkNote;

  /// No description provided for @segmentFromTo.
  ///
  /// In en, this message translates to:
  /// **'{from} → {to}'**
  String segmentFromTo(String from, String to);

  /// No description provided for @segmentLength.
  ///
  /// In en, this message translates to:
  /// **'{m} m of cable ({cable})'**
  String segmentLength(String m, String cable);

  /// No description provided for @routeTotal.
  ///
  /// In en, this message translates to:
  /// **'Total cable route {m} m'**
  String routeTotal(String m);

  /// No description provided for @routingRulesTitle.
  ///
  /// In en, this message translates to:
  /// **'Routing rules'**
  String get routingRulesTitle;

  /// No description provided for @routingRules.
  ///
  /// In en, this message translates to:
  /// **'Only vertical and horizontal runs, never diagonal.\nHorizontal runs 15 cm below the ceiling.\nVertical runs at least 15 cm from corners, doors and windows.\nJoints only inside junction or socket boxes.\nSockets 30 cm and switches 90–110 cm above the floor.'**
  String get routingRules;

  /// No description provided for @devInput.
  ///
  /// In en, this message translates to:
  /// **'Input'**
  String get devInput;

  /// No description provided for @devJunction.
  ///
  /// In en, this message translates to:
  /// **'Junction box'**
  String get devJunction;

  /// No description provided for @devSocket.
  ///
  /// In en, this message translates to:
  /// **'Socket'**
  String get devSocket;

  /// No description provided for @devSwitch.
  ///
  /// In en, this message translates to:
  /// **'Switch'**
  String get devSwitch;

  /// No description provided for @devLamp.
  ///
  /// In en, this message translates to:
  /// **'Lamp'**
  String get devLamp;

  /// No description provided for @diagramSingle.
  ///
  /// In en, this message translates to:
  /// **'Single-gang switch and lamp'**
  String get diagramSingle;

  /// No description provided for @diagramDouble.
  ///
  /// In en, this message translates to:
  /// **'Double-gang switch, two lamp groups'**
  String get diagramDouble;

  /// No description provided for @diagramPass.
  ///
  /// In en, this message translates to:
  /// **'Two-way (pass-through) switches'**
  String get diagramPass;

  /// No description provided for @diagramSockets.
  ///
  /// In en, this message translates to:
  /// **'Socket group'**
  String get diagramSockets;

  /// No description provided for @diagramDedicated.
  ///
  /// In en, this message translates to:
  /// **'Dedicated appliance line'**
  String get diagramDedicated;

  /// No description provided for @diagramNote.
  ///
  /// In en, this message translates to:
  /// **'Wire colours: brown/red — phase L, blue — neutral N, yellow-green — earth PE. Always verify with a tester.'**
  String get diagramNote;

  /// No description provided for @materialsTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get materialsTotal;

  /// No description provided for @materialsOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional (tools and fixtures)'**
  String get materialsOptional;

  /// No description provided for @materialsPricesNote.
  ///
  /// In en, this message translates to:
  /// **'Prices are estimates for {region}. Tap a line to change quantity or price.'**
  String materialsPricesNote(String region);

  /// No description provided for @materialsReserveNote.
  ///
  /// In en, this message translates to:
  /// **'Cable includes a {pct}% reserve.'**
  String materialsReserveNote(int pct);

  /// No description provided for @quantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get quantity;

  /// No description provided for @unitPrice.
  ///
  /// In en, this message translates to:
  /// **'Unit price'**
  String get unitPrice;

  /// No description provided for @includeInTotal.
  ///
  /// In en, this message translates to:
  /// **'Include in total'**
  String get includeInTotal;

  /// No description provided for @reasonElectricianInstalls.
  ///
  /// In en, this message translates to:
  /// **'Installed in the panel by an electrician'**
  String get reasonElectricianInstalls;

  /// No description provided for @reasonSafety.
  ///
  /// In en, this message translates to:
  /// **'Required for safety'**
  String get reasonSafety;

  /// No description provided for @reasonConduit.
  ///
  /// In en, this message translates to:
  /// **'Required in drywall and wooden walls'**
  String get reasonConduit;

  /// No description provided for @exportPdf.
  ///
  /// In en, this message translates to:
  /// **'Export PDF'**
  String get exportPdf;

  /// No description provided for @stepsIntro.
  ///
  /// In en, this message translates to:
  /// **'Recommended order of work'**
  String get stepsIntro;

  /// No description provided for @openLesson.
  ///
  /// In en, this message translates to:
  /// **'Open lesson'**
  String get openLesson;

  /// No description provided for @startWork.
  ///
  /// In en, this message translates to:
  /// **'Start work (safety check)'**
  String get startWork;

  /// No description provided for @markDone.
  ///
  /// In en, this message translates to:
  /// **'Mark project as done'**
  String get markDone;

  /// No description provided for @warningsTitle.
  ///
  /// In en, this message translates to:
  /// **'Check these'**
  String get warningsTitle;

  /// No description provided for @editProject.
  ///
  /// In en, this message translates to:
  /// **'Edit project'**
  String get editProject;

  /// No description provided for @projectSaved.
  ///
  /// In en, this message translates to:
  /// **'Project saved'**
  String get projectSaved;

  /// No description provided for @warn_input_assumed.
  ///
  /// In en, this message translates to:
  /// **'No input cable was marked — we assumed it enters near wall A. Mark it for a better plan.'**
  String get warn_input_assumed;

  /// No description provided for @warn_switch_auto_added.
  ///
  /// In en, this message translates to:
  /// **'No switch was marked — one was added next to the junction box. Move it on the plan.'**
  String get warn_switch_auto_added;

  /// No description provided for @warn_pass_unpaired.
  ///
  /// In en, this message translates to:
  /// **'Pass-through switches work in pairs. The single one is treated as a normal switch.'**
  String get warn_pass_unpaired;

  /// No description provided for @warn_near_corner.
  ///
  /// In en, this message translates to:
  /// **'A device was too close to a corner and was moved 15 cm away.'**
  String get warn_near_corner;

  /// No description provided for @warn_too_many_lamps.
  ///
  /// In en, this message translates to:
  /// **'Many lamps on one circuit. Check the total power.'**
  String get warn_too_many_lamps;

  /// No description provided for @warn_extra_socket_groups.
  ///
  /// In en, this message translates to:
  /// **'Sockets were split into several groups. Each extra group is a new line from the panel — an electrician must connect it.'**
  String get warn_extra_socket_groups;

  /// No description provided for @warn_dedicated_socket_auto.
  ///
  /// In en, this message translates to:
  /// **'A socket was added for a powerful appliance. Move it to the right place.'**
  String get warn_dedicated_socket_auto;

  /// No description provided for @warn_cable_upsized.
  ///
  /// In en, this message translates to:
  /// **'The cable was made thicker because of a long run.'**
  String get warn_cable_upsized;

  /// No description provided for @warn_switch_without_lamp.
  ///
  /// In en, this message translates to:
  /// **'There are switches but no lamps. Mark the lamps.'**
  String get warn_switch_without_lamp;

  /// No description provided for @warn_lighting_overload.
  ///
  /// In en, this message translates to:
  /// **'The lighting load is too high for one circuit.'**
  String get warn_lighting_overload;

  /// No description provided for @warn_socket_overload.
  ///
  /// In en, this message translates to:
  /// **'A socket group is overloaded.'**
  String get warn_socket_overload;

  /// No description provided for @oosTitle.
  ///
  /// In en, this message translates to:
  /// **'This job needs a licensed electrician'**
  String get oosTitle;

  /// No description provided for @oosBody.
  ///
  /// In en, this message translates to:
  /// **'For your safety ElektrUy does not give instructions for this work. Please call a licensed electrician.'**
  String get oosBody;

  /// No description provided for @oosReasons.
  ///
  /// In en, this message translates to:
  /// **'Why:'**
  String get oosReasons;

  /// No description provided for @oosFindElectrician.
  ///
  /// In en, this message translates to:
  /// **'Find an electrician'**
  String get oosFindElectrician;

  /// No description provided for @oosLessons.
  ///
  /// In en, this message translates to:
  /// **'You can still read the lessons'**
  String get oosLessons;

  /// No description provided for @oosChangeAnswers.
  ///
  /// In en, this message translates to:
  /// **'Change answers'**
  String get oosChangeAnswers;

  /// No description provided for @gateTitle.
  ///
  /// In en, this message translates to:
  /// **'Safety check'**
  String get gateTitle;

  /// No description provided for @gateBody.
  ///
  /// In en, this message translates to:
  /// **'Tick every item. You cannot continue until all are done.'**
  String get gateBody;

  /// No description provided for @gateContinue.
  ///
  /// In en, this message translates to:
  /// **'All done — continue'**
  String get gateContinue;

  /// No description provided for @lessonsTitle.
  ///
  /// In en, this message translates to:
  /// **'Lessons'**
  String get lessonsTitle;

  /// No description provided for @lessonMinutes.
  ///
  /// In en, this message translates to:
  /// **'{n} min'**
  String lessonMinutes(int n);

  /// No description provided for @difficulty1.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get difficulty1;

  /// No description provided for @difficulty2.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get difficulty2;

  /// No description provided for @difficulty3.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get difficulty3;

  /// No description provided for @lessonCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get lessonCompleted;

  /// No description provided for @lessonStart.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get lessonStart;

  /// No description provided for @lessonContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get lessonContinue;

  /// No description provided for @lessonStepOf.
  ///
  /// In en, this message translates to:
  /// **'Step {current} of {total}'**
  String lessonStepOf(int current, int total);

  /// No description provided for @toolsNeeded.
  ///
  /// In en, this message translates to:
  /// **'Tools'**
  String get toolsNeeded;

  /// No description provided for @warningLabel.
  ///
  /// In en, this message translates to:
  /// **'Warning'**
  String get warningLabel;

  /// No description provided for @stepDoneCheck.
  ///
  /// In en, this message translates to:
  /// **'I did this step'**
  String get stepDoneCheck;

  /// No description provided for @nextStep.
  ///
  /// In en, this message translates to:
  /// **'Next step'**
  String get nextStep;

  /// No description provided for @prevStep.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get prevStep;

  /// No description provided for @toQuiz.
  ///
  /// In en, this message translates to:
  /// **'Go to quiz'**
  String get toQuiz;

  /// No description provided for @quizTitle.
  ///
  /// In en, this message translates to:
  /// **'Quick quiz'**
  String get quizTitle;

  /// No description provided for @quizCorrect.
  ///
  /// In en, this message translates to:
  /// **'Correct!'**
  String get quizCorrect;

  /// No description provided for @quizWrong.
  ///
  /// In en, this message translates to:
  /// **'Not quite.'**
  String get quizWrong;

  /// No description provided for @quizScore.
  ///
  /// In en, this message translates to:
  /// **'Your score: {score}%'**
  String quizScore(int score);

  /// No description provided for @quizRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get quizRetry;

  /// No description provided for @quizFinish.
  ///
  /// In en, this message translates to:
  /// **'Finish lesson'**
  String get quizFinish;

  /// No description provided for @voiceGuide.
  ///
  /// In en, this message translates to:
  /// **'Voice guide'**
  String get voiceGuide;

  /// No description provided for @voiceCommandsHint.
  ///
  /// In en, this message translates to:
  /// **'Say \"next\", \"back\" or \"repeat\"'**
  String get voiceCommandsHint;

  /// No description provided for @voiceUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Voice commands are not available on this phone.'**
  String get voiceUnavailable;

  /// No description provided for @voiceListening.
  ///
  /// In en, this message translates to:
  /// **'Listening…'**
  String get voiceListening;

  /// No description provided for @reportMistake.
  ///
  /// In en, this message translates to:
  /// **'Report a mistake'**
  String get reportMistake;

  /// No description provided for @lessonsOfflineReady.
  ///
  /// In en, this message translates to:
  /// **'All lessons are available offline.'**
  String get lessonsOfflineReady;

  /// No description provided for @downloadsTitle.
  ///
  /// In en, this message translates to:
  /// **'Offline content'**
  String get downloadsTitle;

  /// No description provided for @downloadsBody.
  ///
  /// In en, this message translates to:
  /// **'Lessons, safety texts, prices and the 3D viewer are stored on your phone. Update them when you have internet.'**
  String get downloadsBody;

  /// No description provided for @downloadImages.
  ///
  /// In en, this message translates to:
  /// **'Download lesson pictures'**
  String get downloadImages;

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Update now'**
  String get syncNow;

  /// No description provided for @lastSync.
  ///
  /// In en, this message translates to:
  /// **'Last update: {date}'**
  String lastSync(String date);

  /// No description provided for @neverSynced.
  ///
  /// In en, this message translates to:
  /// **'Using the built-in content'**
  String get neverSynced;

  /// No description provided for @cachedItems.
  ///
  /// In en, this message translates to:
  /// **'{lessons} lessons · {materials} materials'**
  String cachedItems(int lessons, int materials);

  /// No description provided for @clearCache.
  ///
  /// In en, this message translates to:
  /// **'Clear downloaded content'**
  String get clearCache;

  /// No description provided for @electriciansTitle.
  ///
  /// In en, this message translates to:
  /// **'Electricians'**
  String get electriciansTitle;

  /// No description provided for @filterRegion.
  ///
  /// In en, this message translates to:
  /// **'Region'**
  String get filterRegion;

  /// No description provided for @filterDistrict.
  ///
  /// In en, this message translates to:
  /// **'District'**
  String get filterDistrict;

  /// No description provided for @allRegions.
  ///
  /// In en, this message translates to:
  /// **'All regions'**
  String get allRegions;

  /// No description provided for @searchName.
  ///
  /// In en, this message translates to:
  /// **'Search by name or service'**
  String get searchName;

  /// No description provided for @noElectricians.
  ///
  /// In en, this message translates to:
  /// **'No electricians found here yet.'**
  String get noElectricians;

  /// No description provided for @experienceYears.
  ///
  /// In en, this message translates to:
  /// **'{n} years of experience'**
  String experienceYears(int n);

  /// No description provided for @priceRange.
  ///
  /// In en, this message translates to:
  /// **'{from}–{to} {currency}'**
  String priceRange(String from, String to, String currency);

  /// No description provided for @ratingLabel.
  ///
  /// In en, this message translates to:
  /// **'{avg} ★ · {count} reviews'**
  String ratingLabel(String avg, int count);

  /// No description provided for @call.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get call;

  /// No description provided for @telegram.
  ///
  /// In en, this message translates to:
  /// **'Telegram'**
  String get telegram;

  /// No description provided for @reviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get reviews;

  /// No description provided for @noReviews.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet'**
  String get noReviews;

  /// No description provided for @writeReview.
  ///
  /// In en, this message translates to:
  /// **'Write a review'**
  String get writeReview;

  /// No description provided for @editReview.
  ///
  /// In en, this message translates to:
  /// **'Edit my review'**
  String get editReview;

  /// No description provided for @yourRating.
  ///
  /// In en, this message translates to:
  /// **'Your rating'**
  String get yourRating;

  /// No description provided for @reviewText.
  ///
  /// In en, this message translates to:
  /// **'Comment (optional)'**
  String get reviewText;

  /// No description provided for @reviewSaved.
  ///
  /// In en, this message translates to:
  /// **'Thank you for your review!'**
  String get reviewSaved;

  /// No description provided for @becomeElectrician.
  ///
  /// In en, this message translates to:
  /// **'I am an electrician'**
  String get becomeElectrician;

  /// No description provided for @applyTitle.
  ///
  /// In en, this message translates to:
  /// **'Electrician profile'**
  String get applyTitle;

  /// No description provided for @applyName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get applyName;

  /// No description provided for @applyPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone, e.g. +998 90 123 45 67'**
  String get applyPhone;

  /// No description provided for @applyTelegram.
  ///
  /// In en, this message translates to:
  /// **'Telegram username (optional)'**
  String get applyTelegram;

  /// No description provided for @applyExperience.
  ///
  /// In en, this message translates to:
  /// **'Experience, years'**
  String get applyExperience;

  /// No description provided for @applyPriceFrom.
  ///
  /// In en, this message translates to:
  /// **'Price from'**
  String get applyPriceFrom;

  /// No description provided for @applyPriceTo.
  ///
  /// In en, this message translates to:
  /// **'Price to'**
  String get applyPriceTo;

  /// No description provided for @applyBio.
  ///
  /// In en, this message translates to:
  /// **'About you and your work'**
  String get applyBio;

  /// No description provided for @applyServices.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get applyServices;

  /// No description provided for @applySubmit.
  ///
  /// In en, this message translates to:
  /// **'Send for review'**
  String get applySubmit;

  /// No description provided for @applyPending.
  ///
  /// In en, this message translates to:
  /// **'Your profile is waiting for review by an admin.'**
  String get applyPending;

  /// No description provided for @applyApproved.
  ///
  /// In en, this message translates to:
  /// **'Your profile is published.'**
  String get applyApproved;

  /// No description provided for @applyRejected.
  ///
  /// In en, this message translates to:
  /// **'Your profile was not approved. Edit it and send again.'**
  String get applyRejected;

  /// No description provided for @applyBlocked.
  ///
  /// In en, this message translates to:
  /// **'Your profile is blocked.'**
  String get applyBlocked;

  /// No description provided for @applyEditNote.
  ///
  /// In en, this message translates to:
  /// **'Any change sends the profile for review again.'**
  String get applyEditNote;

  /// No description provided for @fieldRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get fieldRequired;

  /// No description provided for @phoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid phone number'**
  String get phoneInvalid;

  /// No description provided for @serviceSockets.
  ///
  /// In en, this message translates to:
  /// **'Sockets and switches'**
  String get serviceSockets;

  /// No description provided for @serviceLighting.
  ///
  /// In en, this message translates to:
  /// **'Lighting'**
  String get serviceLighting;

  /// No description provided for @serviceWiring.
  ///
  /// In en, this message translates to:
  /// **'Full rewiring'**
  String get serviceWiring;

  /// No description provided for @servicePanel.
  ///
  /// In en, this message translates to:
  /// **'Distribution panel'**
  String get servicePanel;

  /// No description provided for @serviceGrounding.
  ///
  /// In en, this message translates to:
  /// **'Grounding'**
  String get serviceGrounding;

  /// No description provided for @serviceInspection.
  ///
  /// In en, this message translates to:
  /// **'Inspection'**
  String get serviceInspection;

  /// No description provided for @reportElectrician.
  ///
  /// In en, this message translates to:
  /// **'Report this profile'**
  String get reportElectrician;

  /// No description provided for @checkTitle.
  ///
  /// In en, this message translates to:
  /// **'Check my work'**
  String get checkTitle;

  /// No description provided for @checkIntro.
  ///
  /// In en, this message translates to:
  /// **'Take 1–4 clear, close photos of the finished work (open boxes, terminals, cable routes). Switch the power off before opening anything.'**
  String get checkIntro;

  /// No description provided for @checkContext.
  ///
  /// In en, this message translates to:
  /// **'What did you do? (optional)'**
  String get checkContext;

  /// No description provided for @checkSend.
  ///
  /// In en, this message translates to:
  /// **'Check with AI'**
  String get checkSend;

  /// No description provided for @checkChecking.
  ///
  /// In en, this message translates to:
  /// **'Checking your photos…'**
  String get checkChecking;

  /// No description provided for @checkOk.
  ///
  /// In en, this message translates to:
  /// **'No visible problems found'**
  String get checkOk;

  /// No description provided for @checkWarning.
  ///
  /// In en, this message translates to:
  /// **'Warnings found'**
  String get checkWarning;

  /// No description provided for @checkCritical.
  ///
  /// In en, this message translates to:
  /// **'Critical problems'**
  String get checkCritical;

  /// No description provided for @checkUnclear.
  ///
  /// In en, this message translates to:
  /// **'The photos are not clear enough'**
  String get checkUnclear;

  /// No description provided for @checkCallElectrician.
  ///
  /// In en, this message translates to:
  /// **'Do not switch on. Call a licensed electrician.'**
  String get checkCallElectrician;

  /// No description provided for @checkPositives.
  ///
  /// In en, this message translates to:
  /// **'Looks good'**
  String get checkPositives;

  /// No description provided for @checkFlagWrong.
  ///
  /// In en, this message translates to:
  /// **'The AI is wrong'**
  String get checkFlagWrong;

  /// No description provided for @checkFlagged.
  ///
  /// In en, this message translates to:
  /// **'Thank you — an admin will review this result.'**
  String get checkFlagged;

  /// No description provided for @checkHistory.
  ///
  /// In en, this message translates to:
  /// **'Previous checks'**
  String get checkHistory;

  /// No description provided for @severityInfo.
  ///
  /// In en, this message translates to:
  /// **'Info'**
  String get severityInfo;

  /// No description provided for @severityWarning.
  ///
  /// In en, this message translates to:
  /// **'Warning'**
  String get severityWarning;

  /// No description provided for @severityCritical.
  ///
  /// In en, this message translates to:
  /// **'Critical'**
  String get severityCritical;

  /// No description provided for @aiDisclaimerShort.
  ///
  /// In en, this message translates to:
  /// **'AI can miss problems. This is not an inspection.'**
  String get aiDisclaimerShort;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get theme;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @units.
  ///
  /// In en, this message translates to:
  /// **'Units'**
  String get units;

  /// No description provided for @unitsMeters.
  ///
  /// In en, this message translates to:
  /// **'Metres'**
  String get unitsMeters;

  /// No description provided for @unitsCentimeters.
  ///
  /// In en, this message translates to:
  /// **'Centimetres'**
  String get unitsCentimeters;

  /// No description provided for @region.
  ///
  /// In en, this message translates to:
  /// **'Region (for prices)'**
  String get region;

  /// No description provided for @currency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get currency;

  /// No description provided for @legal.
  ///
  /// In en, this message translates to:
  /// **'Legal texts'**
  String get legal;

  /// No description provided for @appVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {v}'**
  String appVersion(String v);

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete my data'**
  String get deleteAccount;

  /// No description provided for @deleteAccountBody.
  ///
  /// In en, this message translates to:
  /// **'This permanently deletes all your projects, photos, lesson progress, reviews and AI checks in ElektrUy. It cannot be undone.'**
  String get deleteAccountBody;

  /// No description provided for @deleteAccountTypeHint.
  ///
  /// In en, this message translates to:
  /// **'Type DELETE to confirm'**
  String get deleteAccountTypeHint;

  /// No description provided for @deleteAccountDone.
  ///
  /// In en, this message translates to:
  /// **'Your data was deleted.'**
  String get deleteAccountDone;

  /// No description provided for @about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get about;

  /// No description provided for @reportTitle.
  ///
  /// In en, this message translates to:
  /// **'Report a problem'**
  String get reportTitle;

  /// No description provided for @reportText.
  ///
  /// In en, this message translates to:
  /// **'Describe the problem'**
  String get reportText;

  /// No description provided for @reportSend.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get reportSend;

  /// No description provided for @reportSent.
  ///
  /// In en, this message translates to:
  /// **'Sent. Thank you!'**
  String get reportSent;

  /// No description provided for @pdfTitle.
  ///
  /// In en, this message translates to:
  /// **'ElektrUy — room wiring plan'**
  String get pdfTitle;

  /// No description provided for @pdfGenerated.
  ///
  /// In en, this message translates to:
  /// **'Created {date}'**
  String pdfGenerated(String date);

  /// No description provided for @pdfRoom.
  ///
  /// In en, this message translates to:
  /// **'Room {l} × {w} × {h} m'**
  String pdfRoom(String l, String w, String h);

  /// No description provided for @pdfCircuits.
  ///
  /// In en, this message translates to:
  /// **'Circuits'**
  String get pdfCircuits;

  /// No description provided for @pdfCableRoute.
  ///
  /// In en, this message translates to:
  /// **'Cable route'**
  String get pdfCableRoute;

  /// No description provided for @pdfMaterials.
  ///
  /// In en, this message translates to:
  /// **'Materials'**
  String get pdfMaterials;

  /// No description provided for @pdfDiagrams.
  ///
  /// In en, this message translates to:
  /// **'Wiring diagrams'**
  String get pdfDiagrams;

  /// No description provided for @pdfItem.
  ///
  /// In en, this message translates to:
  /// **'Item'**
  String get pdfItem;

  /// No description provided for @pdfQty.
  ///
  /// In en, this message translates to:
  /// **'Qty'**
  String get pdfQty;

  /// No description provided for @pdfPrice.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get pdfPrice;

  /// No description provided for @pdfSum.
  ///
  /// In en, this message translates to:
  /// **'Sum'**
  String get pdfSum;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ru', 'uz'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ru':
      return AppLocalizationsRu();
    case 'uz':
      return AppLocalizationsUz();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
