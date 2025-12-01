// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

// Simple Clerk webhook handler for user.created events.
// NOTE: For production you should verify the webhook signature using the
// CLERK_WEBHOOK_SECRET, but for now we focus on the credit logic itself.

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const eventType = payload?.type;
    const userId = payload?.data?.id as string | undefined;

    if (eventType === "user.created" && userId) {
      const clerk = await clerkClient();
      const existingPrivate = (payload.data.private_metadata || {}) as Record<string, any>;
      const existingPublic = (payload.data.public_metadata || {}) as Record<string, any>;

      const initialCredits = 50;

      await clerk.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...existingPrivate,
          credits: initialCredits,
        },
        // Mirror credits into publicMetadata so the frontend can read and show it
        publicMetadata: {
          ...existingPublic,
          credits: initialCredits,
        },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
