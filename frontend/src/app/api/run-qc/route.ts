import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(request: Request) {
  let tempDir: string | undefined;
  console.log(`[${new Date().toISOString()}] --- QC API Route Hit ---`);

  try {
    const body = await request.json();
    const files: { name: string; content: string }[] = body.files;
    console.log(`[${new Date().toISOString()}] CHECKPOINT 2: Request body parsed. Received ${files?.length || 0} files.`);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qc-run-'));
    console.log(`[${new Date().toISOString()}] CHECKPOINT 3: Created temporary directory at ${tempDir}`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeFilename = path.basename(file.name);
      await fs.writeFile(path.join(tempDir, safeFilename), file.content);
      console.log(`[${new Date().toISOString()}] CHECKPOINT 4.${i + 1}: Wrote file ${safeFilename} to temp directory.`);
    }

    // --- LOGIKA FLEKSIBEL UNTUK LINTAS PLATFORM ---
    const isWindows = os.platform() === 'win32';
    const pythonExecutable = isWindows ? 'python.exe' : 'python';
    const venvPathSegment = isWindows ? 'Scripts' : 'bin';
    const pythonVenvPath = path.join(process.cwd(), '.venv', venvPathSegment, pythonExecutable);
    // --- SELESAI ---

    const scriptPath = path.join(process.cwd(), 'server/module1/run_qc_script.py');
    
    console.log(`[${new Date().toISOString()}] CHECKPOINT 5: Paths defined. Python: ${pythonVenvPath}, Script: ${scriptPath}`);

    // **Crucial Check**: Verify that the Python executable from the virtual environment exists before trying to run it
    try {
      await fs.access(pythonVenvPath);
    } catch {
      console.error(`Python executable not found at: ${pythonVenvPath}`);
      return NextResponse.json(
        {
          error: 'Server configuration error: Python virtual environment not found.',
          details: `Please ensure you have created a virtual environment named ".venv" in the project root. The system detected you are on ${os.platform()}.`
        },
        { status: 500 }
      );
    }

    console.log(`[${new Date().toISOString()}] CHECKPOINT 6: Attempting to spawn Python process...`);
    const pythonProcess = spawn(pythonVenvPath, [scriptPath, tempDir]);
    console.log(`[${new Date().toISOString()}] CHECKPOINT 7: Python process spawned. Waiting for output...`);


    let scriptOutput = '';
    const scriptError = ''; // change when needed

    pythonProcess.stderr.on('data', (data) => {
      const logLine = data.toString();
      // Write progress directly to the Next.js server's console
      process.stderr.write(`[PYTHON SCRIPT LOG] ${logLine}`);
    });

    pythonProcess.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] CHECKPOINT 8: Python process finished with exit code ${code}.`);
        resolve(code);
      });
    });

    if (exitCode !== 0) {
      console.error('Python Script exited with an error code:', exitCode);
      return NextResponse.json({ error: 'Error executing the QC script', details: scriptError }, { status: 500 });
    }
    
    try {
      const results = JSON.parse(scriptOutput);
      return NextResponse.json(results);
    } catch(parseError){
        console.error("Error parsing JSON from Python script output:", parseError);
        // Provide both the parsing error and the raw output for debugging
        return NextResponse.json({
          error: 'Failed to parse results from QC script',
          details: `JSON Parse Error: ${parseError instanceof Error ? parseError.message : 'Unknown'}. Raw output was: ${scriptOutput}`
        }, { status: 500 });
    }

  } catch (error) {
    console.error('API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
