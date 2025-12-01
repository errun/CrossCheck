import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
	matcher: [
		// Recommended Clerk matcher for Next.js App Router:
		// - Skip all Next.js internals (`_next`)
		// - Skip all files that have an extension (static assets)
		//   so that things like `/_next/static/css/app/layout.css` are not
		//   processed by the middleware. This prevents CSS/JS from 404-ing in dev.
		"/((?!.+\\.[\\w]+$|_next).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
