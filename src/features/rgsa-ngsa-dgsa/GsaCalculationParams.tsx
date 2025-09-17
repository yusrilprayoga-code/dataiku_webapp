"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/contexts/DashboardContext";
import { type ParameterRow } from "@/types";
import { Loader2 } from "lucide-react";
import { useAppDataStore } from "@/stores/useAppDataStore";

// Definisikan tipe untuk props yang akan diterima komponen ini
interface GsaBaseParamsProps {
	moduleTitle: string;
	apiEndpoint: string;
	relevantParams: string[];
}

// Fungsi createInitialParameters sekarang menerima daftar parameter yang relevan
const createInitialParameters = (
	intervals: string[],
	relevantParamNames: string[]
): ParameterRow[] => {
	const effectiveIntervals = intervals.length > 0 ? intervals : ["default"];
	const createValues = (val: string | number) =>
		Object.fromEntries(effectiveIntervals.map((i) => [i, val]));

	// Definisikan master list dari SEMUA parameter GSA yang mungkin
	const allPossibleParams: Omit<ParameterRow, "values">[] = [
		// --- Constant Parameters ---
		{
			id: 1,
			location: "Constant",
			mode: "Input",
			comment: "window wide of sliding average",
			unit: "METRES",
			name: "SLIDING_WINDOW",
			isEnabled: true,
		},
		{
			id: 2,
			location: "Constant",
			mode: "Input",
			comment: "Maximum resistivity in water zone",
			unit: "OHMM",
			name: "RESWAT_MAX",
			isEnabled: true,
		},
		{
			id: 3,
			location: "Constant",
			mode: "Input",
			comment: "Minimum resistivity in water zone",
			unit: "OHMM",
			name: "RESWAT_MIN",
			isEnabled: true,
		},
		{
			id: 4,
			location: "Constant",
			mode: "Input",
			comment: "Maximum hydrogen index in water zone",
			unit: "V/V",
			name: "NPHIWAT_MAX",
			isEnabled: true,
		},
		{
			id: 5,
			location: "Constant",
			mode: "Input",
			comment: "Minimum hydrogen index in water zone",
			unit: "V/V",
			name: "NPHIWAT_MIN",
			isEnabled: true,
		},
		{
			id: 6,
			location: "Constant",
			mode: "Input",
			comment: "Maximum density in water zone",
			unit: "G/C3",
			name: "RHOBWAT_MAX",
			isEnabled: true,
		},
		{
			id: 7,
			location: "Constant",
			mode: "Input",
			comment: "Minimum density in water zone",
			unit: "G/C3",
			name: "RHOBWAT_MIN",
			isEnabled: true,
		},

		// --- Input Logs ---
		{
			id: 8,
			location: "Log",
			mode: "Input",
			comment: "Downhole depth",
			unit: "METRES",
			name: "DEPTH",
			isEnabled: true,
		},
		{
			id: 9,
			location: "Log",
			mode: "Input",
			comment: "Input gamma ray log",
			unit: "GAPI",
			name: "GR",
			isEnabled: true,
		},
		{
			id: 10,
			location: "Log",
			mode: "Input",
			comment: "Input density log",
			unit: "G/C3",
			name: "DENS",
			isEnabled: true,
		},
		{
			id: 11,
			location: "Log",
			mode: "Input",
			comment: "Input neutron log",
			unit: "V/V",
			name: "NEUT",
			isEnabled: true,
		},
		{
			id: 12,
			location: "Log",
			mode: "Input",
			comment: "Input resistivity log",
			unit: "OHMM",
			name: "RES",
			isEnabled: true,
		},

		// --- Output Logs ---
		{
			id: 13,
			location: "Log",
			mode: "Output",
			comment: "Reference curve for resistivity",
			unit: "OHMM",
			name: "RGSA",
			isEnabled: true,
		},
		{
			id: 14,
			location: "Log",
			mode: "Output",
			comment: "Reference curve for density",
			unit: "G/C3",
			name: "DGSA",
			isEnabled: true,
		},
		{
			id: 15,
			location: "Log",
			mode: "Output",
			comment: "Reference curve for neutron",
			unit: "V/V",
			name: "NGSA",
			isEnabled: true,
		},
	];

	// Nilai default yang sesuai dengan kolom "Value" pada gambar.
	const defaultValues: Record<string, string | number> = {
		// Constants
		SLIDING_WINDOW: 50,
		RESWAT_MAX: 20,
		RESWAT_MIN: 0.1,
		NPHIWAT_MAX: 0.6,
		NPHIWAT_MIN: 0.05,
		RHOBWAT_MAX: 2.8,
		RHOBWAT_MIN: 2,

		// Input Logs
		DEPTH: "DEPTH",
		GR: "GR",
		DENS: "RHOB",
		NEUT: "NPHI",
		RES: "RT",
		// 'LITHOLOGY': 'LAYERING_LITHO.LITHO',

		// Output Logs
		RGSA: "RGSA",
		DGSA: "DGSA",
		NGSA: "NGSA",
	};

	// Filter parameter berdasarkan props `relevantParamNames` yang diterima
	return allPossibleParams
		.filter((p) => relevantParamNames.includes(p.name))
		.map((p) => ({
			...p,
			values: createValues(defaultValues[p.name] || ""),
		}));
};

