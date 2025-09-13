// src/components/layout/DirectorySidebar.tsx

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
	Folder,
	File,
	ChevronRight,
	ChevronDown,
	Database,
	Loader2,
	Check,
} from "lucide-react";
import { PlotType, useDashboard } from "@/contexts/DashboardContext";
import { useAppDataStore } from "@/stores/useAppDataStore";

interface WellFolder {
	name: string;
	type: "folder";
	file_count: number;
	path: string;
}

interface WellFile {
	name: string;
	type: "file";
	extension: string;
	size_bytes: number;
	path: string;
}

interface FoldersResponse {
	field_name: string;
	structure_name: string;
	folder_names: string[];
	csv_files: string[];
	total_folders: number;
	total_csv_files: number;
	structure_path: string;
}

interface FilesResponse {
	field_name: string;
	structure_name: string;
	well_folder: string;
	well_path: string;
	csv_files: string[];
	total_csv_files: number;
	total_files: number;
	csv_files_details: WellFile[];
}

export default function DirectorySidebar() {
	// Hardcoded structure info - you can make this dynamic later
	const FIELD_NAME = "adera";
	const STRUCTURE_NAME = "benuang";

	const {
		plotType,
		setPlotType,
		setSelectedFilePath,
		selectedFilePath,
		fetchPlotData,
		selectedWells,
		toggleWellSelection,
		setPlotFigure,
		selectedCustomColumns,
		toggleCustomColumn,
		wellColumns,
		columnError,
		fetchWellColumns,
		isLoadingPlot,
	} = useDashboard();
	const { wellsDir } = useAppDataStore();
	const [currentFolder, setCurrentFolder] = useState<string | null>(null);
	const [wellFolders, setWellFolders] = useState<WellFolder[]>([]);
	const [files, setFiles] = useState<WellFile[]>([]);
	const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
	const [loadingFolders, setLoadingFolders] = useState(true);
	const [loadingFiles, setLoadingFiles] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (selectedWells.length > 0) {
			const wellNamesOnly = selectedWells.map((well) =>
				well.replace(/\.csv$/, "")
			);
			fetchWellColumns(wellNamesOnly);
		}
	}, [selectedWells, fetchWellColumns]);

	// Load well folders on component mount
	useEffect(() => {
		const loadWellFolders = async () => {
			setLoadingFolders(true);
			setError(null);

			console.log(`Loading well folders for: ${FIELD_NAME}/${STRUCTURE_NAME}`);
			console.log(
				`Full request URL: /api/structure-folders/${FIELD_NAME}/${STRUCTURE_NAME}`
			);

			try {
				// Use internal API route instead of direct backend call
				const response = await fetch(
					`/api/structure-folders/${FIELD_NAME}/${STRUCTURE_NAME}`
				);
				console.log(
					`Response status: ${response.status} ${response.statusText}`
				);

				if (!response.ok) {
					// Try to get more detailed error information from the response
					let errorMessage = `Failed to load folders: ${response.status} ${response.statusText}`;
					try {
						const errorText = await response.text();
						if (errorText) {
							errorMessage += ` - ${errorText}`;
							console.error("API error response:", errorText);
							
							// Check if we got an HTML error page
							if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
								errorMessage = 'Backend service unavailable - received HTML error page';
							}
						}
					} catch (parseErr) {
						console.error("Could not parse error response:", parseErr);
					}
					throw new Error(errorMessage);
				}

				const data: FoldersResponse = await response.json();
				console.log("Folders data received:", data);

				// Convert folder_names to WellFolder objects to match our component state
				const folderObjects: WellFolder[] = data.folder_names.map(
					(folderName) => ({
						name: folderName,
						type: "folder" as const,
						file_count: 0, // Backend doesn't provide this, we'll set to 0
						path: `${data.structure_path}/${folderName}`,
					})
				);

				setWellFolders(folderObjects);
			} catch (err) {
				console.error("Error loading well folders:", err);
				let errorMessage = err instanceof Error ? err.message : "Failed to load folders";
				
				// Check for specific parsing errors
				if (err instanceof Error && err.message.includes('Unexpected token')) {
					errorMessage = 'Backend returned invalid response - possibly HTML error page';
				}
				
				setError(errorMessage);
				setWellFolders([]);
			} finally {
				setLoadingFolders(false);
			}
		};

		loadWellFolders();
	}, [wellsDir]); // Remove apiUrl dependency

	// Load files when folder is selected
	useEffect(() => {
		if (currentFolder) {
			const loadFiles = async () => {
				setLoadingFiles(true);
				setError(null);

				console.log(`Loading files for folder: ${currentFolder}`);
				console.log(
					`Full request URL: /api/well-folder-files/${FIELD_NAME}/${STRUCTURE_NAME}/${currentFolder}`
				);

				try {
					// Use internal API route instead of direct backend call
					const response = await fetch(
						`/api/well-folder-files/${FIELD_NAME}/${STRUCTURE_NAME}/${currentFolder}`
					);
					console.log(
						`Files response status: ${response.status} ${response.statusText}`
					);

					if (!response.ok) {
						let errorMessage = `Failed to load files: ${response.status} ${response.statusText}`;
						try {
							const errorText = await response.text();
							if (errorText) {
								errorMessage += ` - ${errorText}`;
								console.error("API error response:", errorText);
								
								// Check if we got an HTML error page
								if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
									errorMessage = 'Backend service unavailable - received HTML error page';
								}
							}
						} catch (parseErr) {
							console.error("Could not parse error response:", parseErr);
						}
						throw new Error(errorMessage);
					}

					const data: FilesResponse = await response.json();
					console.log("Files data received:", data);

					// Use only csv_files_details since we only get CSV files now
					setFiles(data.csv_files_details);
				} catch (err) {
					console.error("Error loading files:", err);
					let errorMessage = err instanceof Error ? err.message : "Failed to load files";
					
					// Check for specific parsing errors
					if (err instanceof Error && err.message.includes('Unexpected token')) {
						errorMessage = 'Backend returned invalid response - possibly HTML error page';
					}
					
					setError(errorMessage);
					setFiles([]);
				} finally {
					setLoadingFiles(false);
				}
			};

			loadFiles();
		} else {
			setFiles([]);
		}
	}, [currentFolder]);

	// In DirectorySidebar.tsx

	const commonColumnsResult = useMemo(() => {
		if (selectedWells.length === 0) {
			return { isLoading: false, columns: [] };
		}

		const getCleanKey = (path: string): string => {
			// 1. Normalize backslashes to forward slashes
			const normalizedPath = path.replace(/\\/g, "/");
			// 2. Get just the filename part
			let filename = normalizedPath.split("/").pop() || "";
			// 3. Remove any existing .csv extension (case-insensitive) to prevent doubles
			filename = filename.replace(/\.csv$/i, "");
			// 4. Convert to lowercase and add the correct extension
			return `${filename.toLowerCase()}.csv`;
		};

		// 1. Check if we have column data for all selected wells using the clean key
		for (const wellPath of selectedWells) {
			const cleanKey = getCleanKey(wellPath);
			if (!wellColumns[cleanKey]) {
				console.log(`Still waiting for columns for key: ${cleanKey}`);
				return { isLoading: true, columns: [] };
			}
		}

		// 2. CORRECTLY find the intersection using the clean key
		const firstWellKey = getCleanKey(selectedWells[0]);
		const firstWellCols = wellColumns[firstWellKey] || [];

		const intersection = selectedWells.slice(1).reduce((acc, wellPath) => {
			const currentWellKey = getCleanKey(wellPath);
			const currentWellCols = wellColumns[currentWellKey];
			if (Array.isArray(currentWellCols)) {
				return acc.filter((column) => currentWellCols.includes(column));
			}
			return acc;
		}, [...firstWellCols]);

		// --- Your column processing logic (NPHI_RHOB, etc.) remains the same ---
		let processedColumns = [...intersection];

		const hasNphi = processedColumns.includes("NPHI");
		const hasRhob = processedColumns.includes("RHOB");
		if (hasNphi && hasRhob) {
			processedColumns = processedColumns.filter(
				(col) => col !== "NPHI" && col !== "RHOB"
			);
			processedColumns.push("NPHI_RHOB");
		}

		const hasPhie = processedColumns.includes("PHIE");
		const hasPhit = processedColumns.includes("PHIT");
		if (hasPhie && hasPhit) {
			processedColumns = processedColumns.filter(
				(col) => col !== "PHIE" && col !== "PHIT"
			);
			processedColumns.push("PHIE", "PHIE_PHIT");
		}

		const hasPhieZ4 = processedColumns.includes("PHIE_Z4");
		const hasPhitZ4 = processedColumns.includes("PHIT_Z4");
		if (hasPhieZ4 && hasPhitZ4) {
			processedColumns = processedColumns.filter(
				(col) => col !== "PHIE_Z4" && col !== "PHIT_Z4"
			);
			processedColumns.push("PHIE_Z4", "PHIE_PHIT_Z4");
		}

		const hasRt = processedColumns.includes("RT");
		const hasRgsa = processedColumns.includes("RGSA");
		if (hasRt && hasRgsa) {
			processedColumns = processedColumns.filter(
				(col) => col !== "RT" && col !== "RGSA"
			);
			processedColumns.push("RT", "RT_RGSA");
		}

		processedColumns = processedColumns.filter((col) => col !== "DEPTH").sort();

		console.log(`Is Loading FALSE on columns well with well columns: ${wellColumns}`);
		return { isLoading: false, columns: processedColumns };
	}, [selectedWells, wellColumns, selectedFilePath]);

	const handleFolderSelect = (folderName: string) => {
		if (currentFolder === folderName) {
			// Deselect if clicking the same folder
			setCurrentFolder(null);
			setSelectedFiles([]);
		} else {
			setCurrentFolder(folderName);
			setSelectedFiles([]);
		}
	};

	// const handleFileSelect = async (file: WellFile) => {
	// 	const filePath = file.path;

	// 	// Update selected files state (UI)
	// 	const newSelectedFiles = selectedFiles.includes(filePath)
	// 		? selectedFiles.filter((path) => path !== filePath)
	// 		: [...selectedFiles, filePath];

	// 	setSelectedFiles(newSelectedFiles);

	// 	// --- PERBAIKAN UTAMA ---
	// 	// Daripada mengirim nama file saja, kita kirim path relatif lengkap.
	// 	// Ini memberikan informasi yang dibutuhkan backend.
	// 	// `selectedWells` di context sekarang akan berisi path seperti:
	// 	// "data/structures/adera/benuang/BNG-057/bng-57_lwd_8_5_trim.csv"
	// 	toggleWellSelection(filePath);

	// 	// Jika file baru saja dipilih (bukan dibatalkan), lanjutkan untuk memuat plot
	// 	if (newSelectedFiles.includes(filePath) && file.extension === ".csv") {
	// 		console.log(`File selected with full path: ${filePath}`);

	// 		const isSpliced = file.name.toLowerCase().includes("spliced");
	// 		const newPlotType = isSpliced ? "splicing" : "get-module1-plot";

	// 		setPlotType(newPlotType);
	// 		setSelectedFilePath(filePath);
	// 		setPlotFigure({ data: [], layout: {} });

	// 		// Trigger plot generation
	// 		try {
	// 			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
	// 			const fullUrl = `${apiUrl}/api/${
	// 				isSpliced ? "get-splicing-plot" : "get-module1-plot"
	// 			}`;
	// 			const requestBody = { file_path: filePath };

	// 			const response = await fetch(fullUrl, {
	// 				method: "POST",
	// 				headers: { "Content-Type": "application/json" },
	// 				body: JSON.stringify(requestBody),
	// 			});

	// 			if (!response.ok) {
	// 				const errorText = await response.text();
	// 				throw new Error(
	// 					`Failed to get plot: ${response.status} - ${errorText}`
	// 				);
	// 			}

	// 			const plotData = await response.json();
	// 			const parsedPlotData =
	// 				typeof plotData === "string" ? JSON.parse(plotData) : plotData;

	// 			if (parsedPlotData && (parsedPlotData.data || parsedPlotData.layout)) {
	// 				setPlotFigure({
	// 					data: parsedPlotData.data || [],
	// 					layout: parsedPlotData.layout || {},
	// 				});
	// 			} else {
	// 				throw new Error("Invalid plot data structure received");
	// 			}
	// 		} catch (error) {
	// 			console.error("Error processing plot:", error);
	// 			setError(
	// 				error instanceof Error ? error.message : "Failed to process plot data"
	// 			);
	// 		}
	// 	}
	// };

	const handleFileSelect = async (file: WellFile) => {
		const filePath = file.path;

		// Update selected files state (UI)
		const newSelectedFiles = selectedFiles.includes(filePath)
			? selectedFiles.filter((path) => path !== filePath)
			: [...selectedFiles, filePath];

		setSelectedFiles(newSelectedFiles);

		// Toggle well selection in context
		toggleWellSelection(filePath);

		// Check if file is spliced to determine plot type
		if (newSelectedFiles.includes(filePath) && file.extension === ".csv") {
			console.log(`File selected with full path: ${filePath}`);
			const isSpliced = file.name.toLowerCase().includes("spliced");
			const newPlotType = isSpliced ? "splicing" : "get-module1-plot";

			setPlotType(newPlotType);
			setSelectedFilePath(filePath);

			// Clear existing plot but don't generate new one
			setPlotFigure({ data: [], layout: {} });
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

	// const handleSelectAllFiles = () => {
	// 	if (selectedFiles.length === files.length) {
	// 		// Deselect all files
	// 		setSelectedFiles([]);
	// 		// Clear wells from selection one by one using toggleWellSelection
	// 		files.forEach((file) => {
	// 			const wellName = file.name.replace(/\.[^/.]+$/, "");
	// 			if (selectedWells.includes(wellName)) {
	// 				toggleWellSelection(wellName);
	// 			}
	// 		});
	// 	} else {
	// 		// Select all files
	// 		const allFilePaths = files.map((file) => file.path);
	// 		setSelectedFiles(allFilePaths);
	// 		// Add wells to selection one by one using toggleWellSelection
	// 		files.forEach((file) => {
	// 			const wellName = file.name.replace(/\.[^/.]+$/, "");
	// 			if (!selectedWells.includes(wellName)) {
	// 				toggleWellSelection(wellName);
	// 			}
	// 		});

	// 		// Trigger plot for the first CSV file if available
	// 		const firstCsvFile = files.find((file) => file.extension === ".csv");
	// 		if (firstCsvFile) {
	// 			console.log(`Select all - First CSV file: ${firstCsvFile.name}`);
	// 			console.log(
	// 				`Select all - Is spliced: ${firstCsvFile.name
	// 					.toLowerCase()
	// 					.includes("spliced")}`
	// 			);

	// 			// Check if file contains "spliced" to determine plot type
	// 			if (firstCsvFile.name.toLowerCase().includes("spliced")) {
	// 				console.log("Select all - Setting plot type to splicing");
	// 				setPlotType("splicing");
	// 			} else {
	// 				console.log("Select all - Setting plot type to get-module1-plot");
	// 				setPlotType("get-module1-plot");
	// 			}
	// 			setSelectedFilePath(firstCsvFile.path);

	// 			// Clear any existing plot data before loading new plot
	// 			setPlotFigure({ data: [], layout: {} });

	// 			// Call appropriate plot API for the first CSV
	// 			(async () => {
	// 				try {
	// 					const apiUrl = process.env.NEXT_PUBLIC_API_URL;
	// 					let endpoint;

	// 					// Determine API endpoint based on file name
	// 					if (firstCsvFile.name.toLowerCase().includes("spliced")) {
	// 						endpoint = `${apiUrl}/api/get-splicing-plot`;
	// 					} else {
	// 						endpoint = `${apiUrl}/api/get-module1-plot`;
	// 					}

	// 					const response = await fetch(endpoint, {
	// 						method: "POST",
	// 						headers: { "Content-Type": "application/json" },
	// 						body: JSON.stringify({ file_path: allFilePaths }),
	// 					});

	// 					if (response.ok) {
	// 						const plotData = await response.json();
	// 						const parsedPlotData =
	// 							typeof plotData === "string" ? JSON.parse(plotData) : plotData;

	// 						if (
	// 							parsedPlotData &&
	// 							(parsedPlotData.data || parsedPlotData.layout)
	// 						) {
	// 							setPlotFigure({
	// 								data: parsedPlotData.data || [],
	// 								layout: parsedPlotData.layout || {},
	// 							});
	// 						}
	// 					}
	// 				} catch (error) {
	// 					console.error("Error in select all plot generation:", error);
	// 				}
	// 			})();
	// 		}
	// 	}
	// };

	const handleSelectAllFiles = () => {
		if (selectedFiles.length === files.length) {
			// Deselect all files
			setSelectedFiles([]);
			// Clear wells from selection
			files.forEach((file) => {
				const wellName = file.name.replace(/\.[^/.]+$/, "");
				if (selectedWells.includes(wellName)) {
					toggleWellSelection(wellName);
				}
			});
		} else {
			// Select all files
			const allFilePaths = files.map((file) => file.path);
			setSelectedFiles(allFilePaths);
			// Add wells to selection
			files.forEach((file) => {
				const wellName = file.name.replace(/\.[^/.]+$/, "");
				if (!selectedWells.includes(wellName)) {
					toggleWellSelection(wellName);
				}
			});

			// Set plot type based on first CSV file but don't generate plot
			// const firstCsvFile = files.find((file) => file.extension === ".csv");
			// if (firstCsvFile) {
			// 	if (firstCsvFile.name.toLowerCase().includes("spliced")) {
			// 		setPlotType("splicing");
			// 	} else {
			// 		setPlotType("get-module1-plot");
			// 	}
			// 	setSelectedFilePath(firstCsvFile.path);
			// }

			// Clear any existing plot data
			// setPlotFigure({ data: [], layout: {} });
		}
	};

	const handleGeneratePlot = () => {
		fetchPlotData();
	};

	const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newPlotType = e.target.value as PlotType;
		setPlotType(newPlotType);
	};

	return (
		<aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-r border-gray-300 h-screen">
			{/* Header */}
			<div className="flex items-center gap-2 px-2 py-1">
				<Database className="w-4 h-4 text-gray-600" />
				<div className="text-xs font-bold text-gray-800">Wells Browser</div>
			</div>

			{/* Current Structure Info */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
				<div className="text-xs text-blue-700">
					<div className="font-semibold">{STRUCTURE_NAME}</div>
					<div className="text-blue-500">Field: {FIELD_NAME}</div>
				</div>
			</div>

			{/* Error Display */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-2">
					<div className="text-xs text-red-700 font-medium">Error:</div>
					<div className="text-xs text-red-600">{error}</div>
				</div>
			)}

			{/* Well Folders Section */}
			<div className="bg-white rounded-lg shadow-sm p-2">
				<h3 className="text-xs font-bold text-gray-700 mb-1">Well Folders</h3>
				<div className="space-y-1 max-h-40 overflow-y-auto">
					{loadingFolders ? (
						<div className="flex items-center gap-2 p-1">
							<Loader2 className="w-3 h-3 animate-spin text-gray-400" />
							<span className="text-xs text-gray-500">Loading...</span>
						</div>
					) : !wellFolders || wellFolders.length === 0 ? (
						<div className="text-xs text-gray-500 p-1">No folders found</div>
					) : (
						wellFolders.map((folder) => (
							<button
								key={folder.name}
								onClick={() => handleFolderSelect(folder.name)}
								className={`w-full flex items-center gap-2 p-1 text-xs rounded transition-colors duration-200 ${currentFolder === folder.name
									? "bg-green-100 text-green-800"
									: "hover:bg-gray-100 text-gray-700"
									}`}>
								<Folder className="w-3 h-3 text-yellow-500" />
								<span className="flex-1 text-left truncate">{folder.name}</span>
								{currentFolder === folder.name ? (
									<ChevronDown className="w-3 h-3" />
								) : (
									<ChevronRight className="w-3 h-3" />
								)}
							</button>
						))
					)}
				</div>
			</div>

			{/* Files Section */}
			{currentFolder && (
				<div className="bg-white rounded-lg shadow-sm p-2 flex-1 overflow-hidden">
					<h3 className="text-xs font-bold text-gray-700 mb-2">
						Files in {currentFolder}
					</h3>

					{/* Select All Checkbox - below title */}
					{files && files.length > 0 && (
						<div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
							<button
								onClick={handleSelectAllFiles}
								className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-200 ${selectedFiles.length === files.length && files.length > 0
									? "bg-blue-500 border-blue-500 text-white"
									: selectedFiles.length > 0
										? "bg-blue-200 border-blue-400 text-blue-700"
										: "border-gray-300 hover:border-blue-400"
									}`}
								title={
									selectedFiles.length === files.length
										? "Deselect All"
										: "Select All"
								}>
								{selectedFiles.length === files.length && files.length > 0 && (
									<Check className="w-3 h-3" />
								)}
								{selectedFiles.length > 0 &&
									selectedFiles.length < files.length && (
										<div className="w-2 h-2 bg-blue-700 rounded-sm" />
									)}
							</button>
							<span
								className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
								onClick={handleSelectAllFiles}>
								{selectedFiles.length === files.length
									? "Deselect All"
									: "Select All"}
							</span>
						</div>
					)}

					<div className="space-y-1 overflow-y-auto flex-1">
						{loadingFiles ? (
							<div className="flex items-center gap-2 p-1">
								<Loader2 className="w-3 h-3 animate-spin text-gray-400" />
								<span className="text-xs text-gray-500">Loading...</span>
							</div>
						) : !files || files.length === 0 ? (
							<div className="text-xs text-gray-500 p-1">No files found</div>
						) : (
							files.map((file) => {
								const isSelected = selectedFiles.includes(file.path);

								return (
									<div
										key={file.path}
										className="space-y-0.5">
										<div
											className={`w-full flex items-center gap-2 p-1 text-xs rounded transition-colors duration-200 ${isSelected
												? "bg-blue-100 text-blue-800 border border-blue-300"
												: "hover:bg-gray-100 text-gray-700 border border-transparent"
												}`}
											title={file.path}>
											{/* Checkbox */}
											<button
												onClick={() => handleFileSelect(file)}
												className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-200 ${isSelected
													? "bg-blue-500 border-blue-500 text-white"
													: "border-gray-300 hover:border-blue-400"
													}`}>
												{isSelected && <Check className="w-3 h-3" />}
											</button>

											{/* File icon and name */}
											<File
												className={`w-3 h-3 flex-shrink-0 ${file.extension === ".csv"
													? "text-blue-500"
													: "text-gray-500"
													}`}
											/>
											<span className="flex-1 text-left truncate">
												{file.name}
											</span>
										</div>
									</div>
								);
							})
						)}
					</div>

					{/* Selected Files Count */}
					{selectedFiles && selectedFiles.length > 0 && (
						<div className="mt-2 pt-2 border-t border-gray-200">
							<div className="text-xs text-blue-600 font-medium">
								{selectedFiles.length} file
								{selectedFiles.length !== 1 ? "s" : ""} selected
							</div>
						</div>
					)}
				</div>
			)}
			<div className="bg-white rounded-lg shadow-sm p-2 mt-auto">
				<h3 className="text-xs font-bold text-gray-700 mb-2">Display</h3>
				<div className="flex flex-col gap-2">
					<div>
						<label className="text-xs text-gray-600 mb-1 block">
							Plot Layout
						</label>
						<select
							value={plotType}
							onChange={handleLayoutChange}
							className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500"
							disabled={!selectedFilePath} // Disable if no file is selected
						>
							<option value="default">Layout Default</option>
							<option value="custom">Layout Custom</option>
							<option value="trimming">Layout Trimming</option>
							<option value="depth-matching">Layout Depth Matching</option>
							<option value="fill-missing-prep">Layout Fill Missing</option>
							<option value="smoothing-prep">Layout Smoothing</option>
							<option value="normalization-prep">Layout Normalization</option>
							<option value="splicing">Layout Splicing</option>
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