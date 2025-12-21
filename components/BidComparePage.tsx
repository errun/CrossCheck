"use client";

import { useState } from "react";
import type React from "react";
import Link from "next/link";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "@/components/ui/card";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "@/components/ui/table";
	import type { BidComparisonItem, BidComparisonSummary, Language } from "@/types";

	export default function BidComparePage({ lang }: { lang: Language }) {
		const [rfpFile, setRfpFile] = useState<File | null>(null);
		const [bidFile, setBidFile] = useState<File | null>(null);
		const [loading, setLoading] = useState(false);
		const [error, setError] = useState<string>("");
		const [items, setItems] = useState<BidComparisonItem[]>([]);
		const [summary, setSummary] = useState<BidComparisonSummary | null>(null);

	const handleFileChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		type: "rfp" | "bid",
	) => {
		const selected = e.target.files?.[0];
		if (!selected) return;

		const lowerName = selected.name.toLowerCase();
		// 不支持旧版 .doc
		if (lowerName.endsWith(".doc") && !lowerName.endsWith(".docx")) {
			if (type === "rfp") setRfpFile(null);
			if (type === "bid") setBidFile(null);
			setItems([]);
			setSummary(null);
			setError(
				"当前在线版本暂不支持直接解析 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。This online version does not currently support parsing .doc files directly. Please save the file as .docx or export it to PDF locally before uploading.",
			);
			try {
				(e.target as HTMLInputElement).value = "";
			} catch {}
			return;
		}

		if (type === "rfp") setRfpFile(selected);
		if (type === "bid") setBidFile(selected);
		setError("");
		setItems([]);
		setSummary(null);
	};

		const handleCompare = async () => {
			if (!rfpFile || !bidFile) return;
		
			// Authentication is not required for bid comparison in the current low-volume phase.
			setLoading(true);
		setError("");
		setItems([]);
		setSummary(null);

		try {
			const formData = new FormData();
			formData.append("rfp_file", rfpFile);
			formData.append("bid_file", bidFile);
			formData.append("model", "default");
			formData.append("lang", lang);

			const res = await fetch("/api/bid-compare", {
				method: "POST",
				body: formData,
			});

				if (!res.ok) {
					let message: string;
					let data: any = null;
					try {
						data = await res.json();
					} catch {}

					if (res.status === 413) {
						message =
							lang === "zh"
								? "文件太大，超过当前在线版本的上传大小上限。建议控制在 100MB 以内，或拆分为多个文件后再上传。"
								: "File is too large for the current online version. Please keep each file under 100MB or split it into multiple documents.";
					} else {
						message =
							data?.error ||
							(lang === "zh"
								? "对比失败，请稍后重试"
								: "Comparison failed, please try again later");
					}

					throw new Error(message);
				}

			const data = await res.json();
			setItems((data.items || []) as BidComparisonItem[]);
			setSummary((data.summary || null) as BidComparisonSummary | null);
		} catch (err: any) {
			console.error("Bid compare error:", err);
			setError(
				err?.message ||
					(lang === "zh" ? "对比失败，请稍后重试" : "Comparison failed, please try again later"),
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="container mx-auto px-4 py-8 space-y-8">
				{/* 顶部导航：返回首页 + 登录区 */}
				<div className="flex items-center justify-between max-w-5xl mx-auto mb-4 gap-4">
						<Link
							href={lang === "zh" ? "/zh" : "/"}
							className="flex items-center text-sm text-slate-600 hover:text-blue-600"
						>
						<span className="mr-1 text-base">←</span>
						<span>{lang === "zh" ? "返回首页" : "Back to home"}</span>
					</Link>
					<div className="flex items-center gap-4">
					{/* 右侧暂不显示登录 / 积分信息，后续如需可再开启 */}
					</div>
				</div>

				{/* Hero 区域 */}
				<header className="max-w-3xl mx-auto text-center space-y-3">
					<h1 className="text-4xl font-bold text-slate-900">
						{lang === "zh"
							? "RFP 要求 vs 投标文件对比 (AI Bid Coverage Checker)"
							: "RFP vs Bid Comparison (AI Bid Coverage Checker)"}
					</h1>
					<p className="text-slate-600 text-base max-w-2xl mx-auto">
						{lang === "zh"
							? "上传一份招标文件和一份投标文件，AI 会自动把 RFP 中的强制性要求结构化出来，并逐条判断在投标文件中是完全覆盖、部分覆盖还是缺失。"
							: "Upload your RFP and your proposal. The AI will extract mandatory requirements from the RFP and check, for each one, whether your bid fully covers it, partially covers it, or misses it."}
					</p>
				</header>

				{/* 上传区 */}
				<div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
					<Card className="border border-dashed border-slate-300 bg-white/70 backdrop-blur-sm">
						<CardHeader>
							<div className="flex items-center gap-2 mb-1">
								<FileText className="w-5 h-5 text-blue-600" />
								<CardTitle className="text-base">
									{lang === "zh" ? "招标文件 (RFP)" : "RFP document"}
								</CardTitle>
							</div>
							<CardDescription className="text-xs text-slate-600">
								{lang === "zh"
									? "上传完整的招标文件（建议 PDF 或 Word .docx），AI 会从中提取必须/应条款。"
									: "Upload the full RFP (PDF or Word .docx). The AI will extract mandatory 'must/shall' requirements."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl px-4 py-6 cursor-pointer hover:border-blue-500 bg-slate-50/60">
								<Upload className="w-6 h-6 text-slate-500" />
								<div className="text-sm font-medium text-slate-800">
									{rfpFile
											? rfpFile.name
											: lang === "zh"
												? "点击或拖拽上传招标文件"
												: "Click or drag to upload RFP"}
								</div>
								<div className="text-[11px] text-slate-500">
									{lang === "zh"
										? "支持 PDF / Word (.docx)，建议控制在 100MB 以内"
										: "PDF / Word (.docx), recommended size ≤ 100MB"}
								</div>
								<input
									type="file"
									accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
									className="hidden"
									onChange={(e) => handleFileChange(e, "rfp")}
								/>
							</label>
						</CardContent>
					</Card>

					<Card className="border border-dashed border-slate-300 bg-white/70 backdrop-blur-sm">
						<CardHeader>
							<div className="flex items-center gap-2 mb-1">
								<FileText className="w-5 h-5 text-emerald-600" />
								<CardTitle className="text-base">
									{lang === "zh" ? "投标文件 (Bid)" : "Bid / Proposal"}
								</CardTitle>
							</div>
							<CardDescription className="text-xs text-slate-600">
								{lang === "zh"
									? "上传你准备提交的投标文件，系统会逐条检查是否覆盖 RFP 中的要求。"
									: "Upload your draft bid/proposal so the system can check coverage against the RFP requirements."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl px-4 py-6 cursor-pointer hover:border-emerald-500 bg-slate-50/60">
								<Upload className="w-6 h-6 text-slate-500" />
								<div className="text-sm font-medium text-slate-800">
									{bidFile
											? bidFile.name
											: lang === "zh"
												? "点击或拖拽上传投标文件"
												: "Click or drag to upload bid"}
								</div>
								<div className="text-[11px] text-slate-500">
									{lang === "zh"
										? "支持 PDF / Word (.docx)，建议控制在 100MB 以内"
										: "PDF / Word (.docx), recommended size ≤ 100MB"}
								</div>
								<input
									type="file"
									accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
									className="hidden"
									onChange={(e) => handleFileChange(e, "bid")}
								/>
							</label>
						</CardContent>
					</Card>
				</div>

				{/* 操作区 + 错误提示 */}
				<div className="max-w-5xl mx-auto mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div className="flex items-center gap-3">
						<Button
							onClick={handleCompare}
							disabled={loading || !rfpFile || !bidFile}
							className="inline-flex items-center gap-2"
						>
							{loading && <Loader2 className="w-4 h-4 animate-spin" />}
							<span>
								{lang === "zh" ? "开始对比" : "Compare documents"}
							</span>
						</Button>
						<p className="text-xs text-slate-500"></p>
					</div>
					{error && (
						<div className="text-xs md:text-sm rounded-md px-3 py-2 border border-red-200 bg-red-50 text-red-700">
							{error}
						</div>
					)}
				</div>

				{/* 结果表格 */}
				{summary && (
					<div className="max-w-5xl mx-auto mt-8 space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="text-sm text-slate-700">
								{lang === "zh"
									? `共 ${summary.total} 条要求：${summary.covered} 条已覆盖，${summary.partially_covered} 条部分覆盖，${summary.missing} 条缺失。`
									: `Total ${summary.total} requirements: ${summary.covered} covered, ${summary.partially_covered} partially covered, ${summary.missing} missing.`}
							</div>
						</div>
						<Card className="overflow-hidden">
							<CardContent className="p-0">
								<div className="max-h-[480px] overflow-auto">
									<Table>
										<TableHeader>
											<TableRow className="bg-slate-50">
												<TableHead className="w-10 text-xs text-slate-500">
													#
												</TableHead>
												<TableHead className="text-xs text-slate-500">
													{lang === "zh" ? "RFP 要求" : "RFP requirement"}
												</TableHead>
												<TableHead className="w-32 text-xs text-slate-500">
													{lang === "zh" ? "覆盖情况" : "Coverage"}
												</TableHead>
												<TableHead className="w-64 text-xs text-slate-500">
													{lang === "zh" ? "投标文件证据" : "Evidence in bid"}
												</TableHead>
												<TableHead className="w-64 text-xs text-slate-500">
													{lang === "zh" ? "AI 备注" : "AI comment"}
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{items.map((item) => {
												const statusLabel =
													lang === "zh"
														? item.status === "covered"
															? "已覆盖"
															: item.status === "partially_covered"
																? "部分覆盖"
																: "缺失"
														: item.status === "covered"
															? "Covered"
															: item.status === "partially_covered"
																? "Partially covered"
																: "Missing";
												const statusColor =
													item.status === "covered"
														? "bg-emerald-50 text-emerald-700 border-emerald-200"
														: item.status === "partially_covered"
															? "bg-amber-50 text-amber-700 border-amber-200"
															: "bg-red-50 text-red-700 border-red-200";
												return (
													<TableRow key={item.id} className="align-top">
														<TableCell className="text-xs text-slate-500">
															{item.id}
														</TableCell>
														<TableCell className="text-xs text-slate-800">
															{item.requirement_text}
														</TableCell>
														<TableCell className="text-xs">
															<span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusColor}`}>
																{statusLabel}
															</span>
														</TableCell>
														<TableCell className="text-xs text-slate-700 whitespace-pre-wrap">
															{item.evidence || (lang === "zh" ? "未提供证据" : "No evidence provided")}
														</TableCell>
														<TableCell className="text-xs text-slate-700 whitespace-pre-wrap">
															{item.comment || ""}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
