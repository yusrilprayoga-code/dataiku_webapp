"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { type ParameterRow } from "@/types";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDataStore } from "@/stores/useAppDataStore";

const createInitialParameters = (intervals: string[]): ParameterRow[] => {
	// Use a default interval if none are provided (like splicing-merging)
	const effectiveIntervals = intervals.length > 0 ? intervals : ["default"];
	const createValues = (val: string | number) =>
		Object.fromEntries(effectiveIntervals.map((i) => [i, val]));

	const allPossibleParams: Omit<ParameterRow, "values">[] = [
		{
			id: 1,
			location: "Parameter",
			mode: "Input",
			comment: "Normalization: Min-Max",
			unit: "ALPHA*15",
			name: "NORMALIZE_OPT",
			isEnabled: true,
		},
		{
			id: 2,
			location: "Constant",
			mode: "Input",
			comment: "Input low log value",
			unit: "",
			name: "LOW_IN",
			isEnabled: true,
		},
		{
			id: 3,
			location: "Constant",
			mode: "Input",
			comment: "Input high log value",
			unit: "",
			name: "HIGH_IN",
			isEnabled: true,
		},
		{
			id: 4,
			location: "Constant",
			mode: "Input",
			comment: "Reference log low value",
			unit: "",
			name: "LOW_REF",
			isEnabled: true,
		},
		{
			id: 5,
			location: "Constant",
			mode: "Input",
			comment: "Reference log high value",
			unit: "",
			name: "HIGH_REF",
			isEnabled: true,
		},
		{
			id: 6,
			location: "Constant",
			mode: "Input",
			comment: "Number of bins to subdivide input log values",
			unit: "",
			name: "BINS",
			isEnabled: true,
		},
		{
			id: 7,
			location: "Log",
			mode: "Input",
			comment: "Input Log",
			unit: "LOG_IN",
			isEnabled: true,
			name: "LOG_IN",
		},
		{
			id: 8,
			location: "Log",
			mode: "Output",
			comment: "Output Log Name",
			unit: "LOG_OUT",
			name: "LOG_OUT",
			isEnabled: true,
		},
	];

	const relevantParamNames = new Set([
		"NORMALIZE_OPT",
		"LOG_IN",
		"LOG_OUT",
		"LOW_REF",
		"HIGH_REF",
		"LOW_IN",
		"HIGH_IN",
		"BINS"
	]);

	const defaultValues: Record<string, string | number> = {
		NORMALIZE_OPT: "MIN-MAX",
		LOG_IN: "GR",
		LOW_REF: 40,
		HIGH_REF: 140,
		LOW_IN: 5, // Nilai awal ini akan segera ditimpa oleh data dari backend
		HIGH_IN: 95, // Nilai awal ini akan segera ditimpa oleh data dari backendHIGH_IN: 95
		BINS: 100.0,
	};

	defaultValues["LOG_OUT"] = `${defaultValues["LOG_IN"]}_NORM`;

	return allPossibleParams
		.filter((p) => relevantParamNames.has(p.name))
		.map((p) => ({
			...p,
			values: createValues(defaultValues[p.name] || ""),
		}));
};

