import type { Metadata } from "next";
import { ProductionAnalytics } from "@/components/ProductionAnalytics";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 站点正式域名，用于 SEO / OpenGraph / Sitemap 等
// 按你的要求统一为 rfpai.io
const siteUrl = "https://rfpai.io";


export const metadata: Metadata = {
	title: "RFPAI — Bid Review & RFP Compliance Tools",
	description:
		"Streamline your RFP process with AI. Automated compliance checks, cross-referencing, and risk analysis.",
	metadataBase: new URL(siteUrl),
	openGraph: {
		title: "RFPAI — Bid Review & RFP Compliance Tools",
		description:
			"Streamline your RFP process with AI. Automated compliance checks, cross-referencing, and risk analysis.",
		type: "website",
		url: siteUrl,
		locale: "en_US",
		siteName: "RFPAI",
	},
	// 关键词标签有助于中文搜索引擎（如百度）理解页面主题
	keywords: [
		"标书检查",
		"标书智能审查",
		"投标文件检查",
		"废标风险检测",
		"招投标文书审核",
		"标书 AI 工具",
		"bid proposal checker",
		"tender document review",
	],

};

		export default function RootLayout({
				  children,
				}: Readonly<{
				  children: React.ReactNode;
				}>) {
			const appLang = headers().get("x-app-lang");
			const htmlLang = appLang === "zh" ? "zh-Hans" : "en";

				  return (
			      <html lang={htmlLang}>
			        <body data-clarity-mask="true" className={`${inter.className} bg-slate-50 text-slate-900`}>
			          <ProductionAnalytics />
			          {children}
			        </body>
			      </html>
			  );
			}
		
		
