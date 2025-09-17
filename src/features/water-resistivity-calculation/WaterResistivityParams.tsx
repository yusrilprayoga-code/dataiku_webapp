"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/contexts/DashboardContext";
import { type ParameterRow } from "@/types";
import { Loader2 } from "lucide-react";
import { useAppDataStore } from "@/stores/useAppDataStore";

// PERBAIKAN: Memperbarui daftar parameter sesuai permintaan baru
const createInitialRWAParameters = (selection: string[]): ParameterRow[] => {
	const effectiveSelection = selection.length > 0 ? selection : ["default"];
	const createValues = (val: string | number) =>
		Object.fromEntries(effectiveSelection.map((i) => [i, val]));

	const allPossibleParams: Omit<ParameterRow, "values">[] = [
		// Interval-based inputs
		{
			id: 1,
			location: "Interval",
			mode: "In_Out",
			comment: "Tortuosity constant",
			unit: "",
			name: "A",
			isEnabled: true,
		},
		{
			id: 2,
			location: "Interval",
			mode: "In_Out",
			comment: "Cementation Factor",
			unit: "",
			name: "M",
			isEnabled: true,
		},
		{
			id: 3,
			location: "Interval",
			mode: "In_Out",
			comment: "Shale resistivity",
			unit: "OHMM",
			name: "RT_SH",
			isEnabled: true,
		},

		// BARU: Parameter pilihan metode VSH
		{
			id: 4,
			location: "Constant",
			mode: "Input",
			comment: "Option for Indonesia VSH formula",
			unit: "",
			name: "OPT_INDO",
			isEnabled: true,
		},

		// Log inputs (ID disesuaikan)
		{
			id: 5,
			location: "Log",
			mode: "Input",
			comment: "True formation resistivity",
			unit: "OHMM",
			name: "RT",
			isEnabled: true,
		},
		{
			id: 6,
			location: "Log",
			mode: "Input",
			comment: "Limited effective porosity",
			unit: "V/V",
			name: "PHIE",
			isEnabled: true,
		},
		{
			id: 7,
			location: "Log",
			mode: "Input",
			comment: "Limited volume of shale",
			unit: "V/V",
			name: "VSH",
			isEnabled: true,
		},
		{
			id: 8,
			location: "Log",
			mode: "Input",
			comment: "Formation temperature",
			unit: "DEGC",
			name: "FTEMP",
			isEnabled: true,
		},

		// Log outputs (ID disesuaikan)
		{
			id: 9,
			location: "Log",
			mode: "Output",
			comment: "Apparent RW - Indonesia method",
			unit: "OHMM",
			name: "RWA_INDO",
			isEnabled: true,
		},
		{
			id: 10,
			location: "Log",
			mode: "Output",
			comment: "Limited apparent RW",
			unit: "OHMM",
			name: "RWA",
			isEnabled: true,
		},
		{
			id: 11,
			location: "Log",
			mode: "Output",
			comment: "Apparent RW at RWT",
			unit: "OHMM",
			name: "RWA_RWT",
			isEnabled: true,
		},
	];

	const defaultValues: Record<string, string | number> = {
		A: 1.0,
		M: 2.0,
		RT_SH: 2.2,
		OPT_INDO: "RWA_FULL", // Nilai default untuk parameter baru
		RT: "RT",
		PHIE: "PHIE",
		VSH: "VSH_LINEAR",
		FTEMP: "FTEMP",
		RWA_INDO: "RWA_INDO",
		RWA: "RWA",
		RWA_RWT: "RWA_RWT",
	};

	return allPossibleParams.map((p) => ({
		...p,
		values: createValues(defaultValues[p.name] || ""),
	}));
};

