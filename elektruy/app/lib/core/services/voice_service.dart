import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

enum VoiceCommand { next, back, repeat }

/// Maps a recognized phrase to a command (uz / ru / en). Kept pure for testing.
VoiceCommand? parseVoiceCommand(String words) {
  final w = words.toLowerCase().replaceAll(RegExp(r"[^\p{L}\s']", unicode: true), ' ');
  bool has(List<String> keys) => keys.any((k) => RegExp('(^|\\s)$k').hasMatch(w));
  if (has(const ['takror', 'qaytar', 'повтор', 'ещё раз', 'еще раз', 'repeat', 'again'])) return VoiceCommand.repeat;
  if (has(const ['oldingi', 'orqaga', 'назад', 'предыдущ', 'back', 'previous'])) return VoiceCommand.back;
  if (has(const ['keyingi', 'davom', 'далее', 'дальше', 'следующ', 'next', 'forward'])) return VoiceCommand.next;
  return null;
}

/// Hands-free lesson guide: reads steps aloud and listens for next / back / repeat.
/// Listening is paused while speaking so the app does not hear itself.
class VoiceService {
  final FlutterTts _tts = FlutterTts();
  final SpeechToText _stt = SpeechToText();
  bool _sttReady = false;
  bool _handsFree = false;
  bool _speaking = false;

  /// Offline recognition first; switches to the online recognizer after an error.
  bool _onDevice = true;
  String _lang = 'uz';
  final _commands = StreamController<VoiceCommand>.broadcast();
  final _listening = StreamController<bool>.broadcast();

  Stream<VoiceCommand> get commands => _commands.stream;
  Stream<bool> get listening => _listening.stream;
  bool get commandsAvailable => _sttReady;

  static const _ttsLocales = {
    'uz': ['uz-UZ', 'uz'],
    'ru': ['ru-RU', 'ru'],
    'en': ['en-US', 'en-GB', 'en'],
  };
  static const _sttLocales = {'uz': 'uz_UZ', 'ru': 'ru_RU', 'en': 'en_US'};

  /// Returns true when a voice for [lang] is installed (TTS falls back to the system voice otherwise).
  Future<bool> setLanguage(String lang) async {
    _lang = lang;
    await _tts.awaitSpeakCompletion(true);
    for (final loc in _ttsLocales[lang] ?? const ['en-US']) {
      try {
        final ok = await _tts.isLanguageAvailable(loc);
        if (ok == true || ok == 1) {
          await _tts.setLanguage(loc);
          return true;
        }
      } catch (_) {
        // Some engines throw for unknown locales; try the next one.
      }
    }
    return false;
  }

  Future<void> speak(String text) async {
    if (text.trim().isEmpty) return;
    _speaking = true;
    await _stopListening();
    try {
      await _tts.stop();
      await _tts.speak(text);
    } finally {
      _speaking = false;
      if (_handsFree) unawaited(_listen());
    }
  }

  Future<void> stopSpeaking() => _tts.stop();

  /// Starts continuous command listening (offline recognition when the phone supports it).
  Future<bool> startHandsFree() async {
    _sttReady = _sttReady ||
        await _stt.initialize(
          onStatus: (s) {
            if ((s == 'done' || s == 'notListening') && _handsFree && !_speaking) {
              _listening.add(false);
              Future.delayed(const Duration(milliseconds: 400), _listen);
            }
          },
          onError: (_) {
            _onDevice = false;
            _listening.add(false);
            if (_handsFree && !_speaking) Future.delayed(const Duration(seconds: 1), _listen);
          },
        );
    if (!_sttReady) return false;
    _handsFree = true;
    await _listen();
    return true;
  }

  Future<void> stopHandsFree() async {
    _handsFree = false;
    await _stopListening();
  }

  Future<void> _listen() async {
    if (!_handsFree || _speaking || !_sttReady || _stt.isListening) return;
    try {
      await _stt.listen(
        onResult: _onResult,
        listenOptions: SpeechListenOptions(
          localeId: _sttLocales[_lang],
          onDevice: _onDevice,
          partialResults: true,
          listenMode: ListenMode.confirmation,
          pauseFor: const Duration(seconds: 3),
          listenFor: const Duration(seconds: 30),
          cancelOnError: true,
        ),
      );
      _listening.add(true);
    } catch (_) {
      _listening.add(false);
    }
  }

  void _onResult(SpeechRecognitionResult r) {
    final cmd = parseVoiceCommand(r.recognizedWords);
    if (cmd != null) {
      _commands.add(cmd);
      unawaited(_stt.stop());
    }
  }

  Future<void> _stopListening() async {
    if (_stt.isListening) await _stt.stop();
    _listening.add(false);
  }

  Future<void> dispose() async {
    await stopHandsFree();
    await _tts.stop();
    await _commands.close();
    await _listening.close();
  }
}
