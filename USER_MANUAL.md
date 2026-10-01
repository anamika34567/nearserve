# NearServe User Manual

**Apartment maintenance and local service coordination**  
Version 1.0

NearServe brings residents, building management, and maintenance technicians together in one mobile app. This guide explains the current apartment-maintenance workflow and the additional provider marketplace module included in the app.

## 1. Accounts and Sign-In

NearServe supports residents, maintenance technicians, building managers, and platform administrators. Account options and screens depend on the role assigned to the account.

### Joining a building

1. Ask the building manager for an invitation sent to your email address.
2. Create an account using that same email and the invitation code.
3. Open the email verification link.
4. Return to NearServe and tap **I verified my email**. Use **Resend verification email** if needed.
5. Sign in with your email and password.

Invitation codes are single-use and expire after seven days. Residents are linked to a flat; technicians are linked to one or more trade skills. Contact the building manager if an invitation is missing or expired.

Use **Forgot Password?** on the sign-in screen to request a password reset email.

## 2. Resident Guide

The resident home screen shows recent requests and provides access to request reporting, notifications, and emergency services. The **My requests** tab lists your maintenance requests.

### Submit a maintenance request

1. On Home, tap **Report a maintenance issue**.
2. Choose Plumbing, Electrical, Cleaning, or Other.
3. Describe the issue and, if useful, attach up to four photos.
4. Tap **Submit request**.

Requests are offered to available technicians in the same building whose skills match the selected category. The first technician to accept becomes assigned. Other technicians then lose access to that offer. If no technician is available, or all offered technicians decline, the request becomes unassigned for management to assign.

Open a request to review its description, photos, assigned technician, status, and (when available) the technician's location. Residents receive in-app notifications when request status changes.

### Follow progress

A request may move through these statuses:

**Waiting for acceptance / Needs assignment -> Assigned -> Accepted -> On the way -> Arrived -> In progress -> Completed**

Some requests may be manually assigned by management. When the technician marks the work complete, the resident can review the result. Tap **Confirm repair complete** to close a completed request, or **Reopen request** if more work is needed.

### Rate or report a problem

After a request is completed or closed, open its details to submit a 1-to-5-star rating and optional written review. Residents can also send management a complaint about completed work. Management can mark the complaint resolved.

### Notifications and emergency help

- Tap the bell icon or **Notifications** in Account to view alerts. Tap an alert to mark it as read, or use **Mark all as read**.
- **Building emergency contacts / Emergency Mode** provides a direct emergency call action and, where available, nearby provider contact and emergency-booking options. Use the local emergency number appropriate to your location.

## 3. Technician Guide

The Home dashboard shows offers and assigned work. The work-order tab lists current offers and jobs.

### Set availability

Use **Available for new jobs** on Home to go online or offline. When offline, you do not receive new offers. Availability does not cancel an existing accepted job. Technician skills are set by building management when the account is invited.

### Respond to an offer

- Tap **Accept** to claim the request. Acceptance assigns it to you and reserves you as busy on that job.
- Tap **Reject** to remove the offer from your list. If every offered technician declines, management is notified and the request becomes unassigned.

Only the technician who accepts can advance that request. Use the request details to progress it through **On my way**, **I arrived**, **Start work**, and **Mark complete**. Keep the request screen open while travelling to share live location with the resident and management. Location updates require foreground location permission and stop when you leave the screen or mark arrival.

## 4. Building Manager Guide

The manager Home screen provides building-level request oversight, technician availability, invitation tools, and building-location settings.

### Invite residents and technicians

1. In **Invite a team member**, choose Resident or Technician.
2. Enter the invited person's email. For a resident, enter the flat number. For a technician, select one or more skills.
3. Create the invitation and send its one-time code to that person using the invited email address.

### Manage maintenance requests

Open **Building requests** or the **Building requests** tab to review requests for your building. Open a request to inspect details and assign or change a technician while the request is still unaccepted. The technician must be available, not busy on another job, and qualified for the request category. Accepted or active work cannot be reassigned through this flow.

If no technicians are available, or all offered technicians decline, management receives an in-app notification and can manually assign the request. Requests that have offers but receive no response remain pending until a technician responds or a manager assigns them.

### Set the building map pin

