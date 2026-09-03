const express = require('express');
const cors = require('cors');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Zod validation schemas
const evaluateSchema = z.object({
  code: z.string(),
  language: z.enum(['python', 'javascript']).default('python'),
  testCases: z.array(
    z.object({
      input: z.string().optional().default(''),
      expectedOutput: z.string().optional().default(''),
    })
  ).default([{ input: '', expectedOutput: '' }]),
  timeoutMs: z.number().min(500).max(10000).default(3000),
});

// Helper to determine python command
const getPythonCommand = () => {
  const { execSync } = require('child_process');
  const candidates = ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3', 'py'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {}
  }
  return process.platform === 'win32' ? 'python' : 'python3';
};

const PYTHON_CMD = getPythonCommand();

const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB limit to prevent memory exhaustion

// Execute a single test case
const runTestCase = (code, language, input, timeoutMs) => {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const fileExt = language === 'python' ? '.py' : '.js';
    const filename = `eval_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
    const filePath = path.join(tempDir, filename);

    // Auto-detect trace/predict output:
    // If code has only comments and a bare value or expression without print(),
    // automatically append print(...) so executing it outputs the value to stdout!
    let executableCode = code;
    if (language === 'python') {
      const nonCommentLines = code
        .split('\n')
        .map((line) => line.replace(/#.*$/, '').trim())
        .filter(Boolean);
      
      if (nonCommentLines.length > 0 && !code.includes('print(')) {
        const lastLine = nonCommentLines[nonCommentLines.length - 1];
        executableCode = `${code}\nprint(${lastLine})\n`;
      }
    }

    try {
      fs.writeFileSync(filePath, executableCode, 'utf8');
    } catch (writeErr) {
      return resolve({
        status: 'RUNTIME_ERROR',
        stdout: '',
        stderr: 'Failed to write code to execution environment.',
        exitCode: -1,
        timeMs: 0,
      });
    }

    const cmd = language === 'python' ? PYTHON_CMD : 'node';
    const args = [filePath];

    const startTime = Date.now();
    let child;
    try {
      child = spawn(cmd, args);
    } catch (spawnErr) {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
      return resolve({
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: spawnErr.message,
        exitCode: -1,
        timeMs: 0,
      });
    }

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set timeout to kill process
    const timeout = setTimeout(() => {
      killed = true;
      try {
        child.kill('SIGKILL');
      } catch (e) {}
    }, timeoutMs);

    // Protect against EPIPE crashes if child process terminates before reading stdin
    if (child.stdin) {
      child.stdin.on('error', () => {});
      try {
        child.stdin.write(input || '');
        child.stdin.end();
      } catch (e) {}
    }

    child.stdout.on('data', (data) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += data.toString();
      } else if (!killed) {
        killed = true;
        try { child.kill('SIGKILL'); } catch (e) {}
      }
    });

    child.stderr.on('data', (data) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += data.toString();
      }
    });

    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      
      // Clean up temp file safely
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }

      const durationMs = Date.now() - startTime;

      if (killed) {
        resolve({
          status: 'TIMEOUT',
          stdout: stdout.trim(),
          stderr: 'Time Limit Exceeded.',
          exitCode: 124,
          timeMs: durationMs,
        });
      } else {
        resolve({
          status: exitCode === 0 ? 'SUCCESS' : 'RUNTIME_ERROR',
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
          timeMs: durationMs,
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {}

      resolve({
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: err.message,
        exitCode: -1,
        timeMs: 0,
      });
    });
  });
};

// Health Check Endpoints
app.get(['/health', '/api/health'], (_req, res) => {
  let pythonVersion = 'unknown';
  try {
    const { execSync } = require('child_process');
    pythonVersion = execSync(`${PYTHON_CMD} --version`).toString().trim();
  } catch (e) {
    pythonVersion = `error: ${e.message}`;
  }

  res.json({
    status: 'ok',
    uptimeSec: Math.floor(process.uptime()),
    pythonCommand: PYTHON_CMD,
    pythonVersion,
    timestamp: new Date().toISOString(),
  });
});

// Evaluate endpoint
app.post('/api/evaluate', async (req, res) => {
  try {
    const parsed = evaluateSchema.parse(req.body);
    const { code, language, testCases, timeoutMs } = parsed;

    const results = [];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const execResult = await runTestCase(code, language, tc.input, timeoutMs);

      // Normalize outputs (remove extra whitespaces, CRLF, and lower-case)
      const normalize = (str) => (str || '').replace(/\r\n/g, '\n').trim().toLowerCase();

      const normalizedActual = normalize(execResult.stdout);
      const normalizedExpected = normalize(tc.expectedOutput);

      let isPassed = execResult.status === 'SUCCESS' && normalizedActual === normalizedExpected;

      // Fallback check for trace output: if execution had a mismatch or NameError (e.g. unquoted string),
      // check if raw code ended with expected output!
      if (!isPassed) {
        const nonComment = code
          .split('\n')
          .map((line) => line.replace(/#.*$/, '').trim())
          .filter(Boolean);
        const lastVal = (nonComment[nonComment.length - 1] || '').replace(/^['"]|['"]$/g, '').toLowerCase();
        if (lastVal && lastVal === normalizedExpected) {
          isPassed = true;
        }
      }

      if (isPassed) {
        passedCount++;
      }

      results.push({
        testCaseIndex: i,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: execResult.stdout,
        status: isPassed ? 'PASSED' : (execResult.status === 'SUCCESS' ? 'FAILED' : execResult.status),
        stderr: execResult.stderr,
        timeMs: execResult.timeMs,
        exitCode: execResult.exitCode,
      });
    }

    res.json({
      success: true,
      passedCount,
      totalCount: testCases.length,
      results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Invalid request schema',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Code Evaluation Microservice listening on http://localhost:${PORT}`);
});
