import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const pathname = url.pathname;
	const langParam = url.searchParams.get("lang");

	const isApiRoute = pathname.startsWith("/api") || pathname.startsWith("/trpc");
	if (isApiRoute) {
		return NextResponse.next();
	}

	const isZhPath = pathname === "/zh" || pathname.startsWith("/zh/");
	const langCookie = (req.cookies.get("lang")?.value as "zh" | "en" | undefined) || undefined;
	const isRootPath = pathname === "/";

	if (isZhPath) {
		const requestHeaders = new Headers(req.headers);
		requestHeaders.set("x-app-lang", "zh");
		const res = NextResponse.next({ request: { headers: requestHeaders } });
		if (langCookie !== "zh") {
			res.cookies.set("lang", "zh", { path: "/", maxAge: 60 * 60 * 24 * 365 });
		}
		return res;
	}

	// Keep language home pages stable and indexable; preserve old English entry links.
	if (isRootPath) {
		const home = url.clone();
		home.pathname = langParam === "en" || (langParam !== "zh" && langCookie === "en") ? "/en" : "/zh";
		home.searchParams.delete("lang");
		return NextResponse.redirect(home);
	}

	const requestHeaders = new Headers(req.headers);
	requestHeaders.set("x-app-lang", "en");
	const res = NextResponse.next({ request: { headers: requestHeaders } });
	if ((pathname === "/en" || langParam === "en") && langCookie !== "en") {
		res.cookies.set("lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
	}
	return res;
}

export const config = {
	matcher: [
		// Skip Next.js internals (`_next`) and static files with extensions
		"/((?!.+\\.[\\w]+$|_next).*)",
		// Always run for API/TRPC routes as well
		"/(api|trpc)(.*)",
	],
};
