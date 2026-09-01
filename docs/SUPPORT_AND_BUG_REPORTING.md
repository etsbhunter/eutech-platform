# Support and Bug Reporting

Status: not started. This document and the underlying `SupportTicket`/`SupportTicketAttachment`/`SupportTicketComment`/`SupportTicketStatusHistory` module (schema already migrated, no business logic yet — see `DATA_MODEL.md`) are planned for Phase 5, per `EUTECH_CLAUDE_MASTER_INSTRUCTION.md`'s support-ticket requirements.

When implemented, this document will cover:

- The report-a-bug form at `/account/support/bugs/new` and its auto-populated vs. client-supplied fields.
- Ticket lifecycle and allowed status transitions (`SubmitState` values are already modeled in `TicketStatus`).
- Attachment security: MIME allowlist verified from file contents, private object storage, short-lived authorized URLs, malware scanning, EXIF stripping.
- The customer-vs-internal API resource split that keeps internal notes and cross-client information out of customer-facing responses.
- Notification content rules (ticket reference/status/link only — never attachment contents or sensitive reproduction details).

No support-ticket UI or API exists yet in this repository.
