import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 默认视为「中文地区」的国家/地区代码
const CHINESE_REGIONS = ["CN", "HK", "MO", "TW"] as const;

// 基于 IP 做基础的语言跳转
// 需求：如果是中文地区 IP 且没有明确的语言偏好，则优先使用中文路径（/zh ...）
export function middleware(req: NextRequest) {
		const url = req.nextUrl;
	const pathname = url.pathname;

	// 只对页面路由做语言跳转，跳过 API/TRPC 等
			const isApiRoute = pathname.startsWith("/api") || pathname.startsWith("/trpc");
			if (isApiRoute) {
				console.log("[middleware-lang] skip api route", { pathname });
				return NextResponse.next();
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
	const isChineseRegion = !!country && CHINESE_REGIONS.includes(country as (typeof CHINESE_REGIONS)[number]);

	console.log("[middleware-lang] request info", {
		pathname,
		geoCountry,
		headerCountry,
		country,
		langCookie,
		isZhPath,
		hasZhVariant,
		isEnglishRoot,
		isChineseRegion,
	});

		// 第一层：所有 /zh 路径统一标记为中文，并尽量记住偏好为 zh
		if (isZhPath) {
			console.log("[middleware-lang] ensure zh context", { pathname, country, prevLang: langCookie });
			const requestHeaders = new Headers(req.headers);
			requestHeaders.set("x-app-lang", "zh");
			const res = NextResponse.next({ request: { headers: requestHeaders } });
			// 只有在 cookie 不是 zh 时才写入，避免无意义覆盖
			if (langCookie !== "zh") {
				res.cookies.set("lang", "zh", { path: "/", maxAge: 60 * 60 * 24 * 365 });
			}
			return res;
		}

	// 第二层：如果还没有任何语言偏好，且来自中文地区，并访问英文入口路径，则自动跳到对应的 /zh
	if (!langCookie && isChineseRegion && isEnglishRoot && hasZhVariant) {
		console.log("[middleware-lang] redirect to zh variant (CN region)", { pathname, country });
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

			// 第三层：英文入口路径下，记录英文偏好
			if (isEnglishRoot && langCookie !== "en") {
		console.log("[middleware-lang] set lang=en", { pathname, country, prevLang: langCookie });
			const requestHeaders = new Headers(req.headers);
			requestHeaders.set("x-app-lang", "en");
			const res = NextResponse.next({ request: { headers: requestHeaders } });
		res.cookies.set("lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
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
