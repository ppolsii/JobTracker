import { describe, expect, it, vi } from "vitest";

import { BillingWebhookRepository } from "@/features/billing/repositories/billing-webhook.repository";
import { BillingWebhookService } from "@/features/billing/services/billing-webhook.service";
import { getStripeClient } from "@/lib/stripe";

vi.mock("@/features/billing/repositories/billing-webhook.repository", () => ({
  BillingWebhookRepository: {
    linkStripeCustomer: vi.fn(),
    syncByStripeCustomerId: vi.fn(),
    hasProcessedEvent: vi.fn(),
    recordProcessedEvent: vi.fn(),
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(),
}));

const mockedRepository = vi.mocked(BillingWebhookRepository);
const mockedGetStripeClient = vi.mocked(getStripeClient);

function allowNewEvent() {
  mockedRepository.hasProcessedEvent.mockResolvedValue(false);
  mockedRepository.syncByStripeCustomerId.mockResolvedValue({ error: null } as never);
  mockedRepository.recordProcessedEvent.mockResolvedValue({ error: null } as never);
  mockedRepository.linkStripeCustomer.mockResolvedValue({ error: null } as never);
}

function subscriptionObject(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at: null,
    canceled_at: null,
    latest_invoice: "in_1",
    items: {
      data: [
        {
          current_period_end: 1_800_000_000,
          price: { recurring: { interval: "month" } },
        },
      ],
    },
    ...overrides,
  };
}

function stripeEvent(type: string, object: Record<string, unknown>, id = "evt_1") {
  return { id, type, data: { object } } as never;
}

describe("BillingWebhookService.handleEvent - idempotency", () => {
  it("skips processing entirely when the event was already recorded ('Duplicate Events')", async () => {
    mockedRepository.hasProcessedEvent.mockResolvedValue(true);

    await BillingWebhookService.handleEvent(
      stripeEvent("customer.subscription.updated", subscriptionObject())
    );

    expect(mockedRepository.syncByStripeCustomerId).not.toHaveBeenCalled();
    expect(mockedRepository.recordProcessedEvent).not.toHaveBeenCalled();
  });

  it("records the event only after successful processing", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent("customer.subscription.updated", subscriptionObject(), "evt_42")
    );

    expect(mockedRepository.recordProcessedEvent).toHaveBeenCalledWith(
      "evt_42",
      "customer.subscription.updated"
    );
  });

  it("does not record the event when processing fails, leaving it retryable", async () => {
    mockedRepository.hasProcessedEvent.mockResolvedValue(false);
    mockedRepository.syncByStripeCustomerId.mockResolvedValue({
      error: { message: "db down" },
    } as never);

    await expect(
      BillingWebhookService.handleEvent(
        stripeEvent("customer.subscription.updated", subscriptionObject())
      )
    ).rejects.toThrow();

    expect(mockedRepository.recordProcessedEvent).not.toHaveBeenCalled();
  });

  it("ignores an event type this application does not handle", async () => {
    mockedRepository.hasProcessedEvent.mockResolvedValue(false);

    await BillingWebhookService.handleEvent(stripeEvent("customer.updated", {}));

    expect(mockedRepository.syncByStripeCustomerId).not.toHaveBeenCalled();
    expect(mockedRepository.recordProcessedEvent).not.toHaveBeenCalled();
  });
});

