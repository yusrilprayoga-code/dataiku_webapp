/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { Loader2 } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext"; // 1. Impor hook useDashboard

export default function FillMissingParams() {
	// --- STATE MANAGEMENT ---
	const router = useRouter();
	const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
	const [maxConsecutive, setMaxConsecutive] = useState<number>(3);
	const [isFlagging, setIsFlagging] = useState(false);
	const [isFilling, setIsFilling] = useState(false);

	// 2. Gunakan state dan fungsi dari DashboardContext
	const { selectedWells, wellColumns, fetchWellColumns } = useDashboard();

	// --- DATA FETCHING ---

	useEffect(() => {
		if (selectedWells.length > 0) {
			const wellNamesOnly = selectedWells.map((well) =>
				well.replace(/\.csv$/, "")
			);
			fetchWellColumns(wellNamesOnly);
		}
	}, [selectedWells, fetchWellColumns]);

	const allAvailableColumns = useMemo(() => {
		if (!selectedWells || selectedWells.length === 0 || !wellColumns) {
			return [];
		}
		const allCols = Object.values(wellColumns).flat();
		return [...new Set(allCols)];
	}, [selectedWells, wellColumns]);

	const logOptions = useMemo(() => {
		const excludedLogs = new Set([
			"DEPTH",
			"STRUKTUR",
			"WELL_NAME",
			"CALI",
			"SP",
			"MARKER",
			"ZONE",
			"MISSING_FLAG",
		]);
		return allAvailableColumns
			.filter((c) => c && !excludedLogs.has(c.toUpperCase()))
			.sort((a, b) => a.localeCompare(b))
			.map((c) => ({ label: c, value: c }));
	}, [allAvailableColumns]);

	const runProcess = async (stage: "flag" | "fill") => {
		if (selectedWells.length === 0) {
			// Gunakan selectedWells dari context
			alert("Silakan pilih setidaknya satu file dari Wells Browser.");
			return;
		}
		if (selectedLogs.length === 0) {
			alert(`Silakan pilih setidaknya satu log untuk di-${stage}.`);
			return;
		}

		stage === "flag" ? setIsFlagging(true) : setIsFilling(true);

		const payload = {
			file_paths: selectedWells,
			logs_to_check: selectedLogs,
			logs_to_fill: selectedLogs,
			max_consecutive_nan: maxConsecutive,
			isDataPrep: true,
		};

		const endpoint =
			stage === "flag"
				? `${process.env.NEXT_PUBLIC_API_URL}/api/flag-missing`
				: `${process.env.NEXT_PUBLIC_API_URL}/api/fill-flagged-missing`;

		try {
			const resp = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const result = await resp.json();
			if (!resp.ok)
				throw new Error(result?.error || `Gagal menjalankan proses ${stage}.`);
			alert(`✅ ${result.message}`);
			if (stage === "fill") router.push("/data-prep");
		} catch (err) {
			alert(`❌ ${err instanceof Error ? err.message : "Unknown error"}`);
		} finally {
			stage === "flag" ? setIsFlagging(false) : setIsFilling(false);
		}
	};

	return (
		<div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
			<h2 className="text-xl font-bold mb-4 text-gray-800">
				Fill Missing Values (Two Stages)
			</h2>

			{/* --- 5. HAPUS PEMILIHAN FILE LOKAL, GANTI DENGAN INFO DARI CONTEXT --- */}
			<div className="mb-6 p-4 border rounded-lg bg-gray-50">
				<h3 className="text-lg font-semibold mb-2">
					File(s) Selected to Process
				</h3>
				<p className="text-sm text-gray-500 mb-2">
					File-file berikut telah dipilih dari Wells Browser:
				</p>
				{selectedWells.length > 0 ? (
					<div className="max-h-28 overflow-y-auto text-sm text-blue-800 bg-blue-50 p-2 rounded-md">
						<ul className="list-disc list-inside">
							{selectedWells.map((path) => (
								<li key={path}>{path.split("/").pop()}</li>
							))}
						</ul>
					</div>
				) : (
					<p className="text-sm text-red-600 font-medium">
						Tidak ada file yang dipilih. Silakan pilih file dari Wells Browser
						terlebih dahulu.
					</p>
				)}
			</div>

			<div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-4 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">
						Cancel
					</button>
					<button
						type="button"
						onClick={() => runProcess("flag")}
						className="px-4 py-2 rounded-md text-white font-semibold bg-orange-500 hover:bg-orange-600 flex items-center justify-center min-w-[150px]"
						disabled={isFlagging || isFilling || selectedWells.length === 0}>
						{isFlagging ? (
							<>
								<Loader2 className="animate-spin w-4 h-4 mr-2" />
								Flagging...
							</>
						) : (
							"Stage 1: Flag Missing"
						)}
					</button>
					<button
						type="button"
						onClick={() => runProcess("fill")}
						className="px-4 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[150px]"
						disabled={isFilling || isFlagging || selectedWells.length === 0}>
						{isFilling ? (
							<>
								<Loader2 className="animate-spin w-4 h-4 mr-2" />
								Filling...
							</>
						) : (
							"Stage 2: Fill Flagged"
						)}
					</button>
				</div>
			</div>

			<h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
			<div className="flex-grow min-h-0 border border-gray-300 rounded-lg overflow-auto">
				<table className="min-w-full text-sm table-auto">
					<thead className="bg-gray-200 sticky top-0 z-10">
						<tr>
							{["#", "Location", "Comment", "Name", "Value"].map((header) => (
								<th
									key={header}
									className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="bg-white">
						<tr className="border-b">
							<td className="px-3 py-2 border-r text-center bg-cyan-400">1</td>
							<td className="px-3 py-2 border-r bg-cyan-400">Log</td>
							<td className="px-3 py-2 border-r bg-cyan-400">
								Select logs to be flagged and filled
							</td>
							<td className="px-3 py-2 border-r font-semibold bg-cyan-400">
								LOGS
							</td>
							<td className="px-3 py-2 bg-white text-black">
								<Select
									isMulti
									options={logOptions}
									value={logOptions.filter((opt) =>
										selectedLogs.includes(opt.value)
									)}
									onChange={(selected: any) =>
										setSelectedLogs(
											Array.isArray(selected)
												? selected.map((s: any) => s.value)
												: []
										)
									}
									className="min-w-[200px] text-sm" // Hapus text-black dari sini
									classNamePrefix="react-select"
									menuPortalTarget={
										typeof window !== "undefined" ? document.body : null
									}
									// --- PERBAIKAN DI SINI ---
									styles={{
										singleValue: (baseStyles) => ({
											...baseStyles,
											color: "#1f2937",
										}),
										input: (baseStyles) => ({
											...baseStyles,
											color: "#1f2937",
										}),
										option: (baseStyles, state) => ({
											...baseStyles,
											// Mengubah warna teks menjadi hitam saat dipilih atau di-hover
											color: state.isSelected ? "white" : "#1f2937",
										}),
										multiValueLabel: (baseStyles) => ({
											...baseStyles,
											color: "black",
										}),
									}}
									placeholder={
										selectedWells.length === 0
											? "Select file(s) first"
											: "Select logs..."
									}
									isDisabled={selectedWells.length === 0}
								/>
							</td>
						</tr>
						<tr className="border-b">
							<td className="px-3 py-2 border-r text-center bg-yellow-300">
								2
							</td>
							<td className="px-3 py-2 border-r bg-yellow-300">Constant</td>
							<td className="px-3 py-2 border-r bg-yellow-300">
								Max consecutive NaNs to fill (for Stage 2)
							</td>
							<td className="px-3 py-2 border-r font-semibold bg-yellow-300">
								MAX_CONSECUTIVE_NAN
							</td>
							<td className="px-3 py-2 bg-white text-black">
								<input
									type="number"
									value={maxConsecutive}
									onChange={(e) =>
										setMaxConsecutive(parseInt(e.target.value, 10) || 0)
									}
									className="w-full min-w-[100px] p-2 bg-white text-black border rounded"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
