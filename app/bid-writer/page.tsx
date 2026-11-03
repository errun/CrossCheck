import BidWriterPage from "@/components/BidWriterPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/bid-writer" },
  openGraph: { url: "/bid-writer" },
};

export default function Page() {
  return <BidWriterPage lang="en" />;
}

