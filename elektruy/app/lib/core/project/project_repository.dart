import 'dart:convert';
import 'dart:io';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../calc/calc.dart';
import '../db/local_db.dart';
import '../env.dart';
import 'project_doc.dart';

const _uuid = Uuid();

/// Offline-first project storage. Every change is written to the local DB first;
/// [sync] pushes dirty projects (rows, photos, markers) to Supabase when online.
class ProjectRepository {
  ProjectRepository(this.db, this.client);

  final LocalDb db;
  final SupabaseClient? client;

  String? get _uid => client?.auth.currentUser?.id;

  Future<List<ProjectDoc>> list() async {
    final rows = await db.allProjects();
    final uid = _uid;
    return rows
        .where((r) => r.ownerId == null || r.ownerId == uid)
        .map((r) => ProjectDoc.fromJson(jsonDecode(r.json) as Map<String, dynamic>))
        .toList();
  }

  Future<ProjectDoc?> get(String id) async {
    final row = await db.project(id);
    if (row == null || row.deleted) return null;
    return ProjectDoc.fromJson(jsonDecode(row.json) as Map<String, dynamic>);
  }

  ProjectDoc create({String title = ''}) => ProjectDoc(id: _uuid.v4(), title: title);

  Future<void> save(ProjectDoc doc) async {
    doc.updatedAt = DateTime.now();
    await db.saveProject(doc.id, jsonEncode(doc.toJson()), ownerId: _uid);
  }

  Future<void> delete(ProjectDoc doc) async {
    await db.markProjectDeleted(doc.id);
    final dir = await _projectDir(doc.id);
    if (dir.existsSync()) dir.deleteSync(recursive: true);
  }

  /// Removes every project and photo stored on this phone (sign-out / delete account).
  /// Server data is untouched.
  Future<void> wipeLocal() async {
    await db.clearUserData();
    final dir = Directory(p.join((await getApplicationDocumentsDirectory()).path, 'projects'));
    if (dir.existsSync()) dir.deleteSync(recursive: true);
  }

  Future<Directory> _projectDir(String id) async {
    final dir = Directory(p.join((await getApplicationDocumentsDirectory()).path, 'projects', id));
    if (!dir.existsSync()) dir.createSync(recursive: true);
    return dir;
  }

  /// Copies a picked/taken photo into the project folder, resized to ≤1600 px JPEG
  /// (keeps uploads and AI requests small and strips EXIF location data).
  Future<PhotoDoc> importPhoto(ProjectDoc doc, String sourcePath) async {
    final id = _uuid.v4();
    final target = p.join((await _projectDir(doc.id)).path, '$id.jpg');
    final out = await FlutterImageCompress.compressAndGetFile(
      sourcePath,
      target,
      minWidth: 1600,
      minHeight: 1600,
      quality: 80,
      keepExif: false,
    );
    if (out == null) {
      await File(sourcePath).copy(target);
    }
    return PhotoDoc(id: id, localPath: target);
  }

  // ---------------------------------------------------------------- sync
  /// Pushes dirty projects. Returns the number of projects synced.
  Future<int> sync() async {
    final c = client;
    final uid = _uid;
    if (c == null || uid == null) return 0;
    var n = 0;
    for (final row in await db.dirtyProjects()) {
      if (row.ownerId != null && row.ownerId != uid) continue;
      final doc = ProjectDoc.fromJson(jsonDecode(row.json) as Map<String, dynamic>);
      if (row.deleted) {
        await _deleteRemote(c, uid, doc.id);
        await db.purgeProject(doc.id);
        n++;
        continue;
      }
      await pushProject(doc);
      n++;
    }
    return n;
  }

