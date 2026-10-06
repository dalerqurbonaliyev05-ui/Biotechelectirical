import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/services/electricians_service.dart';
import '../../../state/providers.dart';
import '../../widgets/common.dart';

String serviceLabel(BuildContext context, String key) {
  final l = context.l;
  return switch (key) {
    'sockets' => l.serviceSockets,
    'lighting' => l.serviceLighting,
    'wiring' => l.serviceWiring,
    'panel' => l.servicePanel,
    'grounding' => l.serviceGrounding,
    'inspection' => l.serviceInspection,
    _ => key,
  };
}

String priceText(BuildContext context, Electrician e, String lang) {
  if (e.priceFrom == null && e.priceTo == null) return '';
  return context.l.priceRange(
    e.priceFrom == null ? '…' : formatMoney(e.priceFrom!, lang),
    e.priceTo == null ? '…' : formatMoney(e.priceTo!, lang),
    context.l.currencyUZS,
  );
}

class ElectriciansScreen extends ConsumerStatefulWidget {
  const ElectriciansScreen({super.key});

  @override
  ConsumerState<ElectriciansScreen> createState() => _ElectriciansScreenState();
}

class _ElectriciansScreenState extends ConsumerState<ElectriciansScreen> {
  String? _region;
  final _district = TextEditingController();
  final _query = TextEditingController();
  Timer? _debounce;
  Future<List<Electrician>>? _future;

  @override
  void initState() {
    super.initState();
    _region = ref.read(settingsProvider).region;
    _search();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _district.dispose();
    _query.dispose();
    super.dispose();
  }

  void _search() {
    final svc = ref.read(electriciansServiceProvider);
    if (svc == null || ref.read(currentUserProvider) == null) return;
    setState(() => _future = svc.search(region: _region, district: _district.text, query: _query.text));
  }

  void _searchLater() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _search);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final regions = ref.watch(contentProvider).value?.regions ?? const [];
    ref.listen(currentUserProvider, (_, _) => _search());

    return Scaffold(
      appBar: AppBar(
        title: Text(l.electriciansTitle),
        actions: [
          TextButton.icon(
            onPressed: ref.watch(currentUserProvider) == null ? null : () => context.push('/electricians/apply'),
            icon: const Icon(Icons.engineering),
            label: Text(l.becomeElectrician),
          ),
        ],
      ),
      body: RequiresAccount(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Column(children: [
              DropdownButtonFormField<String?>(
                initialValue: _region,
                isExpanded: true,
                decoration: InputDecoration(labelText: l.filterRegion, prefixIcon: const Icon(Icons.place_outlined)),
                items: [
                  DropdownMenuItem(value: null, child: Text(l.allRegions)),
                  for (final r in regions) DropdownMenuItem(value: r.code, child: Text(r.name(lang))),
                ],
                onChanged: (v) {
                  _region = v;
                  _search();
                },
              ),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: _district,
                    decoration: InputDecoration(labelText: l.filterDistrict),
                    onChanged: (_) => _searchLater(),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _query,
                    decoration: InputDecoration(labelText: l.search, hintText: l.searchName, prefixIcon: const Icon(Icons.search)),
                    onChanged: (_) => _searchLater(),
                  ),
                ),
              ]),
            ]),
          ),
          Expanded(
            child: FutureBuilder<List<Electrician>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) return const Skeleton(lines: 3);
                if (snap.hasError) return ErrorView(message: l.errorGeneric, onRetry: _search);
                final list = snap.data ?? const [];
                if (list.isEmpty) return EmptyState(icon: Icons.engineering_outlined, title: l.noElectricians);
                return RefreshIndicator(
                  onRefresh: () async => _search(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    itemBuilder: (_, i) => _ElectricianCard(e: list[i], lang: lang, regionName: _regionName(list[i].city, lang)),
                  ),
                );
              },
            ),
          ),
        ]),
      ),
    );
  }

  String _regionName(String code, String lang) => ref.read(contentProvider).value?.region(code)?.name(lang) ?? code;
}

class _ElectricianCard extends StatelessWidget {
  const _ElectricianCard({required this.e, required this.lang, required this.regionName});

  final Electrician e;
  final String lang;
  final String regionName;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final price = priceText(context, e, lang);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/electricians/${e.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CircleAvatar(radius: 26, child: Text(e.name.isEmpty ? '?' : e.name[0].toUpperCase(), style: const TextStyle(fontSize: 22))),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(e.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                Text([regionName, if (e.district != null && e.district!.isNotEmpty) e.district].join(', '),
                    style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 4),
                Text(l.ratingLabel(e.rating.toStringAsFixed(1), e.ratingCount)),
                Text(l.experienceYears(e.experience), style: Theme.of(context).textTheme.bodySmall),
                if (price.isNotEmpty) Text(price, style: const TextStyle(fontWeight: FontWeight.w600)),
                if (e.services.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(spacing: 4, runSpacing: 4, children: [
                    for (final s in e.services)
                      Chip(label: Text(serviceLabel(context, s), style: const TextStyle(fontSize: 12)), visualDensity: VisualDensity.compact),
                  ]),
                ],
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
