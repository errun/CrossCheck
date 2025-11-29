import type { Metadata } from "next";
import type { ReactNode } from "react";

// Chinese root segment metadata for "/zh" and nested routes
export const metadata: Metadata = {
  title: "标书全能王 - AI 驱动的标书自动化合规审查与控标分析",
  description:
    "利用 AI 快速进行标书审查、合规性检查与风险预警。让标书分析更智能，更高效。",
  alternates: {
    canonical: "/zh",
    languages: {
      en: "/",
      "zh-Hans": "/zh",
    },
  },
};

export default function ZhRootLayout({ children }: { children: ReactNode }) {
  return children;
}

