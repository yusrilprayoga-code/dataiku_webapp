"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { type ParameterRow } from "@/types";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDataStore } from "@/stores/useAppDataStore";

const createInitialParameters = (intervals: string[]): ParameterRow[] => {
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
			comment: "Input low log value percentile",
			unit: "%",
			name: "LOW_IN",
			isEnabled: true,
		},
		{
			id: 3,
			location: "Constant",
			mode: "Input",
			comment: "Input high log value percentile",
			unit: "%",
			name: "HIGH_IN",
			isEnabled: true,
		},
		{
			id: 4,
			location: "Constant",
			mode: "Input",
			comment: "New desired PCT_LOW (from percentile)",
			unit: "",
			name: "PCT_LOW_NEW",
			isEnabled: true,
		},
		{
			id: 5,
			location: "Constant",
			mode: "Input",
			comment: "New desired PCT_HIGH (from percentile)",
			unit: "",
			name: "PCT_HIGH_NEW",
			isEnabled: true,
		},
		{
			id: 6,
			location: "Constant",
			mode: "Input",
			comment: "Folder-wide P5 percentile (auto-fetched)",
			unit: "",
			name: "PCT_LOW_OLD",
			isEnabled: true,
		},
		{
			id: 7,
			location: "Constant",
			mode: "Input",
			comment: "Folder-wide P95 percentile (auto-fetched)",
			unit: "",
			name: "PCT_HIGH_OLD",
			isEnabled: true,
		},
		{
			id: 8,
			location: "Log",
			mode: "Input",
			comment: "Input Log",
			unit: "",
			name: "LOG_IN",
			isEnabled: true,
		},
		{
			id: 9,
			location: "Log",
			mode: "Output",
			comment: "Output Log Name",
			unit: "",
			name: "LOG_OUT",
			isEnabled: true,
		},
	];

	const defaultValues: Record<string, string | number> = {
		NORMALIZE_OPT: "MIN-MAX",
		PCT_LOW_NEW: 0,
		PCT_HIGH_NEW: 0,
		PCT_LOW_OLD: 0,
		PCT_HIGH_OLD: 0,
		LOG_IN: "GR",
		LOW_IN: 5,
		HIGH_IN: 95,
	};

	defaultValues["LOG_OUT"] = `${defaultValues["LOG_IN"]}_NORM`;

	return allPossibleParams.map((p) => ({
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
	const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);

	const isDataPrep = pathname?.startsWith("/data-prep") || false;
	const isUsingZones = selectedZones.length > 0;
	const effectiveSelection = isUsingZones ? selectedZones : selectedIntervals;
	const { wellsDir } = useAppDataStore();

	useEffect(() => {
		setParameters(createInitialParameters(effectiveSelection));
	}, [effectiveSelection]);

	const allAvailableColumns = useMemo(() => {
		if (!selectedWells || selectedWells.length === 0 || !wellColumns) return [];
		const allCols = Object.values(wellColumns).flat();
		return [...new Set(allCols)];
	}, [selectedWells, wellColumns]);

	const filteredColumnsForNormalization = useMemo(() => {
		const keywords = ["DGRCC", "GR", "GR_CAL"];
		return allAvailableColumns.filter((col) =>
			keywords.some((keyword) => col.toUpperCase().includes(keyword))
		);
	}, [allAvailableColumns]);

	const handleValueChange = useCallback(
		(id: number, newValue: string, interval: string) => {
			setParameters((prev) =>
				prev.map((row) => {
					if (row.id !== id) return row;
					if (rowSync[id]) {
						const newValues = Object.fromEntries(
							Object.keys(row.values).map((i) => [i, newValue])
						);
						return { ...row, values: newValues };
					}
					return { ...row, values: { ...row.values, [interval]: newValue } };
				})
			);
		},
		[rowSync]
	);

	const firstKey = useMemo(
		() => effectiveSelection[0] || "default",
		[effectiveSelection]
	);

	const { logColumnToUse, lowInValue, highInValue } = useMemo(() => {
		const logInParam = parameters.find((p) => p.name === "LOG_IN");
		const lowInParam = parameters.find((p) => p.name === "LOW_IN");
		const highInParam = parameters.find((p) => p.name === "HIGH_IN");
		return {
			logColumnToUse: logInParam?.values[firstKey] as string,
			lowInValue: lowInParam?.values[firstKey],
			highInValue: highInParam?.values[firstKey],
		};
	}, [parameters, firstKey]);

	// Effect untuk `PCT_OLD` (berdasarkan sumur terpilih & nilai LOW/HIGH_IN)
	useEffect(() => {
		const fetchSelectedWellsPercentiles = async () => {
			if (
				!logColumnToUse ||
				lowInValue === undefined ||
				highInValue === undefined ||
				selectedWells.length === 0
			) {
				return;
			}

			setIsFetchingDefaults(true);
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL;
				const response = await fetch(`${apiUrl}/api/get-log-percentiles`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						full_path: wellsDir,
						selected_wells: selectedWells,
						selected_intervals: isUsingZones ? [] : selectedIntervals,
						selected_zones: isUsingZones ? selectedZones : [],
						log_column: logColumnToUse,
						low_percentile: Number(lowInValue),
						high_percentile: Number(highInValue),
					}),
				});
				if (!response.ok)
					throw new Error("Gagal mengambil persentil sumur terpilih.");

				const data = await response.json();

				// PERBAIKAN: Update state PCT_OLD
				setParameters((prev) =>
					prev.map((p) => {
						if (p.name === "PCT_LOW_OLD" || p.name === "PCT_HIGH_OLD") {
							const newValues = { ...p.values };
							Object.keys(newValues).forEach((key) => {
								newValues[key] =
									p.name === "PCT_LOW_OLD" ? data.p_low : data.p_high;
							});
							return { ...p, values: newValues };
						}
						return p;
					})
				);
			} catch (error) {
				console.error("Error fetching selected wells percentiles:", error);
			} finally {
				setIsFetchingDefaults(false);
			}
		};

		fetchSelectedWellsPercentiles();
	}, [
		logColumnToUse,
		lowInValue,
		highInValue,
		selectedWells,
		selectedIntervals,
		selectedZones,
		wellsDir,
		isUsingZones,
	]);

	// Effect untuk `PCT_NEW` (berdasarkan semua sumur di folder)
	useEffect(() => {
		const fetchFolderPercentiles = async () => {
			if (!logColumnToUse || !wellsDir) return;

			setIsFetchingDefaults(true);
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL;
				const response = await fetch(`${apiUrl}/api/get-folder-percentiles`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						full_path: wellsDir,
						log_column: logColumnToUse,
						low_percentile: Number(lowInValue),
						high_percentile: Number(highInValue),
						selected_intervals: isUsingZones ? [] : selectedIntervals,
						selected_zones: isUsingZones ? selectedZones : [],
					}),
				});
				if (!response.ok) throw new Error("Gagal mengambil persentil folder.");
				const data = await response.json();

				// PERBAIKAN: Update state PCT_NEW
				setParameters((prev) =>
					prev.map((p) => {
						if (p.name === "PCT_LOW_NEW" || p.name === "PCT_HIGH_NEW") {
							const newValues = { ...p.values };
							Object.keys(newValues).forEach((key) => {
								newValues[key] =
									p.name === "PCT_LOW_NEW"
										? data.p_low_folder
										: data.p_high_folder;
							});
							return { ...p, values: newValues };
						}
						return p;
					})
				);
			} catch (error) {
				console.error("Error fetching folder percentiles:", error);
			} finally {
				setIsFetchingDefaults(false);
			}
		};

		fetchFolderPercentiles();
	}, [
		wellsDir,
		logColumnToUse,
		lowInValue,
		highInValue,
		isUsingZones,
		selectedIntervals,
		selectedZones,
	]);

	const handleRowToggle = (id: number, isEnabled: boolean) => {
		setRowSync((prev) => ({ ...prev, [id]: isEnabled }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		const firstActiveKey =
			(isUsingZones ? selectedZones[0] : selectedIntervals[0]) || "default";
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
			alert(result.message || "Proses normalisasi berhasil!");
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
					<p className="text-sm font-medium text-gray-700">
						Well: {selectedWells.join(", ") || "N/A"} / Intervals:{" "}
						{effectiveSelection.length} selected
					</p>
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
										effectiveSelection.map((header) => (
											<th
												key={header}
												className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">
												{header}
											</th>
										))}
								</tr>
							</thead>
							<tbody className="bg-white">
								{parameters.map((param) => {
									const firstKey = effectiveSelection[0] || "default";
									const currentValue = param.values[firstKey] ?? "";
									const isLogInput =
										param.location === "Log" && param.mode === "Input";

									return (
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

											{isDataPrep ? (
												<td className="px-3 py-2 border-r bg-white text-black">
													{param.name === "NORMALIZE_OPT" ? (
														<select
															value={String(currentValue)}
															onChange={(e) =>
																handleValueChange(
																	param.id,
																	e.target.value,
																	firstKey
																)
															}
															className="w-full p-1 bg-white"
															disabled={!param.isEnabled}>
															<option value="MIN-MAX">MIN-MAX</option>
														</select>
													) : isLogInput ? (
														<select
															value={String(currentValue)}
															onChange={(e) =>
																handleValueChange(
																	param.id,
																	e.target.value,
																	firstKey
																)
															}
															className="w-full p-1 bg-white"
															disabled={!param.isEnabled}>
															{(param.name === "LOG_IN"
																? filteredColumnsForNormalization
																: allAvailableColumns
															).map((opt) => (
																<option
																	key={opt}
																	value={opt}>
																	{opt}
																</option>
															))}
														</select>
													) : (
														<input
															type="text"
															value={String(currentValue)}
															onChange={(e) =>
																handleValueChange(
																	param.id,
																	e.target.value,
																	firstKey
																)
															}
															className="w-full p-1 bg-white"
															disabled={
																!param.isEnabled || param.mode === "Output"
															}
														/>
													)}
												</td>
											) : (
												<>
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
													{effectiveSelection.map((key) => {
														const cellValue = param.values[key] ?? "";
														return (
															<td
																key={key}
																className="px-3 py-2 border-r bg-white text-black">
																{param.name === "NORMALIZE_OPT" ? (
																	<select
																		value={String(cellValue)}
																		onChange={(e) =>
																			handleValueChange(
																				param.id,
																				e.target.value,
																				key
																			)
																		}
																		className="w-full p-1 bg-white"
																		disabled={!param.isEnabled}>
																		<option value="MIN-MAX">MIN-MAX</option>
																	</select>
																) : isLogInput ? (
																	<select
																		value={String(cellValue)}
																		onChange={(e) =>
																			handleValueChange(
																				param.id,
																				e.target.value,
																				key
																			)
																		}
																		className="w-full p-1 bg-white"
																		disabled={!param.isEnabled}>
																		{!filteredColumnsForNormalization.includes(
																			String(cellValue)
																		) && (
																			<option value={String(cellValue)}>
																				{String(cellValue)}
																			</option>
																		)}
																		{filteredColumnsForNormalization.map(
																			(opt) => (
																				<option
																					key={opt}
																					value={opt}>
																					{opt}
																				</option>
																			)
																		)}
																	</select>
																) : (
																	<input
																		type="text"
																		value={String(cellValue)}
																		onChange={(e) =>
																			handleValueChange(
																				param.id,
																				e.target.value,
																				key
																			)
																		}
																		className="w-full p-1 bg-white"
																		disabled={
																			!param.isEnabled ||
																			param.mode === "Output"
																		}
																	/>
																)}
															</td>
														);
													})}
												</>
											)}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</form>
		</div>
	);
}
