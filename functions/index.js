const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();

const db = admin.firestore();

async function cleanupCollection(collectionName, now, batchSize = 200) {
  let totalDeleted = 0;

  while (true) {
    const snapshot = await db
      .collection(collectionName)
      .where('estado', '==', 'cerrado')
      .where('expiresAt', '<', now)
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    totalDeleted += snapshot.size;

    if (snapshot.size < batchSize) {
      break;
    }
  }

  return totalDeleted;
}

exports.cleanupExpiredOperationalDocs = onSchedule(
  {
    schedule: '15 3 * * *',
    timeZone: 'America/La_Paz',
    region: 'us-central1',
    memory: '256MiB',
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    const [deletedJefe, deletedSupervisor] = await Promise.all([
      cleanupCollection('servicios_jefe_operativo', now),
      cleanupCollection('servicios_supervisor', now),
    ]);

    logger.info('Cleanup job finished', {
      deletedJefe,
      deletedSupervisor,
      totalDeleted: deletedJefe + deletedSupervisor,
      executedAt: now.toDate().toISOString(),
    });
  }
);
