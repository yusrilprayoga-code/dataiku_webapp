"use client";

import { PlotType, useDashboard } from "@/contexts/DashboardContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

export default function LeftSidebar() {
	const {
		availableWells,
		selectedWells,
		toggleWellSelection,
		availableIntervals,
		selectedIntervals,
		toggleInterval,
		availableZones,
		selectedZones,
		toggleZone,
		wellColumns,
		plotType,
		setPlotType,
		selectedCustomColumns,
		toggleCustomColumn,
		fetchPlotData,
		isLoadingPlot,
		columnError,
	} = useDashboard();

	const [isMounted, setIsMounted] = useState(false);
	const [intervalType, setIntervalType] = useState<"markers" | "zones">(
		"markers"
	);
	const [selectedCrossplot, setSelectedCrossplot] = useState("");
	const router = useRouter();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const commonColumnsResult = useMemo(() => {
		if (selectedWells.length === 0) {
			return { isLoading: false, columns: [] };
		}

		// Check if we have column data for all selected wells
		for (const wellName of selectedWells) {
			if (!wellColumns[`${wellName}.csv`]) {
				return { isLoading: true, columns: [] };
			}
		}

		// All well columns are loaded, now find the intersection
		const firstWellCols = [...wellColumns[`${selectedWells[0]}.csv`]];

		const intersection = selectedWells.slice(1).reduce((acc, wellName) => {
			const currentWellCols = wellColumns[`${wellName}.csv`];
			return acc.filter((column) => currentWellCols.includes(column));
		}, firstWellCols);

		// --- NEW LOGIC TO PROCESS THE COLUMN LIST ---

		// 1. Create a mutable copy of the common columns
		let processedColumns = [...intersection];

		const hasNPHI = processedColumns.includes("NPHI");
		const hasNGSA = processedColumns.includes("NGSA");
		if (hasNPHI && hasNGSA) {
			// Remove original NPHI and NGSA to avoid duplicates
			processedColumns = processedColumns.filter(
				(col) => col !== "NPHI" && col !== "NGSA"
			);
			// Add the specific required items for the plot sequence
			processedColumns.push("NPHI", "NPHI_NGSA");
		}

		const hasRHOB = processedColumns.includes("RHOB");
		const hasDGSA = processedColumns.includes("DGSA");
		if (hasRHOB && hasDGSA) {
			// Remove original RHOB and DGSA to avoid duplicates
			processedColumns = processedColumns.filter(
				(col) => col !== "RHOB" && col !== "DGSA"
			);
			// Add the specific required items for the plot sequence
			processedColumns.push("RHOB", "RHOB_DGSA");
		}

		// 2. Check if both 'NPHI' and 'RHOB' are present
		const hasNphi = processedColumns.includes("NPHI");
		const hasRhob = processedColumns.includes("RHOB");

		// 3. If both exist, filter them out and add the merged 'NPHI_RHOB'
		if (hasNphi && hasRhob) {
			processedColumns = processedColumns.filter(
				(col) => col !== "NPHI" && col !== "RHOB"
			);
			processedColumns.push("NPHI_RHOB");
		}

		// 3. Handle PHIE/PHIT special sequence
		const hasPhie = processedColumns.includes("PHIE");
		const hasPhit = processedColumns.includes("PHIT");
		if (hasPhie && hasPhit) {
			// Remove original PHIE and PHIT to avoid duplicates
			processedColumns = processedColumns.filter(
				(col) => col !== "PHIE" && col !== "PHIT"
			);
			// Add the specific required items for the plot sequence
			processedColumns.push("PHIE", "PHIE_PHIT");
		}

		// 3. Handle PHIE/PHIT special sequence
		const hasPhieZ4 = processedColumns.includes("PHIE_Z4");
		const hasPhitZ4 = processedColumns.includes("PHIT_Z4");
		if (hasPhieZ4 && hasPhitZ4) {
			// Remove original PHIE and PHIT to avoid duplicates
			processedColumns = processedColumns.filter(
				(col) => col !== "PHIE_Z4" && col !== "PHIT_Z4"
			);
			// Add the specific required items for the plot sequence
			processedColumns.push("PHIE_Z4", "PHIE_PHIT_Z4");
		}

		// 3. Handle PHIE/PHIT special sequence
		const hasRt = processedColumns.includes("RT");
		const hasRgsa = processedColumns.includes("RGSA");
		if (hasRt && hasRgsa) {
			// Remove original RT and RGSA to avoid duplicates
			processedColumns = processedColumns.filter(
				(col) => col !== "RT" && col !== "RGSA"
			);
			// Add the specific required items for the plot sequence
			processedColumns.push("RT", "RT_RGSA");
		}

		// 5. Finally, filter out 'DEPTH' from the list, then sort it
		processedColumns = processedColumns.filter((col) => col !== "DEPTH").sort();

		return { isLoading: false, columns: processedColumns };
	}, [selectedWells, wellColumns]);

	const handleGeneratePlot = () => {
		fetchPlotData();
	};

	const handleSelectAllWells = (checked: boolean) => {
		if (checked) {
			availableWells.forEach((well) => {
				if (!selectedWells.includes(well)) toggleWellSelection(well);
			});
		} else {
			selectedWells.forEach((well) => toggleWellSelection(well));
		}
	};

	const handleSelectAllIntervals = (checked: boolean) => {
		const action = (
			item: string,
			isSelected: boolean,
			toggleFunc: (i: string) => void
		) => {
			if (checked && !isSelected) toggleFunc(item);
			if (!checked && isSelected) toggleFunc(item);
		};

		if (intervalType === "markers") {
			availableIntervals.forEach((interval) =>
				action(interval, selectedIntervals.includes(interval), toggleInterval)
			);
		} else {
			availableZones.forEach((zone) =>
				action(zone, selectedZones.includes(zone), toggleZone)
			);
		}
	};

	const handleSelectAllCustomColumns = (checked: boolean) => {
		if (checked) {
			commonColumnsResult.columns.forEach((col) => {
				if (!selectedCustomColumns.includes(col)) toggleCustomColumn(col);
			});
		} else {
			selectedCustomColumns.forEach((col) => toggleCustomColumn(col));
		}
	};

	const handleIntervalTypeChange = (type: "markers" | "zones") => {
		setIntervalType(type);
		if (type === "zones") {
			selectedIntervals.forEach((interval) => toggleInterval(interval));
		} else {
			selectedZones.forEach((zone) => toggleZone(zone));
		}
	};

	const crossplotOptions = [
		{ label: "Pilih Crossplot...", value: "" },
		{ label: "Crossplot GR vs NPHI", value: "GR-NPHI" },
		{ label: "Crossplot GR vs RHOB", value: "GR-RHOB" },
		{ label: "Crossplot RHOB vs NPHI", value: "RHOB-NPHI" },
		{ label: "Crossplot RT vs GR", value: "RT-GR" },
		{ label: "Crossplot PHIE vs VSH", value: "PHIE-VSH" },
		{ label: "Crossplot SW vs PHIE", value: "SW-PHIE" },
	];

	const handleCrossplotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value;
		setSelectedCrossplot(value); // 1. Update state dengan pilihan baru

		if (!value) return; // 2. Hentikan jika memilih opsi default

		// 3. Lakukan navigasi seperti biasa
		const [yCol, xCol] = value.split("-");
		router.push(`/dashboard/modules/crossplot?y=${yCol}&x=${xCol}`);
	};

	return (
		<aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-r border-gray-300 h-screen">
			<div className="flex flex-col h-full gap-2">
				<div className="text-xs font-bold text-gray-800 px-2 py-1">
					Data Selection
				</div>

				{/* Well Data Section */}
				<div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
					<div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
						<input
							type="checkbox"
							className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
							checked={
								isMounted &&
								availableWells.length > 0 &&
								selectedWells.length === availableWells.length
							}
							onChange={(e) => handleSelectAllWells(e.target.checked)}
						/>
						<h3 className="text-xs font-bold text-gray-700">Wells</h3>
						<span className="text-xs text-gray-500 ml-auto">
							{selectedWells.length}/{availableWells.length}
						</span>
					</div>
					<div className="overflow-y-auto max-h-48 p-1">
						<div className="flex flex-col gap-0.5">
							{isMounted ? (
								availableWells.map((well) => (
									<label
										key={well}
										className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
										<input
											type="checkbox"
											className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
											checked={selectedWells.includes(well)}
											onChange={() => toggleWellSelection(well)}
										/>
										<span className="truncate">{well}</span>
									</label>
								))
							) : (
								<div>Loading...</div>
							)}
						</div>
					</div>
				</div>

				{/* Intervals Section */}
				<div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
					<div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
						<input
							type="checkbox"
							className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
							checked={
								isMounted &&
								(intervalType === "markers"
									? availableIntervals.length > 0 &&
									  selectedIntervals.length === availableIntervals.length
									: availableZones.length > 0 &&
									  selectedZones.length === availableZones.length)
							}
							onChange={(e) => handleSelectAllIntervals(e.target.checked)}
						/>
						<h3 className="text-xs font-bold text-gray-700">
							{intervalType === "markers" ? "Markers" : "Zones"}
						</h3>
						<span className="text-xs text-gray-500 ml-auto">
							{intervalType === "markers"
								? `${selectedIntervals.length}/${availableIntervals.length}`
								: `${selectedZones.length}/${availableZones.length}`}
						</span>
					</div>
					<div className="flex bg-gray-50 border-b">
						<button
							type="button"
							onClick={() => handleIntervalTypeChange("markers")}
							className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
								intervalType === "markers"
									? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
									: "text-gray-600 hover:text-gray-800"
							}`}>
							Markers
						</button>
						<button
							type="button"
							onClick={() => handleIntervalTypeChange("zones")}
							className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
								intervalType === "zones"
									? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
									: "text-gray-600 hover:text-gray-800"
							}`}>
							Zones
						</button>
					</div>
					<div className="overflow-y-auto p-1 max-h-32">
						<div className="flex flex-col gap-0.5">
							{intervalType === "markers" ? (
								availableIntervals.map((interval) => (
									<label
										key={interval}
										className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
										<input
											type="checkbox"
											className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
											checked={selectedIntervals.includes(interval)}
											onChange={() => toggleInterval(interval)}
										/>
										<span className="truncate">{interval}</span>
									</label>
								))
							) : availableZones.length === 0 ? (
								<div className="flex items-center justify-center py-2 text-xs text-gray-500">
									No zones available
								</div>
							) : (
								availableZones.map((zone) => (
									<label
										key={zone}
										className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
										<input
											type="checkbox"
											className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
											checked={selectedZones.includes(zone)}
											onChange={() => toggleZone(zone)}
										/>
										<span className="truncate">{zone}</span>
									</label>
								))
							)}
						</div>
					</div>
				</div>

				<div className="flex-grow"></div>

				<div className="bg-white rounded-lg shadow-sm p-2 flex flex-col gap-2">
					<h3 className="text-xs font-bold text-gray-700">Display</h3>
					<div>
						<label className="text-xs text-gray-600 mb-1 block">
							Plot Layout
						</label>
						<select
							value={plotType}
							onChange={(e) => setPlotType(e.target.value as PlotType)}
							className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500">
							<option value="default">Layout Default</option>
							<option value="custom">Layout Custom</option>
							<option value="normalization">Layout Normalisasi</option>
							<option value="smoothing">Layout Smoothing</option>
							<option value="vsh">Layout VSH</option>
							<option value="porosity">Layout Porosity</option>
							<option value="sw">Layout SW</option>
							<option value="rwa">Layout RWA</option>
							<option value="module2">Layout Module 2</option>
							<option value="gsa">Layout GSA</option>
							<option value="rpbe-rgbe">Layout RPBE RGBE</option>
							<option value="iqual">Layout IQUAL</option>
							<option value="swgrad">Layout SWGRAD</option>
							<option value="dns-dnsv">Layout DNS-DNSV</option>
							<option value="rt-ro">Layout RT-RO</option>
							<option value="module3">Layout Module 3</option>
						</select>
					</div>

					{plotType === "custom" && (
						<div className="flex flex-col border border-gray-200 rounded-md">
							<div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
								<input
									type="checkbox"
									className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
									checked={
										!commonColumnsResult.isLoading &&
										commonColumnsResult.columns.length > 0 &&
										selectedCustomColumns.length ===
											commonColumnsResult.columns.length
									}
									onChange={(e) =>
										handleSelectAllCustomColumns(e.target.checked)
									}
									disabled={
										commonColumnsResult.isLoading ||
										commonColumnsResult.columns.length === 0
									}
								/>
								<h3 className="text-xs font-bold text-gray-700">
									Custom Curves
								</h3>
								<span className="text-xs text-gray-500 ml-auto">
									{!commonColumnsResult.isLoading &&
										`${selectedCustomColumns.length}/${commonColumnsResult.columns.length}`}
								</span>
							</div>
							<div className="overflow-y-auto max-h-60 p-1">
								{" "}
								{/* Increased max-h slightly */}
								{columnError ? (
									<div className="p-2 text-xs text-red-600 text-center break-words">
										{columnError}
									</div>
								) : commonColumnsResult.isLoading ? (
									<div className="p-2 text-xs text-gray-500 text-center">
										Loading curves...
									</div>
								) : commonColumnsResult.columns.length > 0 ? (
									commonColumnsResult.columns.map((col) => (
										<label
											key={col}
											className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
											<input
												type="checkbox"
												className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
												checked={selectedCustomColumns.includes(col)}
												onChange={() => toggleCustomColumn(col)}
											/>
											<span className="truncate">{col}</span>
										</label>
									))
								) : (
									<div className="p-2 text-xs text-gray-500 text-center">
										{selectedWells.length > 0
											? "No common curves found."
											: "Select wells first."}
									</div>
								)}
							</div>
						</div>
					)}

					<div>
						<label className="text-xs text-gray-600 mb-1 block">Analysis</label>
						<select
							value={selectedCrossplot} // <-- PERUBAHAN: Ikat nilai select ke state
							onChange={handleCrossplotChange}
							className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500">
							{crossplotOptions.map((opt) => (
								<option
									key={opt.value}
									value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<Link
						href="/dashboard/modules/histogram"
						className="text-xs w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-center font-medium hover:bg-gray-100 focus:ring-1 focus:ring-blue-500 transition-colors">
						Histogram
					</Link>

					{/* Generate Plot Button */}
					<button
						type="button"
						onClick={handleGeneratePlot}
						disabled={isLoadingPlot}
						className="mt-2 w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
						{isLoadingPlot ? (
							<>
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24">
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Loading...
							</>
						) : (
							"Generate Plot"
						)}
					</button>
				</div>
			</div>
		</aside>
	);
}
