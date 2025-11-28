"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, Download } from "lucide-react";
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
	TableCaption,
} from "@/components/ui/table";
import type { ComplianceMatrixItem } from "@/types";
import { downloadMatrixAsExcel } from "@/lib/exportMatrix";

export default function ComplianceMatrixPage() {
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");
	const [items, setItems] = useState<ComplianceMatrixItem[]>([]);
	const [complyMap, setComplyMap] = useState<Record<number, string>>({});
	const [commentMap, setCommentMap] = useState<Record<number, string>>({});

			const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
				const selected = e.target.files?.[0];
				if (!selected) return;

				const lowerName = selected.name.toLowerCase();
				// 如果是旧版 .doc（而不是 .docx），前端直接提示暂不支持
				if (lowerName.endsWith(".doc") && !lowerName.endsWith(".docx")) {
					setFile(null);
					setItems([]);
					setError(
						"当前在线版本暂不支持直接解析 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。This online version does not currently support parsing .doc files directly. Please save the file as .docx or export it to PDF locally before uploading.",
					);
					try {
						(e.target as HTMLInputElement).value = "";
					} catch {}
					return;
				}

				setFile(selected);
				setError("");
				setItems([]);
			};

	const handleGenerate = async () => {
		if (!file) return;

		setLoading(true);
		setError("");
		setItems([]);
		setComplyMap({});
		setCommentMap({});

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("model", "default");
			formData.append("mode", "matrix");
			// 目前默认按中文 RFP 处理，如需后续支持英文 RFP，可在此增加 lang 参数
			formData.append("lang", "zh");

			const res = await fetch("/api/analyze", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.error || "分析失败，请稍后重试");
			}

			const data = await res.json();
			setItems((data.items || []) as ComplianceMatrixItem[]);
		} catch (err: any) {
			console.error("Compliance matrix error:", err);
			setError(err.message || "分析失败，请稍后重试");
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = () => {
		if (!items.length) return;
		downloadMatrixAsExcel(items, { complyMap, commentMap });
	};

	const handleComplyChange = (id: number, value: string) => {
		setComplyMap((prev) => ({ ...prev, [id]: value }));
	};

	const handleCommentChange = (id: number, value: string) => {
		setCommentMap((prev) => ({ ...prev, [id]: value }));
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
			<div className="container mx-auto px-4 py-8 space-y-8">
				{/* Hero 区域 */}
				<header className="max-w-3xl mx-auto text-center space-y-3">
					<h1 className="text-4xl font-bold text-slate-900">
						AI 合规矩阵生成器
					</h1>
					<p className="text-slate-600 text-lg">
						瞬间从您的 RFP 中提取强制性要求，自动生成 Excel 检查表。
					</p>
					<p className="text-xs text-slate-500 uppercase tracking-wide">
						Compliance Matrix Generator for RFP Requirements
					</p>
				</header>

				{/* 上传区域 */}
				<Card className="max-w-2xl mx-auto">
					<CardHeader>
						<CardTitle>上传 RFP 文档</CardTitle>
					<CardDescription>
						<p>仅上传 RFP 文件，支持 PDF / Word (.docx)，单文件最大 50MB。</p>
						<p className="mt-1 text-xs text-slate-500">
							如为 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。
							This online version does not currently support parsing .doc files directly. Please save the file as .docx or export it to PDF locally before uploading.
						</p>
					</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-white/60">
								<input
									id="rfp-upload"
										type="file"
										accept=".pdf,.doc,.docx"
									onChange={handleFileChange}
									className="hidden"
								/>
								<label htmlFor="rfp-upload" className="cursor-pointer flex flex-col items-center">
									<FileText className="h-12 w-12 text-slate-400 mb-4" />
									<p className="text-sm text-slate-600">
										{file ? file.name : "点击选择 RFP 文档 (PDF / Word)"}
									</p>
									<p className="mt-1 text-xs text-slate-400">
										不需要上传投标文件，仅分析 RFP 中的必须/应条款。
									</p>
								</label>
							</div>

							{error && (
								<p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
									{error}
								</p>
							)}

							<Button
								onClick={handleGenerate}
								disabled={!file || loading}
								className="w-full bg-blue-600 hover:bg-blue-700"
								size="lg"
							>
								{loading ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										正在扫描强制性要求...
									</>
								) : (
									<>
										<Upload className="mr-2 h-5 w-5" />
										生成合规矩阵
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* 结果视图 */}
				{items.length > 0 && (
					<Card className="max-w-5xl mx-auto">
						<CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
							<div>
								<CardTitle>合规矩阵</CardTitle>
								<CardDescription>
									从 RFP 中共提取出 {items.length} 条强制性要求，可在此标记合规性并导出 Excel。
								</CardDescription>
							</div>
							<Button onClick={handleDownload} variant="outline" size="sm" disabled={!items.length}>
								<Download className="mr-2 h-4 w-4" />
								下载 Excel 合规矩阵
							</Button>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-12">ID</TableHead>
										<TableHead>要求原文</TableHead>
										<TableHead className="w-32">章节号</TableHead>
										<TableHead className="w-28 text-center">合规性 (是/否)</TableHead>
										<TableHead className="w-64">备注</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.map((item) => (
										<TableRow key={item.id}>
											<TableCell className="text-xs text-slate-500">{item.id}</TableCell>
											<TableCell className="text-sm text-slate-800 max-w-xl">
												{item.text}
											</TableCell>
											<TableCell className="text-sm text-slate-600 whitespace-nowrap">
												{item.section || "-"}
											</TableCell>
											<TableCell className="text-center">
												<select
													value={complyMap[item.id] ?? ""}
													onChange={(e) => handleComplyChange(item.id, e.target.value)}
													className="mx-auto block h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												>
													<option value="">未选择</option>
													<option value="Y">是 (Y)</option>
													<option value="N">否 (N)</option>
												</select>
											</TableCell>
											<TableCell>
												<input
													type="text"
													value={commentMap[item.id] ?? ""}
													onChange={(e) => handleCommentChange(item.id, e.target.value)}
													placeholder="可选：记录补充说明、整改计划等"
													className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
								<TableCaption>
									提示：导出的 Excel 文件包含列「RFP Requirement」「Reference Section」「Comply (Y/N)」「Comments」。
								</TableCaption>
							</Table>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
