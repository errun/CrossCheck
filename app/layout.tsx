import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// TODO: 将下面的 url 改成你正式上线的域名，例如：https://crosscheck.yourdomain.com
const siteUrl = "https://example.com";

export const metadata: Metadata = {
		title: "标书全能王 CrossCheck - 标书智能审查与废标风险检测",
		description:
			"标书全能王 CrossCheck，基于 Gemini AI 的标书智能审查工具，一键检查投标文件中的废标风险、错别字、格式问题与评分项偏离，支持 PDF / Word 标书上传，适用于政府采购、工程招标等多种场景。",
		metadataBase: new URL(siteUrl),
		openGraph: {
				title: "标书全能王 CrossCheck - 标书智能审查与废标风险检测",
				description:
					"CrossCheck 标书全能王，AI 驱动的标书自动审查系统，帮助投标人快速发现废标风险与扣分项。",
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
      <body className={inter.className}>{children}</body>
    </html>
  );
}

