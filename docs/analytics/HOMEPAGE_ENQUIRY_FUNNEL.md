# Homepage enquiry funnel

**Prepared:** 2026-08-17 (Asia/Kolkata)
**Release mode:** lead-generation catalogue
**Primary conversion:** visitor opens a Sunfabb WhatsApp enquiry

This is the durable measurement contract for the homepage. It deliberately measures anonymous,
aggregate navigation and enquiry intent. Do not add message text, phone numbers, email addresses,
names, precise location, or other customer data to analytics events.

## Event contract

| Stage | Event | Required context | Meaning |
|---:|---|---|---|
| 0 | `page_view` | GA4 automatic page dimensions | Homepage visit |
| 1 | `homepage_section_view` | `section_id`, `section_position` | Visitor reached a meaningful homepage section at 35% visibility |
| 2 | `select_content` | `content_type`, `item_id`, `link_location` | Visitor selected a homepage navigation/support CTA |
| 2a | `view_item_list` | `item_list_name`, `item_list_id`, `items` | Homepage or catalogue product list was rendered |
| 3 | `select_item` | source list plus selected `items` entry | Visitor selected a product card |
| 4 | `view_item` | GA4 item, category, variant and INR value fields | Visitor opened a product detail page |
| 5 | `whatsapp_click` | `link_location`; optional product/variant identifiers | Visitor opened the WhatsApp enquiry handoff |

`whatsapp_click` proves a click/open attempt, not that a message was sent, delivered, answered, or
converted to an order. Two-way message and response-SLA evidence remains a Phase 4 owner task.

## Two useful funnels

### Product-discovery funnel

1. `page_view` on `/`
2. `homepage_section_view` where `section_id = featured-designs`
3. `select_item` where `item_list_id = homepage-designs`
4. `view_item`
5. `whatsapp_click` where `link_location = pdp`

### Direct-guidance funnel

1. `page_view` on `/`
2. `homepage_section_view` where `section_id = guided-shopping`
3. `whatsapp_click` where `link_location = home_guided_enquiry`

Keep these funnels separate. Combining them would make a healthy direct-guidance journey look like
a product-detail drop-off.

## GA4 setup after deployment

1. Use Tag Assistant or DebugView to observe one instance of every event in the contract. Record the
   deployed revision, event names, IST timestamp, device/browser, and test path. Do not retain the
   tester's phone number or message content.
2. Register event-scoped custom dimensions for `link_location`, `section_id`, `section_position`,
   `content_type`, and `item_id` if they are not already available in reports.
3. Create the two funnel explorations above. Use an open funnel initially so landing-page and PDP
   traffic can be understood separately.
4. Add breakdown views for GA4's aggregate `region`, `device category`, `session source / medium`,
   and landing page. Do not add browser geolocation or a precise-location permission prompt.
5. Mark `whatsapp_click` as a key event only after deployed delivery is observed and test traffic is
   excluded or clearly annotated.

## Review cadence and decisions

- Establish a 28-day baseline after event verification. Until traffic is meaningful, inspect raw
  counts and event paths rather than treating small percentage changes as conclusive.
- Review weekly: homepage reach by section, featured product CTR, PDP-to-WhatsApp rate, direct-
  guidance rate, and the same ratios by region/device/source.
- Change one major homepage variable at a time and annotate the deployment date. Prefer four-week
  comparisons unless traffic supports a shorter statistically useful window.
- Investigate data-quality changes before UX changes whenever an event count moves sharply.
- Never infer an order or revenue conversion from `whatsapp_click`; reconcile that separately from
  owner-controlled WhatsApp/order records using non-personal aggregate counts.

## Current evidence boundary

The event code, tests, production build, and local desktop/mobile journeys are verified. Live GA4
delivery, custom-dimension availability, funnel creation, and useful regional baselines require the
homepage deployment and owner access to the production GA4 property.
