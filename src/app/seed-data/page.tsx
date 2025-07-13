'use client';

import React, { useState, ChangeEvent } from 'react';

export default function SeedDataPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedFile) {
            setError('Please select a ZIP file to upload.');
            return;
        }

        setIsUploading(true);
        setMessage('');
        setError('');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const endpoint = `${apiUrl}/api/seed-data-volume`;

            const response = await fetch(endpoint, {
                method: 'POST',
                // This is the simple security check from the backend
                headers: {
                    'X-Seed-Auth': 'your-secret-key-123',
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred.');
            }

            setMessage(result.message);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
            <h1>Seed Persistent Volume</h1>
            <p>This page is for one-time use to upload the initial initial_data.zip file to the backends persistent storage.</p>

            <form onSubmit={handleSubmit}>
                <div style={{ margin: '20px 0' }}>
                    <label htmlFor="file-upload" style={{ display: 'block', marginBottom: '8px' }}>
                        Select initial_data.zip:
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".zip"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
                >
                    {isUploading ? 'Uploading...' : 'Upload and Seed Volume'}
                </button>
            </form>

            {message && <p style={{ color: 'green', marginTop: '20px' }}>Success: {message}</p>}
            {error && <p style={{ color: 'red', marginTop: '20px' }}>Error: {error}</p>}
        </div>
    );
}