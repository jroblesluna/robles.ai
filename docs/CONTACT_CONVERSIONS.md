# Confirmed contact conversions

## Delivery contract

`POST /api/contact` validates the existing contact schema, awaits the mail transport, and returns `{ success: true }` only after delivery is accepted. The authenticated sender and configured recipient remain unchanged. `Reply-To` uses the validated visitor email. HTML values are escaped and a plain-text alternative is included. Failures return 400/500 without leaking SMTP details. GET remains 404; no public inbox or new storage is introduced.

## Measurement contract

`ContactForm` (in `src/components/Contact.tsx`, used on `/` and `/get-started`) requires a successful HTTP response and `success === true` before calling `trackContactLead()` exactly once per accepted submission. Validation, network, invalid-JSON and negative responses do not emit a lead. Analytics failures cannot turn mail success into a form failure.

The event payload is fixed and contains no visitor values:

```json
{ "event": "generate_lead", "form_id": "contact", "method": "contact_form" }
```

The dataLayer queues the event even before GTM initializes. GTM remains the only tracker when configured; direct GA4 and Meta SDKs are not loaded alongside it. Existing direct-tracker fallback sends GA4 `generate_lead` and Meta `Lead`, including submissions accepted while those SDKs initialize. Development/admin/SSR do not emit contact leads.

## External configuration

- Existing GTM catch-all GA4 event tag forwards the event name. Its existing FBEventName lookup maps `generate_lead` → `Lead` for Meta Pixel and the existing conversion integration. Do not add another parallel tag for the same lead.
- GA4: define `generate_lead` as a key event, created **with code**, once per event, with **no default monetary value**. Do not derive it from a contact-page view or automatic `form_submit`.
- Existing blog key events are separate engagement signals. Do not select them as primary advertising lead goals. Their historical configuration is retained.
- Google Ads: when the advertising account is accessible, import this confirmed GA4 key event as the primary lead conversion, or use a direct Ads conversion instead, not both as primary. A click on an advertisement is not part of deployment testing. Actual campaign attribution requires real campaign traffic.
- Meta: verify the existing dataset receives the standard `Lead` event. Browser tag firing alone does not confirm server receipt. Confirm Pixel/Conversions API deduplication before relying on totals for bidding.

## Validation

```sh
npm test -- server/__tests__/contactRoutes.test.ts src/components/__tests__/Contact.conversion.test.tsx src/lib/__tests__/analytics.ssr.test.ts src/Root.hydration.test.tsx
npm run build
```

The focused suite covers a different visitor/sender address, escaped content, waiting for mail acceptance, validation/header injection rejection, mail failures, success-only tracking, initialization races and GTM exclusivity.

Before advertising: repeat a clearly marked inquiry in production, inspect received Reply-To, verify one `generate_lead` and one deduplicated Meta `Lead`, confirm GA4 key-event status and check the Ads import. Do not include contact PII in analytics evidence or Git. Use a second authorized mailbox to verify a complete reply journey, and retain that limitation if no second mailbox is available.

## Initial release validation

- Focused tests: 20 passed.
- Full suite: 673 passed, 6 failed; the six failures are existing public-slide/carousel/compositor failures.
- Production client, SSR and server build passed.
- Type checking has the same diagnostics as main; none are introduced in the changed application modules.
- Production evidence and external-account completion are recorded separately after deployment. These build results alone do not certify live delivery or advertising attribution.

## Additional conversion signals (2026-10-24)

| Signal | Where | GA4 event | Meta (direct SDK) | Intended use |
|---|---|---|---|---|
| Contact form accepted | `ContactForm` on `/` and `/get-started` | `generate_lead` (`form_id: contact`, `method: contact_form`) | `Lead` | **Primary** lead conversion |
| Quiz lead stored | `/diagnostico-ia`, after `POST /api/quiz-lead` returns a `leadId` (before email verification) | `generate_lead` (`form_id: quiz`, `method: quiz`) | `Lead` | Same primary conversion; segment by `method` |
| WhatsApp / email / phone / calendar click | `/get-started` (hero, pricing, contact block, sticky bar), home contact info, Robly chat buttons | `contact_click` (`contact_method`, `link_location`) | `Contact` | **Secondary** conversion only: a click is intent, not a delivered message |

All three go through `trackConversion()` in `src/lib/analytics.ts`: pushed to the `dataLayer` (GTM), queued until trackers initialise, and sent directly to GA4/Meta only when GTM is not configured. No visitor values are included.

The contact form now asks *"What do you want to improve?"* (`goal`, optional message). The API contract is unchanged: the client folds the goal into `subject` (`Website Inquiry — <goal>`) and `message` (`Interested in: <goal>` + optional text).

External configuration still needed:

- **GTM**: the existing catch-all GA4 event tag forwards `contact_click` by name. Add `contact_click → Contact` to the FBEventName lookup if Meta should receive it as the standard `Contact` event.
- **GA4**: mark `contact_click` as a key event once it appears.
- **Google Ads**: `generate_lead` is imported from GA4 as the primary "Submit lead form" conversion (account Robles.AI, 2026-10-23). Import `contact_click` as a **secondary** conversion.

