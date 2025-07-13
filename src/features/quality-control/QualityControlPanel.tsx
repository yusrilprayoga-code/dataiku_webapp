/* eslint-disable @typescript-eslint/no-unused-vars */

// FILE 2: frontend/src/features/quality-control/QualityControlPanel.tsx
// Ini adalah FileUploadViewer.tsx Anda yang sudah ditingkatkan dengan logika QC
'use client';

import React, { useState, ChangeEvent } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { Loader2, PlayCircle, FileText, Folder, CheckCircle, Eye, Inbox, Upload, Trash2 } from 'lucide-react';

import { FileData, ParsedSubFile, ProcessedFileDataForDisplay, QcApiResponse, PreviewableFile, StagedStructure } from './types';
import { readFileAsArrayBuffer, readFileContent } from '../file_upload/utils/fileUtils';
import { parseCSVFile, parseLASFile, parseXLSXFileWithSheetJS } from '../file_upload/utils/fileParser';

// --- Komponen-komponen UI yang dipecah agar lebih rapi ---

const FileListPanel: React.FC<{
    files: FileData[],
    onFileSelect: (file: FileData) => void,
    selectedFileId: string | null
}> = ({ files, onFileSelect, selectedFileId }) => (
    <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
                <Inbox className="mx-auto w-12 h-12 mb-2" />
                <p>Upload file untuk memulai</p>
            </div>
        ) : (
            <ul className="divide-y divide-gray-200">
                {files.map(file => (
                    <li key={file.id} onClick={() => onFileSelect(file)}
                        className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${selectedFileId === file.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                        {file.isStructureFromZip ? <Folder className="w-5 h-5 text-yellow-500" /> : <FileText className="w-5 h-5 text-gray-500" />}
                        <span className="font-medium text-gray-800 truncate">{file.name}</span>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const FilePreviewPanel: React.FC<{
    file: FileData | ParsedSubFile | null,
    onSelectSubFile: (subFile: ParsedSubFile) => void,
    selectedSubFileId: string | null
}> = ({ file, onSelectSubFile, selectedSubFileId }) => {
    // ... (Logika untuk menampilkan preview file tunggal atau file di dalam ZIP)
    if (!file) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="text-center text-gray-400">
                    <Eye className="mx-auto w-16 h-16 mb-4" />
                    <h3 className="text-lg font-medium">No File Selected</h3>
                    <p>Pilih file dari daftar di kiri untuk melihat preview.</p>
                </div>
            </div>
        );
    }
    // Implementasi lebih detail untuk preview bisa ditambahkan di sini
    return <div className="flex-1 p-4 overflow-auto"><pre>{JSON.stringify(file.content?.slice(0, 10), null, 2)}</pre></div>;
};


// --- Komponen Utama ---
export default function QualityControlPanel() {
    const router = useRouter();
    const { setQcResults, setStagedStructure } = useAppDataStore();

    const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
    const [selectedSubFile, setSelectedSubFile] = useState<ParsedSubFile | null>(null);

    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processingMessage, setProcessingMessage] = useState<string>('');

    const [qcResponse, setQcResponse] = useState<QcApiResponse | null>(null);
    const [qcError, setQcError] = useState<string | null>(null);

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        // ... Logika handleFileUpload Anda yang sudah ada
    };

    const handleRunQc = async () => {
        if (uploadedFiles.length === 0) {
            alert("Silakan upload file terlebih dahulu.");
            return;
        }

        setIsProcessing(true);
        setQcError(null);
        setQcResponse(null);
        setProcessingMessage('Menyiapkan data untuk QC...');

        try {
            const filesToProcess = uploadedFiles.flatMap(fileData => {
                if (fileData.isStructureFromZip) {
                    const las = fileData.lasFiles?.map(f => ({ name: `${fileData.name}/${f.name}`, content: f.rawContentString })) || [];
                    const csv = fileData.csvFiles?.map(f => ({ name: `${fileData.name}/${f.name}`, content: f.rawContentString })) || [];
                    return [...las, ...csv];
                } else if (typeof fileData.rawFileContent === 'string') {
                    return [{ name: fileData.name, content: fileData.rawFileContent }];
                }
                return [];
            });

            if (filesToProcess.length === 0) throw new Error("Tidak ada file LAS atau CSV yang valid untuk diproses.");

            setProcessingMessage(`Menjalankan QC pada ${filesToProcess.length} file...`);

            const response = await fetch('/api/qc/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: filesToProcess }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: "Server error" }));
                throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
            }

            const results: QcApiResponse = await response.json();
            setQcResponse(results);
            setQcResults(results); // Simpan juga ke global store
            setProcessingMessage('Proses QC selesai!');
            setTimeout(() => setProcessingMessage(''), 3000);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tidak dikenal";
            setQcError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProceedToDashboard = () => {
        if (!qcResponse) {
            alert("Harap jalankan Quality Control terlebih dahulu.");
            return;
        }

        const structureName = window.prompt("Masukkan nama untuk struktur data yang sudah diproses ini:", "QC_Results_");
        if (!structureName) return;

        const filesForNextPage: ProcessedFileDataForDisplay[] = qcResponse.qc_summary
            .filter(summary => summary.status === 'PASS' || summary.status === 'HAS_NULL') // Contoh: hanya bawa file yang lulus atau punya null
            .map(summary => {
                const outputFilename = Object.keys(qcResponse.output_files).find(name => name.startsWith(summary.well_name));
                if (!outputFilename) return null;

                const fileContent = qcResponse.output_files[outputFilename];
                const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

                return {
                    id: `qc_${summary.well_name}`,
                    name: outputFilename,
                    type: 'csv',
                    content: parsed.data,
                    headers: parsed.meta.fields || [],
                    rawContentString: fileContent,
                };
            }).filter((file): file is ProcessedFileDataForDisplay => file !== null);

        const newStructure: StagedStructure = {
            userDefinedStructureName: structureName,
            files: filesForNextPage,
        };

        try {
            sessionStorage.setItem('processedQcData', JSON.stringify(newStructure));
            router.push('/dashboard/plot-display');
        } catch (e) {
            alert("Gagal mempersiapkan data untuk halaman berikutnya.");
            console.error(e);
        }
    };


    return (
        <div className="p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">QC Control Panel</h2>

            {/* Area Tombol Aksi Utama */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={handleRunQc}
                    disabled={isProcessing || uploadedFiles.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                    {isProcessing ? processingMessage : '1. Jalankan Quality Control'}
                </button>
                <button
                    onClick={handleProceedToDashboard}
                    disabled={isProcessing || !qcResponse}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                    2. Lanjutkan ke Dasbor
                </button>
            </div>

            {/* Area Tampilan Hasil */}
            {qcError && (
                <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
                    <strong>Error:</strong> {qcError}
                </div>
            )}

            {qcResponse && (
                <div className="mt-6">
                    <h3 className="font-bold text-xl text-gray-700 mb-3">Hasil QC</h3>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Nama Sumur</th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Detail</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {qcResponse.qc_summary.map((item) => (
                                    <tr key={item.well_name} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium">{item.well_name}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${item.status === 'PASS' ? 'bg-green-100 text-green-800' :
                                                item.status.includes('ERROR') || item.status.includes('MISSING') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{item.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sisipkan komponen FileUploadViewer lama Anda di sini jika masih diperlukan */}
            {/* Untuk sekarang, kita fokus pada fungsionalitas QC */}
        </div>
    );
}