# Worked Example: Deployment Notifications

*A Feature-scale walkthrough showing the human–AI workflow, not just the finished artifacts.*

---

This example follows a platform engineer and an AI builder through a realistic delivery session. It shows the interaction pattern: how problems get framed, where assumptions surface, what happens when the auditor finds gaps, and how decisions get escalated when they can't be resolved in the session.

The scenario is Feature scale — one combined document (Problem + Solution + Tech Design) and a separate Test Plan. The tone is deliberately imperfect. People change their minds. The builder captures something in the wrong place and corrects. The auditor raises a finding that turns out to be an Idea, not a Bug. That's the framework working as designed.

---

## Setup

The human opens a builder session.

> **Human:** We need to add deployment notifications to our CI/CD pipeline. When a deploy succeeds or fails, the right people should know — in the right channel, with enough context to act. Right now nobody finds out about a failed deploy until someone notices the service is broken.

The builder recognises this as a Feature — it's a specific deliverable, likely one to two sprints, with a clear scope boundary. It scaffolds a combined document (Problem + Solution + Tech Design) and a separate Test Plan.

> **Builder:** This looks like Feature scale. I'll set up a combined document and a separate Test Plan. Before we start — is this part of a larger Epic, or is it standalone?

> **Human:** Standalone. There's no parent Epic. The platform team has been talking about this for months but nobody's written anything down.

> **Builder:** Then we'll need our own Overflow Log for anything that surfaces but doesn't belong in the current scope. Let me scaffold that too.

---

## Problem

> **Builder:** Let's start with the Problem. Who's experiencing this, and what's it actually costing?

> **Human:** It's all product teams — about twelve teams deploying through our shared pipeline. When a deploy fails, nobody gets notified. The person who triggered it might notice if they're watching the pipeline dashboard, but most people fire and forget. Failed deploys sit unnoticed for hours. Last month we had a payment service deploy fail at 2am and nobody caught it until users started reporting errors at 9am.

> **Builder:** I'll capture that — the payment service incident is good evidence for the Impact section. Who are the stakeholders here?

> **Human:** Platform team owns the pipeline. Product teams are the users. On-call engineers need to know about failures in their services. And our head of engineering has been asking for visibility into deploy health.

> **Builder:** Got it. For success criteria — what does "the right people know" look like in practice? Is there a time target?

> **Human:** Teams should know about a failed deploy within five minutes. Success should be notified too, but that's lower priority — nobody's losing sleep over missing a success notification.

The builder drafts the Problem section. While structuring the Assumptions, it surfaces something:

> **Builder:** I'm writing up assumptions. One I want to flag: I'm assuming all twelve teams receive notifications in the same way — same channel type, same message format. Is that true? Because some teams might use Slack and others might use Teams, or some might want a webhook into their own monitoring.

> **Human:** Good catch. Actually, that's not true at all. Most teams use Slack but two teams are on Teams, and the SRE team wants notifications piped into PagerDuty for failures.

> **Builder:** That changes the shape of this. We're not building a "send a Slack message" feature — we're building a notification routing system. I'll update the Problem to reflect that. And I want to raise an issue: who owns the routing rules? If team A changes their notification channel, who updates the config?

> **Human:** That's a good question. I don't know the answer. The platform team would probably say it's the product teams' responsibility, but the product teams will say they don't have access to pipeline config.

> **Builder:** I'll raise this as SOCIALISE — it needs discussion before we can resolve it. It'll shape the Solution.

The builder captures issue I1:

> **I1: Notification routing ownership.** Who is responsible for configuring and maintaining each team's notification channels and rules? Platform team does not currently delegate pipeline config access to product teams. Status: SOCIALISE.

The builder completes the Problem section with goals, non-goals, constraints, and existing alternatives. One non-goal worth noting:

> **Non-goals:** Deployment metrics and analytics. During this session the human mentioned wanting a dashboard showing deploy frequency and success rates — the builder parked this in the Overflow Log as O1 (PARKED, probable destination: a future Feature) rather than letting it expand the current scope.

---

## Solution

