import type { Metadata } from "next";

import ComplianceMatrixPage from "@/components/ComplianceMatrixPage";

export const metadata: Metadata = {
  // 标题策略：[核心功能] + [免费/无门槛] + [品牌/行业词]
  title: "Free RFP Compliance Matrix Generator (No Login) | AI RFP Shredder",
  
  // 描述策略：痛点解决方案 + 免费/无需注册强调 + 结果导向
  description: "Free AI tool to generate RFP compliance matrices in seconds. No login or sign-up required. Shred Section L & M automatically into Excel templates instantly.",
  
  keywords: [
    "Free RFP compliance matrix",   // 核心词 + 免费
    "No login RFP tool",            // 无需登录
    "RFP shredding tool free",      // 行业词 + 免费
    "automated compliance matrix no sign up", // 长尾词
    "Section L and M extraction",
    "govcon proposal tools free",
    "proposal compliance checker"
  ],
  
  alternates: {
    canonical: "[https://rfpai.io/compliance-matrix](https://rfpai.io/compliance-matrix)",
  },
  
  openGraph: {
    title: "Use AI to Shred RFPs for Free - No Account Needed",
    description: "Upload your PDF and get a compliance matrix instantly. No credit card, no email required. Supports Section L & M extraction.",
    url: "[https://rfpai.io/compliance-matrix](https://rfpai.io/compliance-matrix)",
    siteName: "CrossCheck AI",
    locale: "en_US",
    type: "website",
  },
};

// Default English compliance-matrix page at "/compliance-matrix"
export default function Page() {
  return <ComplianceMatrixPage />;
}
