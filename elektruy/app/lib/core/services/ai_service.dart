import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../env.dart';

/// Error from an Edge Function, already localized by the server (`message`).
class AiError implements Exception {
  AiError(this.code, this.message, {this.status});

  final String code;
  final String message;
  final int? status;

  @override
  String toString() => message;
}

class RoomEstimate {
  RoomEstimate({
    required this.usable,
    this.length,
    this.width,
    this.height,
    required this.confidence,
    required this.notes,
    required this.references,
  });

  final bool usable;
  final double? length;
  final double? width;
  final double? height;
  final String confidence;
  final String notes;
  final List<String> references;

  Map<String, dynamic> toJson() => {
        'usable': usable,
        'length_m': length,
        'width_m': width,
        'height_m': height,
        'confidence': confidence,
        'notes': notes,
        'references': references,
      };

  factory RoomEstimate.fromJson(Map<String, dynamic> j) => RoomEstimate(
        usable: j['usable'] == true,
        length: (j['length_m'] as num?)?.toDouble(),
        width: (j['width_m'] as num?)?.toDouble(),
        height: (j['height_m'] as num?)?.toDouble(),
        confidence: (j['confidence'] as String?) ?? 'low',
        notes: (j['notes'] as String?) ?? '',
        references: [
          for (final r in (j['reference_objects'] as List? ?? j['references'] as List? ?? const []))
            r is Map ? '${r['name']} ≈ ${r['assumed_size_m']} m' : r.toString(),
        ],
      );
}

class AiService {
  AiService(this.client);

  final SupabaseClient client;
  static const _uuid = Uuid();

  Future<Map<String, dynamic>> _invoke(String fn, Map<String, dynamic> body) async {
    try {
      final res = await client.functions.invoke(fn, body: body);
      return (res.data as Map).cast<String, dynamic>();
    } on FunctionException catch (e) {
      final d = e.details;
      if (d is Map && d['message'] is String) {
        throw AiError((d['error'] as String?) ?? 'error', d['message'] as String, status: e.status);
      }
      throw AiError('error', e.reasonPhrase ?? 'HTTP ${e.status}', status: e.status);
    }
  }

  Future<RoomEstimate> estimateRoom({required List<String> photoPaths, required String lang, String? hint}) async {
    final j = await _invoke('estimate-room', {'photo_paths': photoPaths, 'lang': lang, 'hint': ?hint});
    return RoomEstimate.fromJson(j);
  }

  /// Uploads the photos to the private work-check bucket and asks the AI to review them.
  Future<Map<String, dynamic>> checkWork({
    required List<File> photos,
    required String lang,
    String? projectId,
    String? context,
  }) async {
    final uid = client.auth.currentUser?.id;
    if (uid == null) throw AiError('unauthorized', 'unauthorized');
    final checkId = _uuid.v4();
    final paths = <String>[];
    for (final f in photos) {
      final path = '$uid/$checkId/${_uuid.v4()}.jpg';
      await client.storage.from(Env.workChecksBucket).upload(
            path,
            f,
            fileOptions: const FileOptions(contentType: 'image/jpeg'),
          );
      paths.add(path);
    }
    return _invoke('check-work', {
      'image_paths': paths,
      'lang': lang,
      'project_id': ?projectId,
      if (context != null && context.isNotEmpty) 'context': context,
    });
  }

  Future<void> flagWorkCheck(String id, {String? feedback}) => client
      .from('ew_work_checks')
      .update({'flagged_wrong': true, 'user_feedback': ?feedback}).eq('id', id);

  Future<List<Map<String, dynamic>>> workCheckHistory() async {
    final rows = await client
        .from('ew_work_checks')
        .select('id, created_at, overall, result, flagged_wrong, project_id')
        .order('created_at', ascending: false)
        .limit(20);
    return rows.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> deleteMyData() => _invoke('delete-account', {'confirm': 'DELETE'});
}
