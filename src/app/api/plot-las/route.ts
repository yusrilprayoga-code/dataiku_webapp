// src/app/api/plot-las/route.ts

import { NextResponse } from 'next/server';

interface LASPlotRequest {
  file_path: string;
  sequence: string[];
  title: string;
}

export async function POST(request: Request) {
  try {
    const body: LASPlotRequest = await request.json();
    const { file_path, sequence, title } = body;
    
    if (!file_path) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Get backend API URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend API URL is not configured' },
        { status: 500 }
      );
    }

    // Make request to backend server
    const backendEndpoint = `${backendUrl}/api/plot-las`;
    
    try {
      console.log(`Requesting plot from backend: ${backendEndpoint}`);
      console.log('Request payload:', { file_path, sequence, title });
      
      const response = await fetch(backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path,
          sequence,
          title
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Backend responded with status: ${response.status} - ${errorData}`);
      }

      const backendData = await response.json();
      
      // Forward the backend response directly
      console.log('Plot data received from backend');
      return NextResponse.json(backendData);
      
    } catch (err) {
      console.error('Error fetching plot from backend:', err);
      return NextResponse.json(
        { error: `Failed to generate plot from backend: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 502 }
      );
    }
    
  } catch (error) {
    console.error('Error in plot-las API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
