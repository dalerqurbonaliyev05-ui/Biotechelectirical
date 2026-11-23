import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'common.dart';

/// Three.js room viewer loaded from bundled assets (works offline). The room/plan
/// JSON is passed through a JS bridge; taps on devices come back via [onTapDevice].
/// When the scene carries `steps`, [step] selects the installation step to show.
class Viewer3D extends StatefulWidget {
  const Viewer3D({super.key, required this.sceneJson, this.step, this.onTapDevice});

  /// Plan JSON (room, devices, segments) plus `colors`, `dark`, `labels` and optional `steps`.
  final Map<String, dynamic> sceneJson;
  final int? step;
  final ValueChanged<String>? onTapDevice;

  @override
  State<Viewer3D> createState() => Viewer3DState();
}

class Viewer3DState extends State<Viewer3D> {
  late final WebViewController _web;
  bool _ready = false;
  bool _failed = false;
  String? _pushed;

  /// False in widget tests, where no WebView platform is registered.
  static bool get _available => WebViewPlatform.instance != null;

  @override
  void initState() {
    super.initState();
    if (!_available) return;
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..addJavaScriptChannel('ElektrUyBridge', onMessageReceived: (m) {
        final msg = jsonDecode(m.message) as Map<String, dynamic>;
        switch (msg['type']) {
          case 'ready':
            _ready = true;
            _pushed = null;
            _push();
          case 'tap':
            final id = msg['device'] as String?;
            if (id != null) widget.onTapDevice?.call(id);
          case 'error':
            if (mounted) setState(() => _failed = true);
        }
      })
      ..setNavigationDelegate(NavigationDelegate(
        // Only the bundled page may load; nothing from the network.
        onNavigationRequest: (r) => r.url.startsWith('file://') ? NavigationDecision.navigate : NavigationDecision.prevent,
        onWebResourceError: (_) {
          if (mounted) setState(() => _failed = true);
        },
      ))
      ..loadFlutterAsset('assets/viewer3d/index.html');
  }

  @override
  void didUpdateWidget(covariant Viewer3D oldWidget) {
    super.didUpdateWidget(oldWidget);
    final changed = _push();
    if (!changed && oldWidget.step != widget.step) _showStep();
  }

  /// Sends the scene if it changed since the last push. Returns whether it did.
  bool _push() {
    if (!_ready) return false;
    final json = jsonEncode(widget.sceneJson);
    if (json == _pushed) return false;
    _pushed = json;
    _web.runJavaScript('window.ElektrUy.load(${jsonEncode(json)});');
    if ((widget.step ?? 0) > 0) _showStep(instant: true);
    return true;
  }

  void _showStep({bool instant = false}) {
    final s = widget.step;
    if (!_ready || s == null) return;
    _web.runJavaScript('window.ElektrUy.step($s${instant ? ', true' : ''})');
  }

  void replay() {
    if (_ready) _web.runJavaScript('window.ElektrUy.replay()');
  }

  void resetView() {
    if (_ready) _web.runJavaScript('window.ElektrUy.resetView()');
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return EmptyState(icon: Icons.view_in_ar, title: context.l.viewer3dError);
    if (!_available) return ColoredBox(color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Center(child: Icon(Icons.view_in_ar, size: 64)));
    return WebViewWidget(controller: _web);
  }
}
