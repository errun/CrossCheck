import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 语言路由中间件
// 需求：
// - 默认展示中文版本（/zh ...）
// - 只有当用户主动点击英文版本时才进入英文，并通过 cookie 记住偏好
export function middleware(req: NextRequest) {
	const url = req.nextUrl;
	const pathname = url.pathname;
	const langParam = url.searchParams.get("lang");

	// 只对页面路由做语言跳转，跳过 API/TRPC 等
	const isApiRoute = pathname.startsWith("/api") || pathname.startsWith("/trpc");
	if (isApiRoute) {
		return NextResponse.next();
	}

	const isZhPath = pathname === "/zh" || pathname.startsWith("/zh/");
	const langCookie = (req.cookies.get("lang")?.value as "zh" | "en" | undefined) || undefined;

	// 定义有哪些英文入口路径拥有对应的 /zh 版本
	const hasZhVariant =
		pathname === "/" ||
		pathname === "/compliance-matrix" ||
		pathname === "/bid-compare" ||
		pathname === "/bid-writer" ||
		pathname === "/font-checker";

	const isEnglishRoot = !isZhPath && hasZhVariant;

	// 第一层：所有 /zh 路径统一标记为中文，并尽量记住偏好为 zh
	if (isZhPath) {
		const requestHeaders = new Headers(req.headers);
		requestHeaders.set("x-app-lang", "zh");
		const res = NextResponse.next({ request: { headers: requestHeaders } });
		if (langCookie !== "zh") {
			res.cookies.set("lang", "zh", { path: "/", maxAge: 60 * 60 * 24 * 365 });
		}
		return res;
	}

	// 第二层：英文入口路径的处理
	if (isEnglishRoot) {
		// 如果 URL 上显式带了 ?lang=en，视为用户主动点击英文，优先采用英文并记录偏好
		if (langParam === "en") {
			const requestHeaders = new Headers(req.headers);
			requestHeaders.set("x-app-lang", "en");
			const res = NextResponse.next({ request: { headers: requestHeaders } });
			if (langCookie !== "en") {
				res.cookies.set("lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
			}
			return res;
		}

		// 没有显式 ?lang=en 时，遵循「默认中文」策略：
		// - 如果 cookie 里已经是 en，则尊重用户的英文偏好
		if (langCookie === "en") {
			const requestHeaders = new Headers(req.headers);
			requestHeaders.set("x-app-lang", "en");
			return NextResponse.next({ request: { headers: requestHeaders } });
		}

		// - 否则（没有 cookie 或 cookie!=en），统一跳转到对应的 /zh 路径
		const zhUrl = url.clone();
		if (pathname === "/") {
			zhUrl.pathname = "/zh";
		} else {
			zhUrl.pathname = `/zh${pathname}`;
		}
		zhUrl.searchParams.delete("lang");
		const res = NextResponse.redirect(zhUrl);
		if (langCookie !== "zh") {
			res.cookies.set("lang", "zh", { path: "/", maxAge: 60 * 60 * 24 * 365 });
		}
		return res;
	}

	// 其他情况：不做语言跳转，直接放行请求
	return NextResponse.next();
}

export const config = {
	matcher: [
			// Skip Next.js internals (`_next`) and static files with extensions
			"/((?!.+\\.[\\w]+$|_next).*)",
			// Always run for API/TRPC routes as well
			"/(api|trpc)(.*)",
	],
};