export default function NormalizationParams() {
	const { selectedWells, selectedIntervals, selectedZones, wellColumns } =
		useDashboard();
	const [parameters, setParameters] = useState<ParameterRow[]>([]);
	const router = useRouter();
	const pathname = usePathname();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [rowSync, setRowSync] = useState<Record<number, boolean>>({});
	// State baru untuk loading saat mengambil nilai persentil
	const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);

	// Check if we're in DataPrep context by checking the current pathname
	const isDataPrep = pathname?.startsWith("/data-prep") || false;
	const isUsingZones = selectedZones.length > 0;
	const effectiveSelection = isUsingZones ? selectedZones : selectedIntervals;
	const { wellsDir } = useAppDataStore();

	useEffect(() => {
		setParameters(createInitialParameters(effectiveSelection));
	}, [effectiveSelection, selectedIntervals, selectedZones]);

	// PERBAIKAN 1: Logika `useMemo` tetap sama, ini sudah benar
	const allAvailableColumns = useMemo(() => {
		if (!selectedWells || selectedWells.length === 0 || !wellColumns) return [];
		const allCols = Object.values(wellColumns).flat();
		return [...new Set(allCols)];
	}, [selectedWells, wellColumns]);

	const filteredColumnsForNormalization = useMemo(() => {
		const keywords = ["DGRCC", "GR", "GR_CAL"];
		// Filter daftar kolom agar hanya mengandung salah satu dari keywords
		return allAvailableColumns.filter((col) =>
			keywords.some((keyword) => col.includes(keyword))
		);
	}, [allAvailableColumns]);

	useEffect(() => {
		const updateAndFetchValues = async () => {
			// Langkah 1: Tentukan nilai log default (misal: 'GR' atau dari kolom yang tersedia)
			const logInParam = parameters.find((p) => p.name === "LOG_IN");
			if (!logInParam || filteredColumnsForNormalization.length === 0) return;

			const firstKey = effectiveSelection[0] || "default";
			let logColumnToUse = logInParam.values[firstKey] as string;

			// Jika nilai log saat ini tidak valid, update dengan yang pertama tersedia
			if (!filteredColumnsForNormalization.includes(logColumnToUse)) {
				logColumnToUse = filteredColumnsForNormalization[0];
				setParameters((prev) =>
					prev.map((p) => {
						if (p.name === "LOG_IN") {
							const newValues = { ...p.values };
							Object.keys(newValues).forEach((key) => {
								newValues[key] = logColumnToUse;
							});
							return { ...p, values: newValues };
						}
						return p;
					})
				);
			}

			// Langkah 2: Lakukan fetch persentil dengan nilai log yang sudah valid
			if (selectedWells.length === 0 || !logColumnToUse) return;

			setIsFetchingDefaults(true);
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
			try {
				const response = await fetch(`${apiUrl}/api/get-log-percentiles`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						full_path: wellsDir,
						selected_wells: selectedWells,
						selected_intervals: isUsingZones ? [] : selectedIntervals,
						selected_zones: isUsingZones ? selectedZones : [],
						log_column: logColumnToUse,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Gagal mengambil persentil.");
				}

				const data = await response.json();
				setParameters((prev) =>
					prev.map((p) => {
						const newValues = { ...p.values };
						if (p.name === "LOW_REF" || p.name === "HIGH_REF") {
							Object.keys(newValues).forEach((key) => {
								newValues[key] = p.name === "LOW_REF" ? data.p5 : data.p95;
							});
							return { ...p, values: newValues };
						}
						return p;
					})
				);
			} catch (error) {
				console.error(error);
				alert(
					`Could not fetch default percentiles: ${
						error instanceof Error ? error.message : "Unknown error"
					}`
				);
			} finally {
				setIsFetchingDefaults(false);
			}
		};

		// Hanya jalankan jika parameter sudah diinisialisasi
		if (parameters.length > 0) {
			updateAndFetchValues();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedWells, selectedIntervals, selectedZones, wellsDir, wellColumns]);

	// Handler `handleUnifiedValueChange` diganti nama menjadi `handleValueChange` untuk konsistensi
	const handleValueChange = (
		id: number,
		newValue: string,
		interval: string
	) => {
		setParameters((prev) =>
			prev.map((row) => {
				if (row.id !== id) return row;
				if (rowSync[id]) {
					const newValues = Object.fromEntries(
						Object.keys(row.values).map((i) => [i, newValue])
					);
					return { ...row, values: newValues };
				}
				return {
					...row,
					values: { ...row.values, [interval]: newValue },
				};
			})
		);
	};

	const handleRowToggle = (id: number, isEnabled: boolean) => {
		setRowSync((prev) => ({ ...prev, [id]: isEnabled }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		const firstActiveKey = isUsingZones
			? selectedZones[0] || "default"
			: selectedIntervals[0] || "default";

		const formParams = parameters
			.filter((p) => p.isEnabled)
			.reduce((acc, param) => {
				const value =
					param.values[firstActiveKey] ||
					param.values[Object.keys(param.values)[0]];
				acc[param.name] = isNaN(Number(value)) ? value : Number(value);
				return acc;
			}, {} as Record<string, string | number>);

		const payload = {
			full_path: wellsDir,
			params: formParams,
			selected_wells: selectedWells,
			selected_intervals: isUsingZones ? [] : selectedIntervals,
			selected_zones: isUsingZones ? selectedZones : [],
			isDataPrep: isDataPrep,
		};

		console.log("Payload yang dikirim ke backend:", payload);
		const apiUrl = process.env.NEXT_PUBLIC_API_URL;
		const endpoint = `${apiUrl}/api/run-interval-normalization`;

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Server error");
			}
			const result = await response.json();
			console.log(
				"Data yang sudah dinormalisasi diterima:",
				JSON.parse(result.data)
			);
			alert(result.message + " Hasilnya ada di console (F12).");
			router.push("/dashboard");
		} catch (error) {
			alert(
				`Error: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const getRowBgColor = (location: string, mode: string): string => {
		switch (location) {
			case "Parameter":
				return "bg-orange-600";
			case "Constant":
				return mode === "Input" ? "bg-yellow-300" : "bg-yellow-100";
			case "Log":
				return mode === "Input" ? "bg-cyan-400" : "bg-cyan-200";
			case "Output":
				return "bg-yellow-600";
			case "Interval":
				return "bg-green-400";
			default:
				return "bg-white";
		}
	};

	const staticHeaders = isDataPrep
		? ["Location", "Mode", "Comment", "Unit", "Name", "Value"]
		: ["Location", "Mode", "Comment", "Unit", "Name", "P"];

	return (
		<div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
			<h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">
				Normalize a log based on calibration parameters.
			</h2>
			<form
				onSubmit={handleSubmit}
				className="flex-grow flex flex-col min-h-0">
				<div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
					<div className="md:col-span-4">
						<p className="text-sm font-medium text-gray-700">
							Well: {selectedWells.join(", ") || "N/A"} / Intervals:{" "}
							{selectedIntervals.length || selectedZones.length} selected
						</p>
					</div>
					<div className="flex justify-end gap-2 mt-4 pt-4 border-t">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">
							Cancel
						</button>
						<button
							type="submit"
							className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
							disabled={isSubmitting || isFetchingDefaults}>
							{isSubmitting || isFetchingDefaults ? (
								<Loader2 className="animate-spin" />
							) : (
								"Start"
							)}
						</button>
					</div>
				</div>

				<h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
				<div className="flex-grow min-h-0 border border-gray-300 rounded-lg">
					<div className="overflow-auto h-full">
						<table className="min-w-full text-sm table-auto">
							<thead className="bg-gray-200 sticky top-0 z-10">
								<tr>
									{staticHeaders.map((header) => (
										<th
											key={header}
											className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">
											{header}
										</th>
									))}
									{!isDataPrep &&
										selectedIntervals.map((header) => (
											<th
												key={header}
												className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">
												{header}
											</th>
										))}
									{!isDataPrep &&
										selectedZones.map((header) => (
											<th
												key={header}
												className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">
												{header}
											</th>
										))}
								</tr>
							</thead>
							<tbody className="bg-white">
								{parameters.map((param) => (
									<tr
										key={param.id}
										className={`border-b border-gray-200 ${
											param.isEnabled
												? getRowBgColor(param.location, param.mode)
												: "bg-gray-100 text-gray-400"
										}`}>
										<td className="px-3 py-2 border-r whitespace-nowrap text-sm">
											{param.location}
										</td>
										<td className="px-3 py-2 border-r whitespace-nowrap text-sm">
											{param.mode}
										</td>
										<td className="px-3 py-2 border-r whitespace-normal max-w-xs text-sm">
											{param.comment}
										</td>
										<td className="px-3 py-2 border-r whitespace-nowrap text-sm">
											{param.unit}
										</td>
										<td className="px-3 py-2 border-r font-semibold whitespace-nowrap text-sm">
											{param.name}
										</td>

										<td className="px-3 py-2 border-r text-center">
											<input
												type="checkbox"
												className="h-4 w-4 rounded border-gray-400"
												checked={!!rowSync[param.id]}
												onChange={(e) =>
													handleRowToggle(param.id, e.target.checked)
												}
											/>
										</td>
										{selectedIntervals.map((interval) => (
											<td
												key={interval}
												className="px-3 py-2 border-r bg-white text-black">
												{param.name === "NORMALIZE_OPT" ? (
													<select
														value={param.values[interval] ?? ""}
														onChange={(e) =>
															handleValueChange(
																param.id,
																e.target.value,
																interval
															)
														}
														className="w-full p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500">
														<option value="MIN-MAX">MIN-MAX</option>
													</select>
												) : (
													<input
														type="text"
														value={param.values[interval] ?? ""}
														onChange={(e) =>
															handleValueChange(
																param.id,
																e.target.value,
																interval
															)
														}
														className="w-full min-w-[100px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
													/>
												)}
											</td>
										))}
										{isUsingZones &&
											selectedZones.map((zone) => (
												<td
													key={zone}
													className="px-3 py-2 border-r bg-white text-black">
													{param.name === "NORMALIZE_OPT" ? (
														<select
															value={param.values[zone] ?? ""}
															onChange={(e) =>
																handleValueChange(
																	param.id,
																	e.target.value,
																	zone
																)
															}
															className="w-full p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500">
															<option value="MIN-MAX">MIN-MAX</option>
														</select>
													) : (
														<input
															type="text"
															value={param.values[zone] ?? ""}
															onChange={(e) =>
																handleValueChange(
																	param.id,
																	e.target.value,
																	zone
																)
															}
															className="w-full min-w-[100px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
														/>
													)}
												</td>
											))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</form>
		</div>
	);
}
