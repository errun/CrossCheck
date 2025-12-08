import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 使用 Clerk 中间件，并在其中根据 IP 做基础的语言跳转
// 需求：如果是中国 IP 且没有明确的语言偏好，则优先使用中文路径（/zh ...）
export default clerkMiddleware((auth, req) => {
	const url = req.nextUrl;
	const pathname = url.pathname;

		// 只对页面路由做语言跳转，跳过 API/TRPC 等
		const isApiRoute = pathname.startsWith("/api") || pathname.startsWith("/trpc");
		if (isApiRoute) {
			console.log("[middleware-lang] skip api route", { pathname });
			return;
		}

		const geoCountry = req.geo?.country;
		const headerCountry = req.headers.get("x-vercel-ip-country");
		const country = geoCountry || headerCountry || "";
		const isZhPath = pathname === "/zh" || pathname.startsWith("/zh/");
		const langCookie = (req.cookies.get("lang")?.value as "zh" | "en" | undefined) || undefined;

		// 定义当前这条路由是否有对应的中文版本
		const hasZhVariant =
			pathname === "/" ||
			pathname === "/compliance-matrix" ||
			pathname === "/zh" ||
			pathname === "/zh/compliance-matrix";

		const isEnglishRoot = !isZhPath && (pathname === "/" || pathname === "/compliance-matrix");

		console.log("[middleware-lang] request info", {
			pathname,
			geoCountry,
			headerCountry,
			country,
			langCookie,
			isZhPath,
			hasZhVariant,
			isEnglishRoot,
		});
		// 第一层：如果用户访问了明确的 /zh 前缀，则记住偏好为 zh
		if (isZhPath && langCookie !== "zh") {
			console.log("[middleware-lang] set lang=zh", { pathname, country, prevLang: langCookie });
			const res = NextResponse.next();
			res.cookies.set("lang", "zh", { path: "/", maxAge: 60 * 60 * 24 * 365 });
			return res;
		}

		// 第二层：如果访问的是英文主路径（/ 或 /compliance-matrix），则记住偏好为 en
		if (isEnglishRoot && langCookie !== "en") {
			console.log("[middleware-lang] set lang=en", { pathname, country, prevLang: langCookie });
			const res = NextResponse.next();
			res.cookies.set("lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
			return res;
		}

		// 第三层：如果还没有任何语言偏好，并且是中国 IP，且当前是英文入口路径，则自动跳到对应的 /zh
		if (!langCookie && country === "CN" && !isZhPath && hasZhVariant) {
			console.log("[middleware-lang] redirect to zh variant", { pathname, country });
		const zhUrl = url.clone();

		if (pathname === "/") {
			zhUrl.pathname = "/zh";
		} else if (pathname === "/compliance-matrix") {
			zhUrl.pathname = "/zh/compliance-matrix";
		}

		const res = NextResponse.redirect(zhUrl);
		res.cookies.set("lang", "zh", { path: "/", maxAge: 60 * 60 * 24 * 365 });
		return res;
	}

	// 其他情况交给 Clerk 默认逻辑处理
	return;
});

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
