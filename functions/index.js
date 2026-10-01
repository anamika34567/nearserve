const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

initializeApp();

const db = getFirestore();

exports.escalateUnacceptedMaintenanceOffers = onSchedule({
  schedule: 'every 1 minutes',
  timeZone: 'Etc/UTC',
  region: 'us-central1',
  maxInstances: 1,
}, async () => {
  const now = new Date().toISOString();
  const dueRequests = await db.collection('maintenanceRequests')
    .where('status', '==', 'offered')
    .where('managerEscalated', '==', false)
    .where('managerEscalationAt', '<=', now)
    .limit(100)
    .get();

  for (const dueRequest of dueRequests.docs) {
    const requestRef = dueRequest.ref;
    await db.runTransaction(async (transaction) => {
      const managersQuery = db.collection('users')
        .where('buildingId', '==', dueRequest.data().buildingId)
        .where('role', 'in', ['manager', 'admin']);
      const [requestSnapshot, managersSnapshot] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(managersQuery),
      ]);

      if (!requestSnapshot.exists) return;
      const request = requestSnapshot.data();
      if (request.status !== 'offered'
        || request.managerEscalated === true
        || request.managerEscalationAt > now) return;

      const managers = managersSnapshot.docs.filter((manager) =>
        manager.data().role === 'manager' || manager.data().role === 'admin'
      );
      if (!managers.length) return;

      const escalatedAt = new Date().toISOString();
      for (const manager of managers) {
        const notificationRef = db.collection('notifications')
          .doc(`maintenance_escalation_${requestRef.id}_${manager.id}`);
        transaction.create(notificationRef, {
          userId: manager.id,
          type: 'maintenance',
          message: `The ${request.category} request for flat ${request.unitNumber || '—'} has not been accepted and needs assignment.`,
          data: { requestId: requestRef.id },
          isRead: false,
          createdAt: escalatedAt,
        });
      }
      transaction.update(requestRef, {
        managerEscalated: true,
        managerEscalatedAt: escalatedAt,
      });
    });
  }
});
