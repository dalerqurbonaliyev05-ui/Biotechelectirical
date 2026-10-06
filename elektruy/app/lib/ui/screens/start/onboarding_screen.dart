import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../widgets/common.dart';
import 'consent_screen.dart';

/// Three intro slides, then the mandatory safety & disclaimer acceptance.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _page = PageController();
  int _index = 0;

  @override
  void dispose() {
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final slides = [
      (Icons.photo_camera, 'cable_route', l.onb1Title, l.onb1Body),
      (Icons.school, 'socket_wiring', l.onb2Title, l.onb2Body),
      (Icons.health_and_safety, 'breaker_off', l.onb3Title, l.onb3Body),
    ];
    final isLastSlide = _index == slides.length - 1;
    if (_index >= slides.length) return const ConsentBody(firstTime: true);
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          Align(
            alignment: Alignment.topRight,
            child: TextButton(onPressed: () => setState(() => _index = slides.length), child: Text(l.skip)),
          ),
          Expanded(
            child: PageView.builder(
              controller: _page,
              itemCount: slides.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (_, i) {
                final (icon, art, title, body) = slides[i];
                return Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Illustration(art, height: 200),
                    const SizedBox(height: 28),
                    Icon(icon, size: 36, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(height: 12),
                    Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    Text(body, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge),
                  ]),
                );
              },
            ),
          ),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < slides.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.all(4),
                width: i == _index ? 22 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: i == _index ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
          ]),
          BottomAction(
            child: FilledButton(
              onPressed: () {
                if (isLastSlide) {
                  setState(() => _index = slides.length);
                } else {
                  _page.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
                }
              },
              child: Text(l.next),
            ),
          ),
        ]),
      ),
    );
  }
}
