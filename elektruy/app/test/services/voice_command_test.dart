import 'package:elektruy/core/services/voice_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseVoiceCommand', () {
    const cases = {
      // Uzbek
      'keyingi': VoiceCommand.next,
      'keyingisi': VoiceCommand.next,
      'davom et': VoiceCommand.next,
      'oldingi': VoiceCommand.back,
      'orqaga qayt': VoiceCommand.back,
      'takrorla': VoiceCommand.repeat,
      // Russian
      'далее': VoiceCommand.next,
      'Дальше, пожалуйста': VoiceCommand.next,
      'следующий шаг': VoiceCommand.next,
      'назад': VoiceCommand.back,
      'повтори': VoiceCommand.repeat,
      'ещё раз': VoiceCommand.repeat,
      // English
      'Next': VoiceCommand.next,
      'next step please': VoiceCommand.next,
      'go back': VoiceCommand.back,
      'previous': VoiceCommand.back,
      'repeat that': VoiceCommand.repeat,
    };
    cases.forEach((phrase, expected) {
      test('"$phrase" -> ${expected.name}', () => expect(parseVoiceCommand(phrase), expected));
    });

    test('unrelated speech is ignored', () {
      expect(parseVoiceCommand(''), isNull);
      expect(parseVoiceCommand('salom qalaysan'), isNull);
      expect(parseVoiceCommand('hello there'), isNull);
      expect(parseVoiceCommand('привет'), isNull);
    });

    test('repeat wins over next when both are heard', () {
      expect(parseVoiceCommand('keyingi takrorla'), VoiceCommand.repeat);
    });
  });
}
