import ComplianceMatrixPage from "@/components/ComplianceMatrixPage";
import type { Metadata } from "next";

import type { Language } from "@/types";

export const metadata: Metadata = {
  title: "免费 RFP 合规矩阵生成器（无需登录） | AI RFP Shredder",
  description:
    "免费 AI 工具，几秒生成 RFP 合规矩阵（Compliance Matrix）。无需登录或注册。自动拆解 Section L & M，并导出 Excel 模板。",
  keywords: [
    "免费 合规矩阵",
    "无需登录 RFP 工具",
    "RFP Shredding 免费",
    "合规矩阵 生成器 无需注册",
    "Section L M 提取",
    "GovCon 投标工具 免费",
    "proposal compliance checker",
  ],
  alternates: {
    canonical: "https://rfpai.io/zh/compliance-matrix",
  },
  openGraph: {
    title: "免费用 AI 拆解 RFP（无需账号）",
    description:
      "上传 PDF/Word，立即生成合规矩阵。无需信用卡、无需邮箱。支持 Section L & M 提取，并导出 Excel 模板。",
    url: "https://rfpai.io/zh/compliance-matrix",
    siteName: "CrossCheck AI",
    locale: "zh_CN",
    type: "website",
  },
};

// Chinese compliance-matrix page at "/zh/compliance-matrix" – only renders Chinese content
export default function ZhComplianceMatrixPage() {
	const lang: Language = "zh";
	return <ComplianceMatrixPage lang={lang} />;
}

