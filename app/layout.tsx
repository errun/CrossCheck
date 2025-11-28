import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 站点正式域名，用于 SEO / OpenGraph / Sitemap 等
const siteUrl = "https://rfpcheck.net";

// Google Analytics 4 测量 ID（来源于 Google Tag 后台）
const GA_MEASUREMENT_ID = "G-4M4FRSZPJH";

export const metadata: Metadata = {
			title: "RFPCheck - AI Proposal Compliance Checker & Bid Error Scanner",
			description:
				"Automate your bid review. Our AI Cross-Reference Tool scans proposals against RFPs to detect pricing errors, missing requirements, and prevent disqualification.",
			metadataBase: new URL(siteUrl),
			openGraph: {
						title: "RFPCheck - AI Proposal Compliance Checker & Bid Error Scanner",
						description:
							"Automate your bid review. Our AI Cross-Reference Tool scans proposals against RFPs to detect pricing errors, missing requirements, and prevent disqualification.",
								type: "website",
								url: siteUrl,
								locale: "zh_CN",
								siteName: "标书全能王 CrossCheck",
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
  return (
    <html lang="zh-CN">
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
	        {children}
	      </body>
    </html>
  );
}

