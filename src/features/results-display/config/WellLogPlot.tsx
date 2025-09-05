"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useDashboard } from "@/contexts/DashboardContext";
import { Loader2 } from "lucide-react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function WellLogPlot() {
	const { plotFigure, plotHeaderFigure, isLoadingPlot, plotError } =
		useDashboard();

	// Bagian loading dan error tidak perlu diubah
	if (isLoadingPlot) {
		return (
			<div className="flex h-full w-full items-center justify-center text-gray-500">
				<Loader2 className="mr-2 h-8 w-8 animate-spin" />
				<span>Loading Plot from Server...</span>
			</div>
		);
	}

	if (plotError) {
		return (
			<div className="flex h-full w-full items-center justify-center p-4">
				<p className="text-center text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
					<strong>Error:</strong> {plotError}
				</p>
			</div>
		);
	}

	if (!plotFigure || !plotFigure.data || plotFigure.data.length === 0) {
		return (
			<div className="flex h-full w-full items-center justify-center text-center text-gray-500 p-4">
				<div>
					<h3 className="text-lg font-semibold">No Plot to Display</h3>
					<p className="text-sm mt-1">
						Please select a well or file from a sidebar to generate a plot.
					</p>
				</div>
			</div>
		);
	}

	// ✅ KODE PERBAIKAN UNTUK PLOT TINGGI PENUH TANPA SCROLLBAR INTERNAL
	return (
		// 1. Kontainer luar tanpa overflow hidden - biarkan parent handle scroll
		<div
			style={{
				border: "1px solid #ccc",
				width: "100%",
				backgroundColor: "white",
				display: "block",
				boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
				paddingTop: "10px",
				marginTop: "-10px",
				borderTop: "10px solid white",
			}}>
			{/* Header Plot - Sticky dengan exact margin match */}
			{plotHeaderFigure && plotHeaderFigure.layout && (
				<div
					className="plot-header-container"
					style={{
						position: "sticky",
						top: 0,
						zIndex: 10,
						height: "150px",
						backgroundColor: "white",
						borderBottom: "1px solid #eee", // Subtle separator
					}}>
					<Plot
						data={plotHeaderFigure.data}
						layout={{
							...plotHeaderFigure.layout,
							// Exact margin copy dari plotFigure
							margin: {
								...plotFigure.layout?.margin, // Copy exact margins
								b: 1, // Small bottom margin
								l: 38,
							},
							// Background plot putih
							plot_bgcolor: "white",
							paper_bgcolor: "white",
						}}
						style={{ width: "100%", height: "100%", backgroundColor: "white" }}
						config={{
							responsive: true,
							displaylogo: false,
							displayModeBar: false,
						}}
					/>
				</div>
			)}

			{/* Plot Utama - Full height, no internal scroll */}
			<div
				className="plot-main-container"
				style={{
					height: plotFigure.layout?.height || "3000px",
					backgroundColor: "white",
					minHeight: "2000px",
				}}>
				<Plot
					data={plotFigure.data}
					layout={{
						...plotFigure.layout,
						margin: {
							...plotFigure.layout?.margin,
							t: plotHeaderFigure ? 10 : plotFigure.layout?.margin?.t,
						},
						height: undefined, // Let container define height
						autosize: true,
						plot_bgcolor: "white",
						paper_bgcolor: "white",
					}}
					style={{
						width: "100%",
						height: "100%",
						backgroundColor: "white",
					}}
					config={{
						responsive: true,
						displaylogo: false,
						displayModeBar: false,
						// Disable internal scrolling
						scrollZoom: false,
					}}
					useResizeHandler={true} // Enable resize handling
				/>
			</div>
		</div>
	);
}
