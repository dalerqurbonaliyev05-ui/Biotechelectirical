import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/electricians_service.dart';
import '../../../state/providers.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import 'electricians_screen.dart';

/// Electrician self-registration. Every save puts the profile back to `pending`
/// (enforced by a DB trigger) until an admin approves it.
class ElectricianApplyScreen extends ConsumerStatefulWidget {
  const ElectricianApplyScreen({super.key});

  @override
  ConsumerState<ElectricianApplyScreen> createState() => _ElectricianApplyScreenState();
}

class _ElectricianApplyScreenState extends ConsumerState<ElectricianApplyScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _telegram = TextEditingController();
  final _district = TextEditingController();
  final _experience = TextEditingController(text: '0');
  final _priceFrom = TextEditingController();
  final _priceTo = TextEditingController();
  final _bio = TextEditingController();
  final _services = <String>{};
  String? _region;
  Electrician? _existing;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _region = ref.read(settingsProvider).region;
    _load();
  }

  Future<void> _load() async {
    final svc = ref.read(electriciansServiceProvider);
    Electrician? e;
    try {
      e = await svc?.myProfile();
    } catch (_) {}
    if (!mounted) return;
    if (e != null) {
      _name.text = e.name;
      _phone.text = e.phone;
      _telegram.text = e.telegram ?? '';
      _district.text = e.district ?? '';
      _experience.text = '${e.experience}';
      _priceFrom.text = e.priceFrom?.round().toString() ?? '';
      _priceTo.text = e.priceTo?.round().toString() ?? '';
      _bio.text = e.bio;
      _services.addAll(e.services);
      _region = e.city;
    }
    setState(() {
      _existing = e;
      _loading = false;
    });
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate() || _region == null) return;
    setState(() => _saving = true);
    final tg = _telegram.text.trim();
    try {
      await ref.read(electriciansServiceProvider)!.saveProfile({
        'name': _name.text.trim(),
        'phone': _phone.text.trim(),
        'telegram': tg.isEmpty ? null : tg,
        'city': _region,
        'district': _district.text.trim().isEmpty ? null : _district.text.trim(),
        'experience_years': int.tryParse(_experience.text.trim()) ?? 0,
        'price_from': double.tryParse(_priceFrom.text.replaceAll(' ', '')),
        'price_to': double.tryParse(_priceTo.text.replaceAll(' ', '')),
        'bio': _bio.text.trim(),
        'services': _services.toList(),
      });
      if (!mounted) return;
      showSnack(context, context.l.applyPending);
      await _load();
    } on PostgrestException catch (e) {
      if (mounted) showSnack(context, context.l.errorWithDetail(e.message), error: true);
    } catch (_) {
      if (mounted) showSnack(context, context.l.errorGeneric, error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final regions = ref.watch(contentProvider).value?.regions ?? const [];
    String? required(String? v) => (v == null || v.trim().isEmpty) ? l.fieldRequired : null;

    final status = _existing?.status;
    final (risk, statusText) = switch (status) {
      'approved' => (Risk.ok, l.applyApproved),
      'rejected' => (Risk.danger, l.applyRejected),
      'blocked' => (Risk.danger, l.applyBlocked),
      'pending' => (Risk.warn, l.applyPending),
      _ => (Risk.ok, ''),
    };

    return Scaffold(
      appBar: AppBar(title: Text(l.applyTitle)),
      body: RequiresAccount(
        child: _loading
            ? const Skeleton()
            : Form(
                key: _form,
                child: ListView(padding: const EdgeInsets.all(16), children: [
                  if (statusText.isNotEmpty) ...[RiskChip(risk: risk, label: statusText), const SizedBox(height: 8)],
                  if (_existing != null)
                    Text(l.applyEditNote, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: RiskColors.danger)),
                  const SizedBox(height: 8),
                  TextFormField(controller: _name, decoration: InputDecoration(labelText: l.applyName), validator: required, maxLength: 120),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(labelText: l.applyPhone),
                    validator: (v) => RegExp(r'^\+?[0-9 ()-]{7,20}$').hasMatch((v ?? '').trim()) ? null : l.phoneInvalid,
                  ),
                  TextFormField(
                    controller: _telegram,
                    decoration: InputDecoration(labelText: l.applyTelegram, prefixText: '@'),
                    validator: (v) {
                      final s = (v ?? '').trim().replaceAll('@', '');
                      return s.isEmpty || RegExp(r'^[A-Za-z0-9_]{4,64}$').hasMatch(s) ? null : l.fieldRequired;
                    },
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: regions.any((r) => r.code == _region) ? _region : null,
                    isExpanded: true,
                    decoration: InputDecoration(labelText: l.filterRegion),
                    items: [for (final r in regions) DropdownMenuItem(value: r.code, child: Text(r.name(lang)))],
                    validator: (v) => v == null ? l.fieldRequired : null,
                    onChanged: (v) => setState(() => _region = v),
                  ),
                  TextFormField(controller: _district, decoration: InputDecoration(labelText: l.filterDistrict), maxLength: 120),
                  TextFormField(
                    controller: _experience,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.applyExperience),
                    validator: (v) {
                      final n = int.tryParse((v ?? '').trim());
                      return n == null || n < 0 || n > 70 ? l.fieldRequired : null;
                    },
                  ),
                  Row(children: [
                    Expanded(
                      child: TextFormField(
                        controller: _priceFrom,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(labelText: l.applyPriceFrom, suffixText: l.currencyUZS),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextFormField(
                        controller: _priceTo,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(labelText: l.applyPriceTo, suffixText: l.currencyUZS),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  TextFormField(controller: _bio, maxLines: 4, maxLength: 2000, decoration: InputDecoration(labelText: l.applyBio)),
                  Text(l.applyServices, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    for (final s in ElectriciansService.services)
                      FilterChip(
                        label: Text(serviceLabel(context, s)),
                        selected: _services.contains(s),
                        onSelected: (v) => setState(() => v ? _services.add(s) : _services.remove(s)),
                      ),
                  ]),
                  const SizedBox(height: 80),
                ]),
              ),
      ),
      bottomNavigationBar: _loading || status == 'blocked'
          ? null
          : BottomAction(
              child: FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send),
                label: Text(l.applySubmit),
              ),
            ),
    );
  }
}