export default function RWACalculationParams() {
	const { selectedIntervals, selectedWells, wellColumns, selectedZones } =
		useDashboard();
	const router = useRouter();
	const [parameters, setParameters] = useState<ParameterRow[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [rowSync, setRowSync] = useState<Record<number, boolean>>({});

	const isUsingZones = selectedZones.length > 0;
	const { wellsDir } = useAppDataStore();
	const activeSelection = isUsingZones ? selectedZones : selectedIntervals;

	useEffect(() => {
		setParameters(createInitialRWAParameters(activeSelection));
	}, [activeSelection]);

	const combinedColumns = useMemo(() => {
		if (
			!selectedWells ||
			selectedWells.length === 0 ||
			Object.keys(wellColumns).length === 0
		)
			return [];
		const allLogs = selectedWells.flatMap(
			(well) => wellColumns[`${well}.csv`] || []
		);
		return [...new Set(allLogs)];
	}, [selectedWells, wellColumns]);

	const rtOptions = useMemo(
		() => combinedColumns.filter((c) => c.toUpperCase().includes("RT")),
		[combinedColumns]
	);
	const phieOptions = useMemo(
		() => combinedColumns.filter((c) => c.toUpperCase().includes("PHIE")),
		[combinedColumns]
	);
	const vshOptions = useMemo(
		() => combinedColumns.filter((c) => c.toUpperCase().includes("VSH")),
		[combinedColumns]
	);
	const ftempOptions = useMemo(
		() => combinedColumns.filter((c) => c.toUpperCase().includes("FTEMP")),
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
				if (rowSync[id]) {
					const newValues = Object.fromEntries(
						Object.keys(row.values).map((i) => [i, newValue])
					);
					return { ...row, values: newValues };
				}
				return { ...row, values: { ...row.values, [interval]: newValue } };
			})
		);
	};

	const handleRowToggle = (id: number, enabled: boolean) => {
		setRowSync((prev) => ({ ...prev, [id]: enabled }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		const firstActiveKey = activeSelection[0] || "default";

		const formParams = parameters
			.filter((p) => p.isEnabled)
			.reduce((acc, param) => {
				const value = param.values[firstActiveKey] || "";
				acc[param.name] = isNaN(Number(value)) ? value : Number(value);
				return acc;
			}, {} as Record<string, string | number>);

		const payload = {
			params: formParams,
			full_path: wellsDir,
			selected_wells: selectedWells,
			selected_intervals: selectedIntervals,
			selected_zones: selectedZones,
		};

		const apiUrl = process.env.NEXT_PUBLIC_API_URL;
		const endpoint = `${apiUrl}/api/run-rwa-calculation`;

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok)
				throw new Error((await response.json()).error || "Server error");
			const result = await response.json();
			alert(result.message || "Proses kalkulasi RW berhasil!");
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
		if (location === "Log")
			return mode === "Input" ? "bg-cyan-400" : "bg-cyan-200";
		if (location === "Interval") return "bg-green-400";
		if (location === "Constant") return "bg-yellow-300";
		return "bg-white";
	};

	const tableHeaders = [
		"#",
		"Location",
		"Mode",
		"Comment",
		"Unit",
		"Name",
		"P",
	];

	return (
		<div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
			<h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">
				Water Resistivity Input Parameters
			</h2>
			<form
				onSubmit={handleSubmit}
				className="flex-grow flex flex-col min-h-0">
				<div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
					<p className="text-sm font-medium text-gray-700">
						Well: {selectedWells.join(", ")} / Active Selection:{" "}
						{activeSelection.length} selected
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
									{tableHeaders.map((header) => (
										<th
											key={header}
											className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">
											{header}
										</th>
									))}
									{activeSelection.map((header) => (
										<th
											key={header}
											className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">
											{header}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{parameters.map((param) => (
									<tr
										key={param.id}
										className={`border-b ${getRowBgColor(
											param.location,
											param.mode
										)}`}>
										<td className="px-3 py-2 border-r text-center">
											{param.id}
										</td>
										<td className="px-3 py-2 border-r">{param.location}</td>
										<td className="px-3 py-2 border-r">{param.mode}</td>
										<td className="px-3 py-2 border-r">{param.comment}</td>
										<td className="px-3 py-2 border-r">{param.unit}</td>
										<td className="px-3 py-2 border-r font-semibold">
											{param.name}
										</td>
										<td className="px-3 py-2 border-r text-center">
											<input
												type="checkbox"
												checked={!!rowSync[param.id]}
												onChange={(e) =>
													handleRowToggle(param.id, e.target.checked)
												}
											/>
										</td>

										{activeSelection.map((key) => {
											const currentValue = param.values[key] ?? "";
											const isLogInput =
												param.location === "Log" && param.mode === "Input";

											// BARU: Kondisi spesifik untuk dropdown OPT_INDO
											if (param.name === "OPT_INDO") {
												return (
													<td
														key={`${param.id}-${key}`}
														className="px-3 py-2 border-r bg-white text-black">
														<select
															value={String(currentValue)}
															onChange={(e) =>
																handleValueChange(param.id, key, e.target.value)
															}
															className="w-full p-1 bg-white"
															disabled={!param.isEnabled}>
															<option value="RWA_FULL">FULL</option>
															<option value="RWA_SIMPLE">SIMPLE</option>
															<option value="RWA_TAR_SAND">TAR_SAND</option>
														</select>
													</td>
												);
											}

											let options: string[] = [];
											if (isLogInput) {
												switch (param.name) {
													case "RT":
														options = rtOptions;
														break;
													case "PHIE":
														options = phieOptions;
														break;
													case "VSH":
														options = vshOptions;
														break;
													case "FTEMP":
														options = ftempOptions;
														break;
													default:
														options = [];
												}
											}

											return (
												<td
													key={`${param.id}-${key}`}
													className="px-3 py-2 border-r bg-white text-black">
													{isLogInput ? (
														<select
															value={String(currentValue)}
															onChange={(e) =>
																handleValueChange(param.id, key, e.target.value)
															}
															className="w-full p-1 bg-white"
															disabled={!param.isEnabled}>
															{!options.includes(String(currentValue)) && (
																<option value={String(currentValue)}>
																	{String(currentValue)}
																</option>
															)}
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
																handleValueChange(param.id, key, e.target.value)
															}
															className="w-full p-1 bg-white"
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
