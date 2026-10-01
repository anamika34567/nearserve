# NearServe Residence

Apartment maintenance app for residents, building technicians, and building management. Residents join with a verified, single-use invitation, report flat maintenance issues with photos, and receive automatic assignment to a matching available technician in the same building.

## Run on Android

```powershell
npm.cmd install
npm.cmd run android -- --clear
```

Start an Android emulator before running the command.

## Demo Firebase Setup

The app uses the Firebase project configured in `services/firebase.js`. In Firebase Console, enable Email/Password under Authentication and create Firestore. Create the first trusted manager account in Authentication, then create a matching `users/{uid}` profile in Firestore. After that, managers invite residents and technicians from the app.

Manager document example:

```json
{
	"name": "Building Manager",
	"email": "manager@example.com",
	"role": "manager",
	"buildingId": "sample-building",
	"buildingName": "Sample Residence"
}
```

From the manager account's home screen, choose Resident or Technician and create an invitation. Residents are assigned a flat; technicians are assigned one or more trade skills. Send the generated one-time code only to the invited email. The invitee signs up with that email, verifies the email link, then returns to the app and taps the verification button. The app consumes the invitation atomically and assigns the invited role/building/flat or skills. Codes expire after seven days and cannot be reused.

The app writes invitations to `buildingInvitations`, profiles to `users`, requests to `maintenanceRequests`, and in-app alerts to `notifications`.

Technicians can toggle **Available for new jobs**. An available technician can hold only one active request; assignment and the technician's active-job reservation happen atomically. Going offline stops new automatic assignments without cancelling an existing job. Managers see availability and current job status and can reassign a not-yet-accepted job only to a free, available matching technician.

For each request, the assigned technician moves it through **Assigned → Accepted → On the way → Arrived → In progress → Completed**. Managers should set the building map pin from Home. While the technician is marked **On the way**, has granted foreground location permission, and keeps the request screen open, residents and management see the technician moving on the in-app map with the building destination. After completion, residents can rate the visit or send a complaint; management sees the feedback live and can mark complaints resolved.

Deploy the Firestore rules to the configured Firebase project before testing invitations:

```powershell
npx.cmd firebase-tools deploy --project serviceconnect-d4193 --only firestore
```

Request photo uploads require Firebase Storage, which currently requires the Blaze billing plan. Without billing, residents can submit text-only requests. If Storage is enabled, deploy its rules with `npx.cmd firebase-tools deploy --project serviceconnect-d4193 --only storage`.

## Important Before Real Use

The included rules scope resident reads to their own requests, technician access to assigned jobs in their building, management to their building, invitation creation to managers, and photo access to that building's staff and the submitting resident. The client-side assignment is suitable for a demo; for production, assignment should also be enforced by a trusted Cloud Function.
