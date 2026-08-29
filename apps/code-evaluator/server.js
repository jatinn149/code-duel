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
  language: z.enum(['python', 'javascript']),
  testCases: z.array(
    z.object({
      input: z.string(),
      expectedOutput: z.string(),
    })
  ),
  timeoutMs: z.number().min(500).max(10000).default(3000),
});

// Helper to determine python command
const getPythonCommand = () => {
  try {
    const { execSync } = require('child_process');
    execSync('python3 --version', { stdio: 'ignore' });
    return 'python3';
  } catch (e) {
    return 'python';
  }
};

const PYTHON_CMD = getPythonCommand();

// Execute a single test case
const runTestCase = (code, language, input, timeoutMs) => {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const fileExt = language === 'python' ? '.py' : '.js';
    const filename = `eval_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
    const filePath = path.join(tempDir, filename);

    fs.writeFileSync(filePath, code);

    const cmd = language === 'python' ? PYTHON_CMD : 'node';
    const args = [filePath];

    const startTime = Date.now();
    const child = spawn(cmd, args);

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set timeout to kill process
    const timeout = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    if (child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
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
          exitCode,
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

      // Normalize outputs (remove extra whitespaces and handle CRLF vs LF)
      const normalize = (str) => str.replace(/\r\n/g, '\n').trim();

      const normalizedActual = normalize(execResult.stdout);
      const normalizedExpected = normalize(tc.expectedOutput);

      const isPassed = execResult.status === 'SUCCESS' && normalizedActual === normalizedExpected;
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
