import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'common.dart';

/// Three.js room viewer loaded from bundled assets (works offline). The room/plan
/// JSON is passed through a JS bridge; taps on devices come back via [onTapDevice].
class Viewer3D extends StatefulWidget {
  const Viewer3D({super.key, required this.sceneJson, this.onTapDevice});

  /// Plan JSON (room, devices, segments) plus `colors`, `dark` and `wall_labels`.
  final Map<String, dynamic> sceneJson;
  final ValueChanged<String>? onTapDevice;

  @override
  State<Viewer3D> createState() => _Viewer3DState();
}

class _Viewer3DState extends State<Viewer3D> {
  late final WebViewController _web;
  bool _ready = false;
  bool _failed = false;
  bool _cables = true;

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..addJavaScriptChannel('ElektrUyBridge', onMessageReceived: (m) {
        final msg = jsonDecode(m.message) as Map<String, dynamic>;
        switch (msg['type']) {
          case 'ready':
            _ready = true;
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
  void didUpdateWidget(covariant Viewer3D old) {
    super.didUpdateWidget(old);
    if (old.sceneJson != widget.sceneJson) _push();
  }

  void _push() {
    if (!_ready) return;
    _web.runJavaScript('window.ElektrUy.load(${jsonEncode(jsonEncode(widget.sceneJson))});');
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return EmptyState(icon: Icons.view_in_ar, title: context.l.viewer3dError);
    return Stack(children: [
      Positioned.fill(child: WebViewWidget(controller: _web)),
      Positioned(
        right: 12,
        bottom: 12,
        child: Column(children: [
          FloatingActionButton.small(
            heroTag: 'v3d_reset',
            onPressed: () => _web.runJavaScript('window.ElektrUy.resetView()'),
            child: const Icon(Icons.center_focus_strong),
          ),
          const SizedBox(height: 8),
          FloatingActionButton.small(
            heroTag: 'v3d_cables',
            onPressed: () {
              setState(() => _cables = !_cables);
              _web.runJavaScript("window.ElektrUy.setLayer('cables', $_cables)");
            },
            child: Icon(_cables ? Icons.cable : Icons.visibility_off),
          ),
        ]),
      ),
    ]);
  }
}