describe("BillingWebhookService.handleEvent - subscription lifecycle", () => {
  it.each([
    ["customer.subscription.created"],
    ["customer.subscription.updated"],
    ["customer.subscription.deleted"],
    ["customer.subscription.resumed"],
    ["customer.subscription.paused"],
  ])("syncs %s through the same shared mapping", async (eventType) => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent(eventType, subscriptionObject())
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({
        stripe_subscription_id: "sub_1",
        status: "active",
        plan: "pro",
        billing_interval: "month",
        latest_invoice_id: "in_1",
      })
    );
  });

  it.each([
    ["trialing", "pro"],
    ["active", "pro"],
    ["past_due", "pro"],
    ["incomplete", "free"],
    ["incomplete_expired", "free"],
    ["canceled", "free"],
    ["unpaid", "free"],
    ["paused", "free"],
  ])("derives plan '%s' -> '%s' from the Stripe status", async (status, expectedPlan) => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent("customer.subscription.updated", subscriptionObject({ status }))
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({ plan: expectedPlan })
    );
  });

  it("resolves current_period_end from the first subscription item, converted to an ISO string", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent("customer.subscription.updated", subscriptionObject())
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({
        current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
      })
    );
  });

  it("prefers cancel_at over canceled_at for the cancellation date when both are set", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent(
        "customer.subscription.updated",
        subscriptionObject({ cancel_at: 1_900_000_000, canceled_at: 1_800_000_000 })
      )
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({
        cancel_at: new Date(1_900_000_000 * 1000).toISOString(),
      })
    );
  });

  it("falls back to canceled_at when cancel_at is not set (subscription.deleted)", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent(
        "customer.subscription.deleted",
        subscriptionObject({ status: "canceled", cancel_at: null, canceled_at: 1_800_000_000 })
      )
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({
        cancel_at: new Date(1_800_000_000 * 1000).toISOString(),
      })
    );
  });

  it("resolves the customer id whether it is a string or an expanded object", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent(
        "customer.subscription.updated",
        subscriptionObject({ customer: { id: "cus_expanded" } })
      )
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith(
      "cus_expanded",
      expect.anything()
    );
  });
});

describe("BillingWebhookService.handleEvent - checkout.session.completed", () => {
  it("links the Stripe customer to the user via client_reference_id, then syncs the retrieved subscription", async () => {
    allowNewEvent();
    mockedGetStripeClient.mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(subscriptionObject()),
      },
    } as never);

    await BillingWebhookService.handleEvent(
      stripeEvent("checkout.session.completed", {
        id: "cs_1",
        client_reference_id: "user-1",
        customer: "cus_1",
        subscription: "sub_1",
      })
    );

    expect(mockedRepository.linkStripeCustomer).toHaveBeenCalledWith("user-1", "cus_1");
    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({ plan: "pro" })
    );
  });

  it("does not attempt to sync when the session has no subscription ('Missing Subscription')", async () => {
    allowNewEvent();
    const retrieve = vi.fn();
    mockedGetStripeClient.mockReturnValue({ subscriptions: { retrieve } } as never);

    await BillingWebhookService.handleEvent(
      stripeEvent("checkout.session.completed", {
        id: "cs_1",
        client_reference_id: "user-1",
        customer: "cus_1",
        subscription: null,
      })
    );

    expect(retrieve).not.toHaveBeenCalled();
    expect(mockedRepository.syncByStripeCustomerId).not.toHaveBeenCalled();
    // The event is still fully handled (no subscription to sync isn't an
    // error) - it should still be recorded as processed.
    expect(mockedRepository.recordProcessedEvent).toHaveBeenCalled();
  });

  it("does not attempt to link a customer when client_reference_id is missing", async () => {
    allowNewEvent();
    mockedGetStripeClient.mockReturnValue({
      subscriptions: { retrieve: vi.fn().mockResolvedValue(subscriptionObject()) },
    } as never);

    await BillingWebhookService.handleEvent(
      stripeEvent("checkout.session.completed", {
        id: "cs_1",
        client_reference_id: null,
        customer: "cus_1",
        subscription: "sub_1",
      })
    );

    expect(mockedRepository.linkStripeCustomer).not.toHaveBeenCalled();
  });
});

describe("BillingWebhookService.handleEvent - invoice events", () => {
  it("records latest_invoice_id on invoice.payment_succeeded, without touching status/plan", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent("invoice.payment_succeeded", { id: "in_2", customer: "cus_1" })
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith("cus_1", {
      latest_invoice_id: "in_2",
    });
  });

  it("records latest_invoice_id on invoice.payment_failed the same way ('PAYMENT FAILURE')", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent("invoice.payment_failed", { id: "in_3", customer: "cus_1" })
    );

    expect(mockedRepository.syncByStripeCustomerId).toHaveBeenCalledWith("cus_1", {
      latest_invoice_id: "in_3",
    });
  });

  it("gracefully skips an invoice with no customer ('Missing Customer'), still marking it processed", async () => {
    allowNewEvent();

    await BillingWebhookService.handleEvent(
      stripeEvent("invoice.payment_failed", { id: "in_4", customer: null })
    );

    expect(mockedRepository.syncByStripeCustomerId).not.toHaveBeenCalled();
    expect(mockedRepository.recordProcessedEvent).toHaveBeenCalled();
  });
});
