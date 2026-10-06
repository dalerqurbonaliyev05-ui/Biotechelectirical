import 'package:supabase_flutter/supabase_flutter.dart';

class Electrician {
  Electrician(this.raw);

  final Map<String, dynamic> raw;

  String get id => raw['id'] as String;
  String? get userId => raw['user_id'] as String?;
  String get name => raw['name'] as String;
  String get phone => raw['phone'] as String;
  String? get telegram => raw['telegram'] as String?;
  String get city => raw['city'] as String;
  String? get district => raw['district'] as String?;
  int get experience => (raw['experience_years'] as num?)?.toInt() ?? 0;
  double? get priceFrom => (raw['price_from'] as num?)?.toDouble();
  double? get priceTo => (raw['price_to'] as num?)?.toDouble();
  String get bio => (raw['bio'] as String?) ?? '';
  List<String> get services => ((raw['services'] as List?) ?? const []).cast<String>();
  String get status => (raw['status'] as String?) ?? 'pending';
  double get rating => (raw['rating_avg'] as num?)?.toDouble() ?? 0;
  int get ratingCount => (raw['rating_count'] as num?)?.toInt() ?? 0;
}

class Review {
  Review(this.raw);

  final Map<String, dynamic> raw;

  String get id => raw['id'] as String;
  String get userId => raw['user_id'] as String;
  int get rating => (raw['rating'] as num).toInt();
  String get text => (raw['text'] as String?) ?? '';
  DateTime get createdAt => DateTime.parse(raw['created_at'] as String);
}

/// In-app marketplace. Everyone signed in sees approved profiles; applications go
/// to `pending` and are approved by an admin (enforced by DB triggers + RLS).
class ElectriciansService {
  ElectriciansService(this.client);

  final SupabaseClient client;

  static const services = ['sockets', 'lighting', 'wiring', 'panel', 'grounding', 'inspection'];

  Future<List<Electrician>> search({String? region, String? district, String? query}) async {
    var q = client.from('ew_electricians').select().eq('status', 'approved');
    if (region != null && region.isNotEmpty) q = q.eq('city', region);
    if (district != null && district.trim().isNotEmpty) q = q.ilike('district', '%${district.trim()}%');
    final rows = await q.order('rating_avg', ascending: false).order('rating_count', ascending: false).limit(100);
    var list = rows.map(Electrician.new).toList();
    final s = query?.trim().toLowerCase() ?? '';
    if (s.isNotEmpty) {
      list = list.where((e) => e.name.toLowerCase().contains(s) || e.bio.toLowerCase().contains(s) || e.services.any((x) => x.contains(s))).toList();
    }
    return list;
  }

  Future<Electrician?> get(String id) async {
    final row = await client.from('ew_electricians').select().eq('id', id).maybeSingle();
    return row == null ? null : Electrician(row);
  }

  Future<List<Review>> reviews(String electricianId) async {
    final rows = await client
        .from('ew_reviews')
        .select('id, user_id, rating, text, created_at')
        .eq('electrician_id', electricianId)
        .order('created_at', ascending: false);
    return rows.map(Review.new).toList();
  }

  Future<void> saveReview({required String electricianId, required int rating, String? text}) async {
    final uid = client.auth.currentUser!.id;
    await client.from('ew_reviews').upsert(
      {'electrician_id': electricianId, 'user_id': uid, 'rating': rating, 'text': (text ?? '').trim().isEmpty ? null : text!.trim()},
      onConflict: 'electrician_id,user_id',
    );
  }

  Future<Electrician?> myProfile() async {
    final uid = client.auth.currentUser?.id;
    if (uid == null) return null;
    final row = await client.from('ew_electricians').select().eq('user_id', uid).maybeSingle();
    return row == null ? null : Electrician(row);
  }

  Future<void> saveProfile(Map<String, dynamic> data) async {
    final uid = client.auth.currentUser!.id;
    final existing = await myProfile();
    if (existing == null) {
      await client.from('ew_electricians').insert({...data, 'user_id': uid});
    } else {
      await client.from('ew_electricians').update(data).eq('id', existing.id);
    }
  }

  Future<void> report({required String type, required String target, required String text}) =>
      client.from('ew_reports').insert({'type': type, 'target': target, 'text': text});
}
