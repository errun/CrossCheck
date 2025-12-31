import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 站点正式域名，用于 SEO / OpenGraph / Sitemap 等
// 按你的要求统一为 rfpai.io
const siteUrl = "https://rfpai.io";

// Google Analytics 4 测量 ID（来源于 Google Tag 后台）
const GA_MEASUREMENT_ID = "G-4M4FRSZPJH";

export const metadata: Metadata = {
	title: "RFPCheck - AI Automated Compliance & Proposal Analysis",
	description:
		"Streamline your RFP process with AI. Automated compliance checks, cross-referencing, and risk analysis.",
	metadataBase: new URL(siteUrl),
	openGraph: {
		title: "RFPCheck - AI Automated Compliance & Proposal Analysis",
		description:
			"Streamline your RFP process with AI. Automated compliance checks, cross-referencing, and risk analysis.",
		type: "website",
		url: siteUrl,
		locale: "en_US",
		siteName: "RFPCheck",
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
	alternates: {
		canonical: "/",
		languages: {
			en: "/",
			"zh-Hans": "/zh",
		},
	},
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
			        <body className={`${inter.className} bg-slate-50 text-slate-900`}>
			          {/* Google Analytics 4 */}
			          <Script
			            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
			            strategy="afterInteractive"
			          />
			          <Script id="gtag-init" strategy="afterInteractive">
			            {`
			              window.dataLayer = window.dataLayer || [];
			              function gtag(){dataLayer.push(arguments);} 
			              gtag('js', new Date());
			              gtag('config', '${GA_MEASUREMENT_ID}');
			            `}
			          </Script>
				          {/* Microsoft Clarity */}
				          <Script id="ms-clarity" strategy="afterInteractive">
				            {`
				              (function(c,l,a,r,i,t,y){
				                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
				                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
				                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
				              })(window, document, "clarity", "script", "ui8gq59tt5");
				            `}
				          </Script>
			          {children}
			        </body>
			      </html>
			  );
			}
		
		
