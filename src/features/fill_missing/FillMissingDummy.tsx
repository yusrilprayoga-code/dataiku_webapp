/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Select from "react-select";
import { Loader2 } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppDataStore } from "@/stores/useAppDataStore";

export default function FillMissingParams() {
	// --- STATE MANAGEMENT ---
	const router = useRouter();
	const pathname = usePathname();
	const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
	const [maxConsecutive, setMaxConsecutive] = useState<number>(3);
	const [isFlagging, setIsFlagging] = useState(false);
	const [isFilling, setIsFilling] = useState(false);
	const { wellsDir } = useAppDataStore();

	// --- KONTEKS AWARENESS ---
	const { selectedWells, wellColumns, fetchWellColumns, selectedFilePath } =
		useDashboard();

	const isDataPrep = pathname?.startsWith("/data-prep") || false;

	// --- DATA FETCHING & MEMOIZATION ---
	useEffect(() => {
		setSelectedLogs([]);

		let wellIdentifiers: string[] = [];

		if (isDataPrep && selectedFilePath) {
			// Untuk Data Prep, identifier-nya adalah path relatif lengkap ke file
			wellIdentifiers = [selectedFilePath];
		} else if (!isDataPrep && selectedWells.length > 0) {
			// Untuk Dashboard, identifier-nya adalah nama sumur tanpa ekstensi
			wellIdentifiers = selectedWells.map((well) => well.replace(/\.csv$/, ""));
		}

		// Panggil fetchWellColumns jika ada identifier yang valid
		if (wellIdentifiers.length > 0) {
			fetchWellColumns(wellIdentifiers);
		}
	}, [isDataPrep, selectedFilePath, selectedWells, fetchWellColumns]);

	const allAvailableColumns = useMemo(() => {
		if (!wellColumns) return [];
		const allCols = Object.values(wellColumns).flat();
		return [...new Set(allCols)];
	}, [wellColumns]);

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

	// --- LOGIKA UTAMA ---
	const runProcess = async (stage: "flag" | "fill") => {
		// Validasi input (sudah benar)
		if (isDataPrep && !selectedFilePath) {
			alert("Silakan pilih satu file dari Wells Browser untuk diproses.");
			return;
		}
		if (!isDataPrep && selectedWells.length > 0 && selectedLogs.length === 0) {
			alert(`Silakan pilih setidaknya satu log untuk di-${stage}.`);
			return;
		}

		stage === "flag" ? setIsFlagging(true) : setIsFilling(true);

		// --- PERBAIKAN 2: Sesuaikan payload agar cocok dengan ekspektasi backend ---
		let payload: any;
		if (isDataPrep) {
			// Payload untuk Data Prep: backend mengharapkan 'file_paths' sebagai ARRAY
			payload = {
				file_paths: [selectedFilePath], // Kirim sebagai array berisi satu path
				logs_to_check: selectedLogs,
				logs_to_fill: selectedLogs,
				max_consecutive_nan: maxConsecutive,
			};
		} else {
			// Payload untuk Dashboard: backend mengharapkan 'selected_wells' dan 'full_path'
			payload = {
				full_path: wellsDir,
				selected_wells: selectedWells,
				logs_to_check: selectedLogs,
				logs_to_fill: selectedLogs,
				max_consecutive_nan: maxConsecutive,
			};
		}

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
			if (stage === "fill")
				router.push(isDataPrep ? "/data-prep" : "/dashboard");
		} catch (err) {
			alert(`❌ ${err instanceof Error ? err.message : "Unknown error"}`);
		} finally {
			stage === "flag" ? setIsFlagging(false) : setIsFilling(false);
		}
	};

	const isActionDisabled =
		isFlagging ||
		isFilling ||
		(isDataPrep ? !selectedFilePath : selectedWells.length === 0);

	return (
		<div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
			<h2 className="text-xl font-bold mb-4 text-gray-800">
				Fill Missing Values (Two Stages)
			</h2>
			<div className="mb-6 p-4 border rounded-lg bg-gray-50">
				<h3 className="text-lg font-semibold mb-2">File(s) to Process</h3>
				{isDataPrep ? (
					selectedFilePath ? (
						<p className="text-sm text-blue-800 bg-blue-50 p-2 rounded-md">
							File: <strong>{selectedFilePath.split("/").pop()}</strong>
						</p>
					) : (
						<p className="text-sm text-red-600 font-medium">
							Pilih satu file dari Wells Browser.
						</p>
					)
				) : selectedWells.length > 0 ? (
					<div className="max-h-28 overflow-y-auto text-sm text-blue-800 bg-blue-50 p-2 rounded-md">
						<ul className="list-disc list-inside">
							{selectedWells.map((path) => (
								<li key={path}>{path.split("/").pop()}</li>
							))}
						</ul>
					</div>
				) : (
					<p className="text-sm text-red-600 font-medium">
						Pilih satu atau lebih sumur dari Wells Browser.
					</p>
				)}
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
						disabled={isActionDisabled}>
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
						disabled={isActionDisabled}>
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
									className="min-w-[200px] text-sm"
									classNamePrefix="react-select"
									menuPortalTarget={
										typeof window !== "undefined" ? document.body : null
									}
									styles={{
										input: (base) => ({ ...base, color: "#1f2937" }),
										option: (base, state) => ({
											...base,
											color: state.isSelected ? "white" : "#1f2937",
										}),
										multiValueLabel: (base) => ({ ...base, color: "black" }),
									}}
									placeholder={
										isActionDisabled
											? "Select file/well(s) first"
											: "Select logs..."
									}
									isDisabled={isActionDisabled}
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