> **Builder:** Moving to the Solution. The core problem is: get the right notification to the right people in the right channel within five minutes of a deploy event. Three approaches I can see:
>
> **Option A — Webhook-based.** Pipeline emits a webhook on deploy events. A notification service receives it, looks up routing config, formats the message, and sends it to the appropriate channel (Slack, Teams, PagerDuty). Simple, direct, easy to reason about.
>
> **Option B — Event bus.** Pipeline publishes deploy events to a message queue. Consumers subscribe and handle their own notifications. More flexible, more infrastructure.
>
> **Option C — Polling.** A service polls the pipeline API for deploy status changes. No pipeline changes needed, but introduces latency and coupling.

> **Human:** Option A feels right. We don't need the flexibility of an event bus for this, and polling is fragile. Let's go with the webhook approach.

> **Builder:** Agreed. I'll document Options B and C as considered-and-rejected with rationale.

The builder works through the Solution: notification service receives webhooks, looks up team routing config, formats messages per channel type, delivers. During the workflow mapping:

> **Builder:** I need to think about the message format. A failed deploy and a successful deploy probably carry different information. Failures need: what failed, which service, which commit, who triggered it, and a link to the pipeline log. Success might just need: service name, environment, version deployed. Does that match what you'd want?

> **Human:** Yes, but add rollback status to failures too — did the pipeline auto-rollback, or is the failed version still running?

> **Builder:** Good. I also want to flag a dependency risk. We'll be calling the Slack API, the Teams API, and the PagerDuty API. Slack and PagerDuty have well-documented APIs with retry support. But Teams — specifically the incoming webhook connector — has no documented retry guarantee and I've seen reliability issues with it in other projects. I'll raise this as a Risk.

The builder captures issue I2:

> **I2: Teams webhook reliability.** The Microsoft Teams incoming webhook connector has no documented retry guarantee and has known reliability issues. Two teams depend on Teams notifications. Status: OPEN. Classification: Risk.

The builder also notices the human mentioned "auto-rollback" — which implies the pipeline has rollback behaviour that the notification service needs to know about. This wasn't in the Problem. Rather than expanding scope, the builder captures it:

> **Builder:** You mentioned auto-rollback. Does the pipeline already do this? The notification service needs to know the rollback outcome to include it in the failure message, but the rollback mechanism itself is out of our scope. I'll add an assumption that the pipeline exposes rollback status in its webhook payload.

> **Human:** Yes, the pipeline already does auto-rollback on health check failure. And yes, the status is in the webhook payload.

---

## Tech Design

The builder moves into Tech Design within the same combined document.

> **Builder:** The notification service is a small, stateless service. Let me walk through the components:
>
> 1. **Webhook receiver** — HTTP endpoint that accepts deploy event payloads from the pipeline. Validates the payload, acknowledges immediately (200 OK), and queues the event for processing.
> 2. **Routing config** — a config file (YAML or JSON) mapping teams to their notification channels and preferences. Stored in the service repo, updated via PR.
> 3. **Message formatter** — takes a deploy event and a channel type, produces a formatted message. Different templates for Slack (Block Kit), Teams (Adaptive Card), and PagerDuty (event payload).
> 4. **Channel dispatcher** — sends the formatted message to the target channel via the appropriate API. Handles retries for transient failures.

> **Human:** Wait — the routing config stored in the service repo means product teams need to submit PRs to change their notification preferences. That's friction. Could we use a config service or a self-service UI instead?

> **Builder:** We could, but that's a significant increase in scope — a config service or UI is its own Feature. For now, PR-based config is the simplest approach that works. We can note the self-service option as future scope.

> **Human:** Fair. PR-based is fine for twelve teams. Let's revisit if it becomes painful.

> **Builder:** I'll capture that decision and park the self-service idea in the Overflow Log.

The builder adds O2 to the Overflow Log (PARKED, probable destination: future Feature — self-service notification config UI).

Moving to error handling and scalability:

