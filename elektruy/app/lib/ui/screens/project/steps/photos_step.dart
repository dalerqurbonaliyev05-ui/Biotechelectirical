import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/calc/geometry.dart';
import '../../../../state/providers.dart';
import '../../../widgets/common.dart';
import '../wizard_screen.dart';

const maxPhotos = 6;

class PhotosStep extends ConsumerStatefulWidget {
  const PhotosStep({super.key, required this.ctrl});

  final WizardController ctrl;

  @override
  ConsumerState<PhotosStep> createState() => _PhotosStepState();
}

class _PhotosStepState extends ConsumerState<PhotosStep> {
  final _picker = ImagePicker();
  bool _busy = false;

  Future<void> _add(ImageSource source) async {
    final doc = widget.ctrl.doc;
    final left = maxPhotos - doc.photos.length;
    if (left <= 0) return;
    setState(() => _busy = true);
    try {
      final files = source == ImageSource.camera
          ? [if (await _picker.pickImage(source: source, maxWidth: 2400, imageQuality: 90) case final XFile f) f]
          : (await _picker.pickMultiImage(maxWidth: 2400, imageQuality: 90, limit: left)).take(left).toList();
      for (final f in files) {
        final photo = await ref.read(projectRepoProvider).importPhoto(doc, f.path);
        final img = await decodeImageFromList(await File(photo.localPath!).readAsBytes());
        photo
          ..width = img.width
          ..height = img.height;
        // Suggest walls in order A, B, C, D for consecutive photos.
        photo.wall = Wall.values[doc.photos.length % 4];
        await widget.ctrl.update((d) => d.photos.add(photo));
      }
    } catch (e) {
      if (mounted) showSnack(context, context.l.errorWithDetail('$e'), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final doc = widget.ctrl.doc;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(l.photosTitle, style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 6),
      Text(l.photosHint),
      const SizedBox(height: 8),
      Card(
        color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.4),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            const Icon(Icons.explore_outlined),
            const SizedBox(width: 10),
            Expanded(child: Text(l.wallsHelp)),
          ]),
        ),
      ),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(
          child: FilledButton.icon(
            onPressed: _busy || doc.photos.length >= maxPhotos ? null : () => _add(ImageSource.camera),
            icon: const Icon(Icons.photo_camera),
            label: Text(l.takePhoto),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _busy || doc.photos.length >= maxPhotos ? null : () => _add(ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: Text(l.pickFromGallery),
          ),
        ),
      ]),
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text('${doc.photos.length}/$maxPhotos · ${l.photoLimit}', style: Theme.of(context).textTheme.bodySmall),
      ),
      if (_busy) const LinearProgressIndicator(),
      if (doc.photos.isEmpty)
        EmptyState(icon: Icons.add_photo_alternate_outlined, title: l.needOnePhoto)
      else
        for (final photo in doc.photos)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            clipBehavior: Clip.antiAlias,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              AspectRatio(
                aspectRatio: 4 / 3,
                child: photo.localPath != null && File(photo.localPath!).existsSync()
                    ? Image.file(File(photo.localPath!), fit: BoxFit.cover, cacheWidth: 900)
                    : const Icon(Icons.cloud_outlined, size: 48),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
                child: Row(children: [
                  Text(l.photoShowsWall),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Wrap(spacing: 6, children: [
                      for (final w in Wall.values)
                        ChoiceChip(
                          label: Text(w.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                          selected: photo.wall == w,
                          onSelected: (_) => widget.ctrl.update((_) => photo.wall = w),
                        ),
                    ]),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline),
                    tooltip: l.delete,
                    onPressed: () => widget.ctrl.update((d) {
                      d.photos.remove(photo);
                      d.markers.removeWhere((m) => m.photoId == photo.id);
                      if (photo.localPath != null) {
                        final f = File(photo.localPath!);
                        if (f.existsSync()) f.deleteSync();
                      }
                    }),
                  ),
                ]),
              ),
            ]),
          ),
    ]);
  }
}
