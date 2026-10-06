import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/project/project_doc.dart';
import '../../state/providers.dart';
import '../widgets/common.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final user = ref.watch(currentUserProvider);
    final projects = ref.watch(projectsProvider);
    final name = (user?.userMetadata?['full_name'] ?? user?.userMetadata?['name']) as String?;
    final first = name?.split(' ').first;

    final actions = [
      (Icons.school, l.lessons, '/lessons', const Color(0xFF1565C0)),
      (Icons.calculate, l.materialsCalc, '/materials', const Color(0xFF6A1B9A)),
      (Icons.fact_check, l.checkWork, '/check', const Color(0xFF2E7D32)),
      (Icons.engineering, l.electricians, '/electricians', const Color(0xFFEF6C00)),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(first == null ? l.homeGreetingAnon : l.homeGreeting(first)),
        actions: [IconButton(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings), tooltip: l.settings)],
      ),
      body: Column(children: [
        const OfflineBanner(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.read(syncProvider).run(),
            child: ListView(padding: const EdgeInsets.all(16), children: [
              SizedBox(
                height: 64,
                child: FilledButton.icon(
                  onPressed: () => context.push('/project/new'),
                  icon: const Icon(Icons.add_a_photo, size: 28),
                  label: Text(l.newProject, style: const TextStyle(fontSize: 18)),
                ),
              ),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.45,
                children: [
                  for (final (icon, label, path, color) in actions)
                    Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => context.push(path),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            CircleAvatar(backgroundColor: color.withValues(alpha: 0.12), child: Icon(icon, color: color)),
                            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15), maxLines: 2),
                          ]),
                        ),
                      ),
                    ),
                ],
              ),
              SectionTitle(l.myProjects),
              projects.when(
                loading: () => const Skeleton(lines: 2),
                error: (e, _) => ErrorView(message: l.errorGeneric, onRetry: () => ref.invalidate(projectsProvider)),
                data: (list) => list.isEmpty
                    ? EmptyState(icon: Icons.home_work_outlined, title: l.noProjects, body: l.noProjectsHint)
                    : Column(children: [for (final p in list) _ProjectCard(doc: p)]),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _ProjectCard extends ConsumerWidget {
  const _ProjectCard({required this.doc});

  final ProjectDoc doc;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final (risk, status) = doc.outOfScope
        ? (Risk.danger, l.statusOutOfScope)
        : switch (doc.status) {
            ProjectStatus.draft => (Risk.warn, l.statusDraft),
            ProjectStatus.planned => (Risk.ok, l.statusPlanned),
            ProjectStatus.inProgress => (Risk.warn, l.statusInProgress),
            ProjectStatus.done => (Risk.ok, l.statusDone),
          };
    final photo = doc.photos.isEmpty ? null : doc.photos.first.localPath;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () {
            if (doc.outOfScope) {
              context.push('/project/${doc.id}/oos');
            } else if (doc.result != null) {
              context.push('/project/${doc.id}');
            } else {
              context.push('/project/${doc.id}/edit');
            }
          },
          onLongPress: () async {
            if (await confirmDialog(context, title: l.deleteProjectConfirm, ok: l.delete, danger: true)) {
              await ref.read(projectsProvider.notifier).delete(doc);
            }
          },
          child: Row(children: [
            SizedBox(
              width: 96,
              height: 96,
              child: photo != null && File(photo).existsSync()
                  ? Image.file(File(photo), fit: BoxFit.cover, cacheWidth: 300)
                  : Container(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: const Icon(Icons.meeting_room_outlined, size: 40),
                    ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(doc.title.isEmpty ? l.projectUntitled : doc.title,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text(
                    [
                      if (doc.hasDimensions) '${doc.length!.toStringAsFixed(1)}×${doc.width!.toStringAsFixed(1)}×${doc.height!.toStringAsFixed(1)} ${l.unitM}',
                      DateFormat.yMMMd(lang).format(doc.updatedAt),
                    ].join(' · '),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  RiskChip(risk: risk, label: status),
                ]),
              ),
            ),
            const Icon(Icons.chevron_right),
            const SizedBox(width: 8),
          ]),
        ),
      ),
    );
  }
}