> **Builder:** For the channel dispatcher — retries on Slack and PagerDuty make sense because their APIs support idempotent delivery. For Teams, given the reliability concerns in I2, I want to add a dead letter queue. If a Teams notification fails after three retries, it goes to a DLQ for manual inspection rather than being silently lost.
>
> On scalability: what happens during a release train when multiple teams deploy simultaneously? If twelve teams deploy within a ten-minute window, the notification service needs to handle the burst without dropping events.

> **Human:** That happens every Tuesday. We do coordinated releases.

> **Builder:** Then the webhook receiver needs to queue events, not process them synchronously. I'll spec the queue — an in-memory queue is fine for this scale, but we should document the throughput assumption: up to 20 deploy events within a 5-minute window. If we ever exceed that, we'll need a persistent queue.

The builder captures the throughput assumption and completes the Tech Design: deployment (runs as a container alongside the pipeline infrastructure), monitoring (logs, a health endpoint, a metric for notification delivery latency), and the coding agent brief.

---

## Handoff to Audit

The builder completes the combined document and Test Plan. Status moves to REVIEW.

> **Builder:** The combined document (Problem + Solution + Tech Design) and the Test Plan are ready for audit. Summary of open items:
>
> - **I1** (SOCIALISE): Notification routing ownership — needs discussion with platform and product teams
> - **I2** (OPEN/Risk): Teams webhook reliability — decision needed on whether to accept the risk
> - **O1** (PARKED): Deploy metrics dashboard — future scope
> - **O2** (PARKED): Self-service notification config UI — future scope

---

## Audit — Pass 1

A different person runs the audit with AI assistance. The auditor loads the combined document and applies Core + Problem + Solution + Tech Design rubrics.

> **Auditor:** Running Pass 1 against the combined document. Starting with Problem, then Solution, then Tech Design, then coherence checks across the stack.

The Problem section clears cleanly — well-scoped, measurable goals, clear stakeholders, assumptions surfaced. The auditor notes one finding in the Solution:

> | Criterion | Assessment | Evidence | Classification |
> |---|---|---|---|
> | S6: Dependency identification | Partial | Teams webhook reliability is flagged as a risk (I2), but the Slack API dependency is assumed reliable without evidence. Slack API has rate limits — at 12 teams × multiple channels, are we within limits? | Bug |

Moving to Tech Design:

> | Criterion | Assessment | Evidence | Classification |
> |---|---|---|---|
> | A2: Integration points | Partial | Rate limits not addressed for any channel API. The burst deploy scenario (twelve teams deploying within ten minutes) could hit Slack's rate limit of ~1 message per second per channel if multiple teams share an alerts channel. | Bug |
> | A7: Deployment and environment | Partial | The document specifies monitoring (health endpoint, delivery latency metric) but does not identify who monitors the notification service itself. If notifications silently fail — e.g., the service is down during a deploy — who gets paged? The monitoring observes the service but nobody is named as the operator. | Bug |

The auditor also raises two non-Bug findings:

> | Criterion | Assessment | Evidence | Classification |
> |---|---|---|---|
> | A6: Performance and capacity | Pass | Throughput assumption documented (20 events per 5-minute window). In-memory queue justified for current scale. | — |
> | C6: Observability | Pass (with Idea) | Observability is addressed, but consider adding a metric for notification *delivery confirmation* — did the recipient channel actually accept the message? This would catch silent failures at the channel API level, not just at the HTTP level. | Idea |

Finally, the coherence check:

> **Auditor:** Coherence check — Tech Design against Problem. The Problem states teams should know about a failed deploy within five minutes. The Tech Design specifies a queue-based architecture, but doesn't address what happens if the notification service itself is down when a deploy event fires. The webhook would fail, the event is lost, and nobody gets notified. The five-minute goal has no mechanism for this scenario.

This is classified as a Bug — a gap in the coherence chain.

**Pass 1 summary:** 3 Bugs, 1 Idea. Sent back to builder.

---

## Builder Fixes

The builder addresses the findings:

