import { NextResponse } from "next/server";

import { BillingWebhookService } from "@/features/billing/services/billing-webhook.service";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

// The application's first Route Handler (IMPLEMENTATION_ORDER_V2.md Phase
// 23) - deliberately scoped to exactly this one purpose: verify a Stripe
// webhook's signature, then hand the verified event to
// BillingWebhookService. Every other operation in this app is a Server
// Action; this exists only because Stripe calls this endpoint directly and
// cannot go through one. No checkout, no plan gating, no usage limits -
// see BillingWebhookService for what this does and does not touch.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret()
    );
  } catch (error) {
    console.error(
      `Stripe webhook signature verification failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await BillingWebhookService.handleEvent(event);
  } catch (error) {
    console.error(
      `Stripe webhook processing failed for event ${event.id} (${event.type}): ${error instanceof Error ? error.message : "unknown error"}`
    );
    return NextResponse.json(
      { error: "Failed to process event." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
