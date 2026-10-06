import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'local_db.g.dart';

/// Cached content (lessons, materials, config, legal) and small settings blobs.
class KvEntries extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

/// Room projects, stored as one JSON document each so they work fully offline.
class LocalProjects extends Table {
  TextColumn get id => text()();
  TextColumn get json => text()();
  IntColumn get updatedAt => integer()();
  BoolColumn get dirty => boolean().withDefault(const Constant(true))();
  BoolColumn get deleted => boolean().withDefault(const Constant(false))();
  TextColumn get ownerId => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class LessonProgressRows extends Table {
  TextColumn get lessonId => text()();
  IntColumn get stepIndex => integer().withDefault(const Constant(0))();
  TextColumn get checkedSteps => text().withDefault(const Constant('[]'))();
  IntColumn get quizScore => integer().nullable()();
  IntColumn get completedAt => integer().nullable()();
  IntColumn get updatedAt => integer()();
  BoolColumn get dirty => boolean().withDefault(const Constant(true))();

  @override
  Set<Column<Object>> get primaryKey => {lessonId};
}

/// Writes made while offline (consents, reports, safety-gate logs) waiting for sync.
class OutboxItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get kind => text()();
  TextColumn get payload => text()();
  IntColumn get createdAt => integer()();
}

@DriftDatabase(tables: [KvEntries, LocalProjects, LessonProgressRows, OutboxItems])
class LocalDb extends _$LocalDb {
  LocalDb([QueryExecutor? executor]) : super(executor ?? driftDatabase(name: 'elektruy'));

  @override
  int get schemaVersion => 1;

  // ---------------------------------------------------------------- key/value
  Future<String?> getKv(String key) async =>
      (await (select(kvEntries)..where((t) => t.key.equals(key))).getSingleOrNull())?.value;

  Future<void> putKv(String key, String value) => into(kvEntries).insertOnConflictUpdate(
        KvEntriesCompanion.insert(key: key, value: value, updatedAt: DateTime.now().millisecondsSinceEpoch),
      );

  Future<void> deleteKv(String key) => (delete(kvEntries)..where((t) => t.key.equals(key))).go();

  // ---------------------------------------------------------------- projects
  Future<List<LocalProject>> allProjects() => (select(localProjects)
        ..where((t) => t.deleted.equals(false))
        ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
      .get();

  Future<LocalProject?> project(String id) => (select(localProjects)..where((t) => t.id.equals(id))).getSingleOrNull();

  Future<void> saveProject(String id, String json, {String? ownerId, bool dirty = true, int? updatedAt}) =>
      into(localProjects).insertOnConflictUpdate(LocalProjectsCompanion.insert(
        id: id,
        json: json,
        updatedAt: updatedAt ?? DateTime.now().millisecondsSinceEpoch,
        dirty: Value(dirty),
        ownerId: Value(ownerId),
      ));

  Future<void> markProjectDeleted(String id) => (update(localProjects)..where((t) => t.id.equals(id)))
      .write(const LocalProjectsCompanion(deleted: Value(true), dirty: Value(true)));

  Future<void> markProjectClean(String id) =>
      (update(localProjects)..where((t) => t.id.equals(id))).write(const LocalProjectsCompanion(dirty: Value(false)));

  Future<List<LocalProject>> dirtyProjects() => (select(localProjects)..where((t) => t.dirty.equals(true))).get();

  Future<void> purgeProject(String id) => (delete(localProjects)..where((t) => t.id.equals(id))).go();

  // ---------------------------------------------------------------- progress
  Future<List<LessonProgressRow>> allProgress() => select(lessonProgressRows).get();

  Future<void> saveProgress(LessonProgressRowsCompanion row) => into(lessonProgressRows).insertOnConflictUpdate(row);

  Future<void> markProgressClean(String lessonId) => (update(lessonProgressRows)..where((t) => t.lessonId.equals(lessonId)))
      .write(const LessonProgressRowsCompanion(dirty: Value(false)));

  // ---------------------------------------------------------------- outbox
  Future<int> enqueue(String kind, String payload) => into(outboxItems)
      .insert(OutboxItemsCompanion.insert(kind: kind, payload: payload, createdAt: DateTime.now().millisecondsSinceEpoch));

  Future<List<OutboxItem>> pending() => (select(outboxItems)..orderBy([(t) => OrderingTerm.asc(t.id)])).get();

  Future<void> dequeue(int id) => (delete(outboxItems)..where((t) => t.id.equals(id))).go();

  /// Wipes everything that belongs to the signed-in user (used by "delete my data").
  Future<void> clearUserData() => transaction(() async {
        await delete(localProjects).go();
        await delete(lessonProgressRows).go();
        await delete(outboxItems).go();
      });
}