> **Builder:** Working through the audit findings.
>
> **S6 / A2 (Rate limits):** Adding a rate limit section. Slack rate limit is 1 message per second per webhook URL. Each team has its own webhook URL, so twelve teams can send in parallel. The risk is if multiple teams share an alerts channel — but the routing config maps teams to their own channels, not shared ones. I'll add this as a stated constraint: each team must have its own notification channel. If teams want to share a channel, the routing config needs rate-limiting logic. For now, one-team-one-channel keeps us within limits.
>
> **C8 (Operational ownership):** The platform team owns the notification service. On-call rotation for the platform team is paged if the health endpoint fails. Adding this explicitly to the Operational Impact section.
>
> **Coherence gap (notification service down):** Adding a resilience mechanism. The pipeline webhook delivery should use at-least-once delivery — if the notification service returns a non-200, the pipeline retries three times over five minutes. If still failing, the pipeline logs a warning to its own monitoring, which the platform team already watches. This closes the gap: if the notification service is down, the pipeline's own monitoring surfaces it.

The human also makes a decision on the Risk:

> **Human:** For I2 (Teams webhook reliability) — let's accept the risk and use the dead letter queue. If Teams notifications are unreliable, the DLQ captures what was lost and we can manually forward them. Update the issue to a decision.

> **Builder:** Moving I2 to Decisions. The DLQ is already in the Tech Design.

The Idea (delivery confirmation metric) is noted in the Overflow Log as O3 (PARKED, probable destination: operational improvement after initial deployment).

---

## Audit — Pass 2

The auditor re-assesses only the criteria that were Partial or Fail in Pass 1.

> | Criterion | Pass 2 Assessment | Evidence |
> |---|---|---|
> | S6: Dependency identification | Pass | Rate limits addressed. One-team-one-channel constraint stated. Slack, Teams, and PagerDuty dependencies documented with their limitations. |
> | A2: Integration points | Pass | Rate limit strategy documented. Pipeline retry mechanism covers notification service unavailability. |
> | A7: Deployment and environment | Pass | Platform team named as owner. On-call paging specified for health endpoint failure. |
> | Coherence (Problem → Tech Design) | Pass | Pipeline retry + pipeline monitoring closes the five-minute notification gap for the service-down scenario. |

**Pass 2: All clear.** Artifact status moves to ACCEPTED.

---

## Escalated Decision

After the audit passes, I1 still needs resolution. It moved from SOCIALISE to ESCALATE during a team discussion where no consensus was reached.

> **I1 → ESCALATE: Notification routing ownership.**
>
> **Options:**
> (A) Platform team owns all routing config. Product teams submit requests to change their channels.
> (B) Product teams own their own routing config via PRs to the service repo. Platform team reviews and merges.
> (C) Shared ownership — platform team owns the routing infrastructure, product teams own their channel mappings within a self-service config structure.
>
> **Recommendation:** Option B. Product teams know their own channels and preferences. PR-based config gives the platform team a review gate without creating a bottleneck. This also creates a natural path toward the self-service UI (O2) if PRs become painful.
>
> **Downstream impact:** If Option A, the platform team becomes a bottleneck for every channel change. If Option C, we need the self-service config structure now rather than later, which expands scope.
>
> **Who decides:** Head of Engineering.

The Head of Engineering chose Option B. Issue moved to the Decisions table:

> | # | Source | Issue | Resolution | Decided By | Date |
> |---|---|---|---|---|---|
> | D1 | I1 | Notification routing ownership | Option B — product teams own routing config via PRs, platform team reviews. | Head of Engineering | 2026-03-21 |

---

## Test Plan

The builder creates the Test Plan as a separate document, tracing tests to Solution goals.

> | Test | Traces To | Scenario | Expected Result |
> |---|---|---|---|
> | T1 | G1 (failure notification within 5 min) | Trigger a failed deploy. Measure time from failure to notification delivery. | Notification arrives in team's channel within 5 minutes. |
> | T2 | G1 (failure notification) | Trigger a failed deploy for a team using Teams. | Notification delivered via Teams webhook. If delivery fails, event lands in DLQ within 30 seconds. |
> | T3 | G2 (success notification) | Trigger a successful deploy. | Success notification arrives in team's channel. |
> | T4 | Constraint (burst deploys) | Trigger 20 deploy events within a 5-minute window. | All notifications delivered. No rate limit errors. Queue drains within 2 minutes. |
> | T5 | Resilience (service down) | Take the notification service offline. Trigger a deploy. Bring service back up. | Pipeline retries deliver the event. Notification arrives after service recovery. Pipeline monitoring alerts on the outage. |
> | T6 | Routing (multi-channel) | Configure Team A for Slack and Team B for PagerDuty. Trigger deploys for both. | Each team receives notification in their configured channel only. |

