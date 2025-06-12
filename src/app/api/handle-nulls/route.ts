import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os'; // <-- Tambahkan import ini

export async function POST(request: Request) {
  try {
    // This route expects the raw CSV content as a string in the body
    const fileContent = await request.text();

    if (!fileContent) {
      return NextResponse.json({ error: 'No file content provided' }, { status: 400 });
    }

    // --- LOGIKA FLEKSIBEL UNTUK LINTAS PLATFORM ---
    const isWindows = os.platform() === 'win32';
    const pythonExecutable = isWindows ? 'python.exe' : 'python';
    const venvPathSegment = isWindows ? 'Scripts' : 'bin';
    const pythonVenvPath = path.join(process.cwd(), '.venv', venvPathSegment, pythonExecutable);
    // --- SELESAI ---

    const scriptPath = path.join(process.cwd(), 'server/module1/handle_nulls_script.py');
    
    // Execute the Python script
    const pythonProcess = spawn(pythonVenvPath, [scriptPath]);

    let scriptOutput = '';
    let scriptError = '';

    // Write the file content to the Python script's standard input
    pythonProcess.stdin.write(fileContent);
    pythonProcess.stdin.end();

    // Capture the output
    for await (const chunk of pythonProcess.stdout) {
      scriptOutput += chunk;
    }
    for await (const chunk of pythonProcess.stderr) {
      scriptError += chunk;
    }

    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      console.error('handle_nulls_script.py Error:', scriptError);
      return NextResponse.json({ error: 'Error processing file to handle nulls', details: scriptError }, { status: 500 });
    }
    
    // Send the cleaned CSV content back as the response body
    return new Response(scriptOutput, {
        headers: {
            'Content-Type': 'text/csv',
        },
    });

  } catch (error) {
    console.error('API /api/handle-nulls Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