export default function GsaBaseParams({
	moduleTitle,
	apiEndpoint,
	relevantParams,
}: GsaBaseParamsProps) {
	const { selectedWells, selectedIntervals, wellColumns, selectedZones } =
		useDashboard();
	const router = useRouter();
	const [parameters, setParameters] = useState<ParameterRow[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [linkedRows, setLinkedRows] = useState<Record<number, boolean>>({});

	const activeIntervals =
		selectedZones.length > 0 ? selectedZones : selectedIntervals;
	const isUsingZones = selectedZones.length > 0;

	const { wellsDir } = useAppDataStore();

	useEffect(() => {
		const effectiveSelection =
			selectedZones.length > 0 ? selectedZones : selectedIntervals;
		setParameters(createInitialParameters(effectiveSelection, relevantParams));
	}, [selectedIntervals, selectedZones, relevantParams]);

	const combinedColumns = useMemo(() => {
		if (
			!selectedWells ||
			selectedWells.length === 0 ||
			Object.keys(wellColumns).length === 0
		) {
			return [];
		}
		// PERBAIKAN: Menggunakan format key `${well}.csv` agar konsisten dengan contoh yang bekerja
		const allLogs = selectedWells.flatMap(
			(well) => wellColumns[`${well}.csv`] || []
		);
		return [...new Set(allLogs)];
	}, [selectedWells, wellColumns]);

	// BARU: Buat daftar opsi yang sudah di-filter sebelumnya dengan useMemo, sama seperti di IQUAL
	const grOptions = useMemo(
		() => combinedColumns.filter((col) => col.toUpperCase().includes("GR")),
		[combinedColumns]
	);
	const densOptions = useMemo(
		() => combinedColumns.filter((col) => col.toUpperCase().includes("RHOB")),
		[combinedColumns]
	);
	const neutOptions = useMemo(
		() => combinedColumns.filter((col) => col.toUpperCase().includes("NPHI")),
		[combinedColumns]
	);
	const resOptions = useMemo(
		() => combinedColumns.filter((col) => col.toUpperCase().includes("RT")),
		[combinedColumns]
	);

	const handleValueChange = (
		id: number,
		interval: string,
		newValue: string
	) => {
		setParameters((prev) =>
			prev.map((row) => {
				if (row.id !== id) return row;
				if (linkedRows[id]) {
					const newValues = Object.fromEntries(
						Object.keys(row.values).map((i) => [i, newValue])
					);
					return { ...row, values: newValues };
				}
				return { ...row, values: { ...row.values, [interval]: newValue } };
			})
		);
	};

	const handleRowToggle = (id: number, isEnabled: boolean) => {
		setLinkedRows((prev) => ({ ...prev, [id]: isEnabled }));
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
				acc[param.name] = value;
				return acc;
			}, {} as Record<string, string | number>);

		const payload = {
			params: formParams,
			full_path: wellsDir,
			selected_wells: selectedWells,
			selected_intervals: isUsingZones ? [] : selectedIntervals,
			selected_zones: isUsingZones ? selectedZones : [],
		};

		const endpoint = `${process.env.NEXT_PUBLIC_API_URL}${apiEndpoint}`;

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok)
				throw new Error((await response.json()).error || "Server error");

			const result = await response.json();
			alert(result.message || "Proses kalkulasi berhasil!");
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

	const staticHeaders = [
		"#",
		"Location",
		"Mode",
		"Comment",
		"Unit",
		"Name",
		"P",
	];
	const displayColumns = isUsingZones ? selectedZones : selectedIntervals;

	return (
		<div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
			<h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">
				{moduleTitle}
			</h2>
			<form
				onSubmit={handleSubmit}
				className="flex-grow flex flex-col min-h-0">
				<div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
					<p className="text-sm font-medium text-gray-700">
						Well: {selectedWells.join(", ") || "N/A"} /
						{isUsingZones ? "Zones" : "Intervals"}: {activeIntervals.length}{" "}
						selected
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
							className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700"
							disabled={isSubmitting}>
							{isSubmitting ? <Loader2 className="animate-spin" /> : "Start"}
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
											className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">
											{header}
										</th>
									))}
									{displayColumns.map((header) => (
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
										className={`border-b ${getRowBgColor(
											param.location,
											param.mode
										)}`}>
										<td
											className={`px-3 py-2 border-r text-center ${getRowBgColor(
												param.location,
												param.mode
											)}`}>
											{param.id}
										</td>
										<td
											className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(
												param.location,
												param.mode
											)}`}>
											{param.location}
										</td>
										<td
											className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(
												param.location,
												param.mode
											)}`}>
											{param.mode}
										</td>
										<td
											className={`px-3 py-2 border-r max-w-xs whitespace-normal ${getRowBgColor(
												param.location,
												param.mode
											)}`}>
											{param.comment}
										</td>
										<td
											className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(
												param.location,
												param.mode
											)}`}>
											{param.unit}
										</td>
										<td
											className={`px-3 py-2 border-r font-semibold whitespace-nowrap ${getRowBgColor(
												param.location,
												param.mode
											)}`}>
											{param.name}
										</td>
										<td
											className={`px-3 py-2 border-r text-center ${getRowBgColor(
												param.location,
												param.mode
											)}`}>
											<input
												type="checkbox"
												className="h-4 w-4 rounded"
												checked={!!linkedRows[param.id]}
												onChange={(e) =>
													handleRowToggle(param.id, e.target.checked)
												}
											/>
										</td>
										{displayColumns.map((column) => {
											const currentValue = param.values[column] ?? "";
											const useDropdown = [
												"GR",
												"DENS",
												"NEUT",
												"RES",
											].includes(param.name);

											// PERBAIKAN: Gunakan switch untuk memilih list opsi yang sudah dibuat sebelumnya
											let options: string[] = [];
											switch (param.name) {
												case "GR":
													options = grOptions;
													break;
												case "DENS":
													options = densOptions;
													break;
												case "NEUT":
													options = neutOptions;
													break;
												case "RES":
													options = resOptions;
													break;
												default:
													options = [];
											}

											return (
												<td
													key={column}
													className="px-3 py-2 border-r bg-white text-black">
													{useDropdown ? (
														<select
															value={String(currentValue)}
															onChange={(e) =>
																handleValueChange(
																	param.id,
																	column,
																	e.target.value
																)
															}
															className="w-full p-1 bg-white">
															{/* Opsi untuk memastikan nilai saat ini tetap ada jika tidak ada di daftar filter */}
															{!options.includes(String(currentValue)) && (
																<option value={String(currentValue)}>
																	{String(currentValue)}
																</option>
															)}
															{/* Render opsi dari list yang sudah di-filter */}
															{options.map((opt) => (
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
																	column,
																	e.target.value
																)
															}
															className="w-full min-w-[100px] p-1 bg-white"
														/>
													)}
												</td>
											);
										})}
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
