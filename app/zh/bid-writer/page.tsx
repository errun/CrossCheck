import BidWriterPage from "@/components/BidWriterPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/zh/bid-writer" },
  openGraph: { url: "/zh/bid-writer" },
};

export default function ZhBidWriterPage() {
  return <BidWriterPage lang="zh" />;
}