  /// Uploads one project (photos first, so paths are valid for the AI functions).
  Future<void> pushProject(ProjectDoc doc) async {
    final c = client;
    final uid = _uid;
    if (c == null || uid == null) return;

    for (final photo in doc.photos) {
      if (photo.remotePath != null || photo.localPath == null) continue;
      final file = File(photo.localPath!);
      if (!file.existsSync()) continue;
      final path = '$uid/${doc.id}/${photo.id}.jpg';
      await c.storage.from(Env.projectPhotosBucket).upload(
            path,
            file,
            fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
          );
      photo.remotePath = path;
    }

    await c.from('ew_projects').upsert({
      'id': doc.id,
      'user_id': uid,
      'title': doc.title,
      'room_length': doc.length,
      'room_width': doc.width,
      'room_height': doc.height,
      'wall_material': doc.answers.wallMaterial.name,
      'wiring_type': doc.answers.wiringType.name,
      'answers': {
        ...doc.answers.toJson(),
        'placements': doc.placements.map((k, v) => MapEntry(k, v.toJson())),
        'extra_devices': doc.extraDevices.map((d) => d.toJson()).toList(),
        'lamp_switch': doc.lampSwitch,
        'dims_source': doc.dimsSource,
        if (doc.aiEstimate != null) 'ai_estimate': doc.aiEstimate,
      },
      'result': doc.result ?? {},
      'out_of_scope': doc.outOfScope,
      'status': doc.status.db,
    });

    final uploaded = doc.photos.where((p) => p.remotePath != null).toList();
    if (uploaded.isNotEmpty) {
      await c.from('ew_project_photos').upsert([
        for (var i = 0; i < uploaded.length; i++)
          {
            'id': uploaded[i].id,
            'project_id': doc.id,
            'user_id': uid,
            'storage_path': uploaded[i].remotePath,
            'sort_order': i,
            'wall': uploaded[i].wall?.label,
            'width': uploaded[i].width,
            'height': uploaded[i].height,
          },
      ]);
    }
    final keepIds = uploaded.map((p) => p.id).toList();
    final stale = await c.from('ew_project_photos').select('id, storage_path').eq('project_id', doc.id);
    final removePaths = <String>[];
    for (final s in stale) {
      if (!keepIds.contains(s['id'])) {
        removePaths.add(s['storage_path'] as String);
        await c.from('ew_project_photos').delete().eq('id', s['id'] as String);
      }
    }
    if (removePaths.isNotEmpty) await c.storage.from(Env.projectPhotosBucket).remove(removePaths);

    // Markers: replace the whole set (small).
    await c.from('ew_markers').delete().eq('project_id', doc.id);
    final room = doc.room;
    final devices = room == null ? const <Device>[] : doc.devices(room);
    if (doc.markers.isNotEmpty) {
      await c.from('ew_markers').insert([
        for (final m in doc.markers)
          {
            'id': m.id,
            'project_id': doc.id,
            'user_id': uid,
            'photo_id': keepIds.contains(m.photoId) ? m.photoId : null,
            'type': m.kind.dbType,
            'x': m.x,
            'y': m.y,
            'note': m.note,
            'link_key': m.linkKey,
            'pos3d': {
              'switch': m.switchKind.name,
              'ceiling': m.onCeiling,
              if (room != null)
                'pos': devices.where((d) => d.id == m.deviceId).map((d) => d.position(room).toList()).firstOrNull,
            },
          },
      ]);
    }
    await db.saveProject(doc.id, jsonEncode(doc.toJson()), ownerId: uid, dirty: false);
  }

  Future<void> _deleteRemote(SupabaseClient c, String uid, String projectId) async {
    final photos = await c.from('ew_project_photos').select('storage_path').eq('project_id', projectId);
    final paths = [for (final ph in photos) ph['storage_path'] as String];
    if (paths.isNotEmpty) await c.storage.from(Env.projectPhotosBucket).remove(paths);
    await c.from('ew_projects').delete().eq('id', projectId);
  }

  /// Restores projects that exist on the server but not on this phone (new device).
  Future<int> pullMissing() async {
    final c = client;
    final uid = _uid;
    if (c == null || uid == null) return 0;
    final local = {for (final r in await db.allProjects()) r.id};
    final rows = await c
        .from('ew_projects')
        .select('*, ew_project_photos(id, storage_path, sort_order, wall, width, height), '
            'ew_markers(id, photo_id, type, x, y, note, link_key, pos3d)')
        .eq('user_id', uid);
    var n = 0;
    for (final r in rows) {
      if (local.contains(r['id'])) continue;
      final answers = ((r['answers'] as Map?) ?? const {}).cast<String, dynamic>();
      final photos = ((r['ew_project_photos'] as List?) ?? const []).cast<Map<String, dynamic>>()
        ..sort((a, b) => ((a['sort_order'] as num?) ?? 0).compareTo((b['sort_order'] as num?) ?? 0));
      final doc = ProjectDoc.fromJson({
        'id': r['id'],
        'title': r['title'],
        'length': r['room_length'],
        'width': r['room_width'],
        'height': r['room_height'],
        'answers': answers,
        'placements': answers['placements'],
        'extra_devices': answers['extra_devices'],
        'lamp_switch': answers['lamp_switch'],
        'dims_source': answers['dims_source'],
        'ai_estimate': answers['ai_estimate'],
        'result': r['result'],
        'status': r['status'],
        'out_of_scope': r['out_of_scope'],
        'created_at': r['created_at'],
        'updated_at': r['updated_at'],
        'photos': [
          for (final ph in photos)
            {
              'id': ph['id'],
              'remote': ph['storage_path'],
              if (ph['wall'] != null) 'wall': (ph['wall'] as String).toLowerCase(),
              'w': ph['width'],
              'h': ph['height'],
            },
        ],
        'markers': [
          for (final m in ((r['ew_markers'] as List?) ?? const []).cast<Map<String, dynamic>>())
            if (m['photo_id'] != null && m['x'] != null)
              {
                'id': m['id'],
                'photo': m['photo_id'],
                'kind': MarkerKind.fromDb(m['type'] as String).name,
                'x': m['x'],
                'y': m['y'],
                'note': m['note'],
                'link': m['link_key'],
                'switch': (m['pos3d'] as Map?)?['switch'] ?? 'single',
                'ceiling': (m['pos3d'] as Map?)?['ceiling'] ?? true,
              },
        ],
      });
      await db.saveProject(doc.id, jsonEncode(doc.toJson()), ownerId: uid, dirty: false);
      n++;
    }
    return n;
  }

  /// Short-lived URL for a photo that only exists on the server.
  Future<String?> signedPhotoUrl(String remotePath) async {
    final c = client;
    if (c == null) return null;
    return c.storage.from(Env.projectPhotosBucket).createSignedUrl(remotePath, 3600);
  }
}
