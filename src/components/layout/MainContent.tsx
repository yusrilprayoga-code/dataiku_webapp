// src/components/layout/MainContent.tsx

"use client";
import React from "react";

export default function MainContent({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="flex-1 relative overflow-y-auto p-4 min-h-screen bg-white">
			{children}
		</main>
	);
}