Use **Building map pin** on Home to enter coordinates or use the device's current location, then tap **Save pin**. Set the correct pin before inviting residents. Requests store the resident profile's building coordinates when submitted, so existing resident profiles may need their building location refreshed if the pin changes.

## 5. Provider Marketplace Module

The app also contains a separate local provider marketplace for plumbers, electricians, and auto-rickshaw services. When marketplace navigation is enabled, customers can browse provider profiles, search and filter listings, sort by rating, price, or distance, view reviews and rates, and contact a provider by phone, SMS, WhatsApp, or in-app text chat. Provider profiles can also link to the provider's map location.

Customers can request an immediate booking. The booking screen also includes a date-and-time picker, but the selected time is currently saved as a note rather than the booking's scheduled time; treat scheduled booking as not production-ready until that is corrected. Booking progress can include Requested, Accepted, En Route, Arrived, and Completed. Providers can reject booking requests. Customers can view booking status and provider location on the tracking screen.

Providers can use their dashboard to review and accept or reject bookings, set online/offline availability, update their location and listed rate, progress active bookings, and view completed-booking earnings summaries. The dashboard is a separate module and is not linked from the current primary maintenance navigation.

**Navigation note:** The current primary tabs are maintenance-focused. Marketplace search, provider registration/dashboard, and the platform Admin Panel are included as separate screens but are not exposed in the current primary navigation. Enable and test the intended role-specific entry points before presenting these as standard customer or staff workflows.

**Payment note:** Cash-on-service is a selectable option. The Online Payment screen is currently a demonstration flow and is not connected to a live payment processor. Do not collect or represent it as a real card, UPI, or bank payment until a payment provider is integrated.

## 6. Platform Administrator

The platform Admin Panel, when enabled for an administrator account, provides platform-level overview statistics and tools to review provider verification requests, provider ratings, complaints, provider records, and user records. Administrators can verify or remove providers, review provider feedback, resolve platform complaints, and ban or unban user accounts.

Building managers handle apartment maintenance and building invitations; platform administrators handle marketplace-wide moderation. These are separate roles.

## 7. Important Operating Notes

- **Photo attachments:** Require Firebase Storage to be enabled and its rules deployed. The Firebase project used for this build may require the Blaze billing plan for Storage.
- **Timed escalation:** A 30-minute automatic management escalation is not active until the scheduled Cloud Function is deployed. Without it, an offer can remain pending if technicians do not respond; management should monitor requests and assign them manually.
- **Live maintenance location:** Requires the technician to grant foreground location permission and keep the request detail screen open while travelling. It is not background tracking.
- **Map accuracy:** The building pin and device GPS determine marker accuracy. The displayed dashed line is a straight-line indicator, not turn-by-turn routing.
- **Marketplace availability:** Marketplace search and provider tools depend on the deployment exposing those screens and on provider records being present. Provider listings may require administrator verification before appearing in search.
- **Emergency number:** Emergency Mode currently offers a call action for 112. Confirm the appropriate emergency number for the deployment's country before launch.
- **Scheduled bookings:** The date/time picker is present, but selected values are currently saved in a note field rather than as the booking schedule. Correct this before advertising scheduled appointments.
- **Connectivity:** Sign-in, requests, invitations, notifications, chat, booking, and status changes require an internet connection.

## Suggested Client Demonstration

1. Sign in as a resident and submit a Plumbing or Electrical request.
2. Sign in as an available matching technician, review the offer, and accept it.
3. Advance the job through On the way, Arrived, In progress, and Completed.
4. Return to the resident account to view the status, confirm completion, and leave a rating or complaint.
5. Sign in as a manager to demonstrate invitations, technician availability, building requests, manual assignment, and the building map pin.
6. Demonstrate marketplace search, provider dashboards, and the Admin Panel only after their navigation and account setup have been enabled in the client deployment.

## Quick Reference

| Role | Main tasks |
| --- | --- |
| Resident | Submit and track maintenance requests, review completed work, report a complaint, view notifications, access emergency options |
| Technician | Set availability, accept or reject offers, progress assigned work, share en-route location |
| Building manager | Invite residents and technicians, set the building pin, monitor requests and availability, assign technicians, resolve maintenance complaints |
| Provider | Manage marketplace availability and bookings, update rate/location, track earnings (when the provider dashboard is enabled) |
| Platform administrator | Moderate providers and users, verify providers, review platform ratings and complaints |