The auditor runs the Testing rubric against the Test Plan and clears it on Pass 1 — traceability is strong, scenarios cover happy path, edge cases, and failure modes, and exit criteria are specific.

---

## What This Example Showed

**The audit caught real gaps.** The builder — working closely with the human, thinking carefully about the design — still missed rate limits, operational ownership, and a coherence gap where the notification service being down broke the five-minute goal. The auditor, applying the rubrics independently, found all three. That's not a failure of the builder. That's the framework working as designed.

**The coherence check caught a traceability miss.** The Problem said "within five minutes." The Tech Design addressed the happy path but not the failure path. The coherence check — verifying that the Tech Design actually implements the Solution which actually solves the Problem — is what caught it. Rubric criteria found the component-level issues; the coherence chain found the end-to-end gap.

**The overflow mechanism captured future work without derailing the session.** Deploy metrics (O1), self-service config UI (O2), and delivery confirmation metrics (O3) all surfaced naturally during the session. Each was parked with a probable destination rather than expanding scope or being forgotten.

**The escalation process got a decision documented.** Notification routing ownership (I1) moved through SOCIALISE → ESCALATE → Decision with a full decision packet. The Head of Engineering made an informed choice without reading the full artifact — the decision packet gave them the options, the recommendation, and the downstream impact.

**The builder surfaced an assumption the human hadn't considered.** The human assumed all teams use the same notification channel. The builder caught it. That assumption, if it had survived into the Tech Design, would have produced a system that only worked for Slack teams — and the Teams and PagerDuty users would have discovered this after delivery.

---

## Epilogue: The Definition

Two weeks later, the notification service is in production and working. The platform engineer opens a new builder session.

> **Human:** The deploy notification service has been live for two weeks. Let's write the Definition.

> **Builder:** I'll load the delivery artifacts for reference and scaffold the Definition. The audience for this document is someone who was never in the room — a future maintainer, an on-call engineer, or an AI agent picking up work on this feature next year.

The builder works through the Definition sections:

- **What This Is** — a notification routing service that delivers deploy event notifications to team-specific channels (Slack, Teams, PagerDuty) within five minutes of a deploy event. Receives webhooks from the CI/CD pipeline, looks up per-team routing config, formats and dispatches messages.
- **Why It Works This Way** — the key decisions table captures the choices that shaped the system: webhook-based (not event bus — simplicity over flexibility), PR-based routing config (not self-service UI — sufficient for twelve teams), dead letter queue for Teams (accepted reliability risk), one-team-one-channel constraint (avoids rate limit complexity).
- **Known Limitations and Debt** — Teams webhook reliability is an accepted risk with DLQ mitigation. No self-service config UI (O2 from the Overflow Log, now BACKLOG). No delivery confirmation metrics (O3, BACKLOG). In-memory queue is sufficient for current scale but won't survive a service restart — events during restart are recovered via pipeline retry.
- **Operational Context** — owned by platform team. Health endpoint monitored, on-call paged on failure. Pipeline retry mechanism covers service-down scenarios.
- **How to Change It Safely** — routing config is in YAML in the service repo. Adding a new channel type requires a new formatter. Rate limit constraint: one team per channel.

The Definition is audited, passes, and moves to ACCEPTED. The delivery artifacts move to `archive/`. The Definition is filed in `definitions/ci-cd/deploy-notifications.md`.

Six months from now, when someone asks "why does the notification service use a dead letter queue for Teams but not Slack?", the answer is in the Definition — not buried in a project's Tech Design document that nobody remembers exists.
