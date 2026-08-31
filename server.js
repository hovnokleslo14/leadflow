#!/usr/bin/env node

// server.js - Orchestrator pro LeadFlow Dashboard
// Spouští backend (FastAPI) a frontend (Next.js) současně

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Colors for output
const GREEN = '\033[0;32m';
const YELLOW = '\033[1;33m';
const RED = '\033[0;31m';
const BLUE = '\033[0;34m';
const CYAN = '\033[0;36m';
const RESET = '\033[0m';
const BOLD = '\033[1m';

function logSuccess(msg) { console.log(`${GREEN}[SUCCESS]${RESET} ${msg}`); }
function logWarning(msg) { console.log(`${YELLOW}[WARNING]${RESET} ${msg}`); }
function logError(msg) { console.log(`${RED}[ERROR]${RESET} ${msg}`); }
function logInfo(msg) { console.log(`${BLUE}[INFO]${RESET} ${msg}`); }
function logStep(msg) { console.log(`${CYAN}[STEP]${RESET} ${msg}`); }

// Configuration
const CONFIG = {
  backend: {
    dir: path.join(__dirname, 'backend'),
    port: process.env.BACKEND_PORT || 8000,
    command: 'uvicorn',
    args: ['app.main:app', '--host', '0.0.0.0', '--port', String(process.env.BACKEND_PORT || 8000)],
    healthUrl: `http://localhost:${process.env.BACKEND_PORT || 8000}/api/health`,
    readyText: 'Application startup complete',
  },
  frontend: {
    dir: path.join(__dirname, 'frontend'),
    port: process.env.FRONTEND_PORT || 3000,
    devCommand: 'npm',
    devArgs: ['run', 'dev'],
    buildCommand: 'npm',
    buildArgs: ['run', 'build'],
    startCommand: 'npm',
    startArgs: ['run', 'start'],
    healthUrl: `http://localhost:${process.env.FRONTEND_PORT || 3000}`,
  },
  database: {
    dir: path.join(__dirname, 'backend'),
    initScript: 'init_db.py',
  },
};

// Process management
const processes = new Map();
let shutdown = false;

function printBanner() {
  console.log(`
${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗
║                  LeadFlow Dashboard v1.0                      ║
║              Moderní CRM pro Minecraft vývojáře               ║
╚══════════════════════════════════════════════════════════════╝${RESET}
  `);
}

function checkDirectory(dir, name) {
  if (!fs.existsSync(dir)) {
    logError(`${name} directory not found: ${dir}`);
    return false;
  }
  logSuccess(`${name} directory found: ${dir}`);
  return true;
}

function checkFile(file, name) {
  if (!fs.existsSync(file)) {
    logWarning(`${name} not found: ${file}`);
    return false;
  }
  logSuccess(`${name} found: ${file}`);
  return true;
}

function validateEnvironment() {
  logStep('Validating environment...');
  
  const checks = [
    checkDirectory(CONFIG.backend.dir, 'Backend'),
    checkDirectory(CONFIG.frontend.dir, 'Frontend'),
    checkFile(path.join(CONFIG.backend.dir, 'requirements.txt'), 'Backend requirements.txt'),
    checkFile(path.join(CONFIG.frontend.dir, 'package.json'), 'Frontend package.json'),
    checkFile(path.join(CONFIG.frontend.dir, 'next.config.js'), 'Frontend next.config.js'),
  ];
  
  if (!checks.every(Boolean)) {
    logError('Environment validation failed');
    process.exit(1);
  }
  
  // Check .env file
  const envPath = path.join(CONFIG.backend.dir, '.env');
  if (!fs.existsSync(envPath)) {
    logWarning('.env file not found, copying from .env.example');
    const examplePath = path.join(CONFIG.backend.dir, '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      logSuccess('Created .env from .env.example');
    } else {
      logError('.env.example not found');
      process.exit(1);
    }
  } else {
    logSuccess('.env file found');
  }
}

function installBackendDependencies() {
  return new Promise((resolve, reject) => {
    logStep('Installing backend dependencies...');
    
    const pip = spawn('pip', ['install', '-r', 'requirements.txt'], {
      cwd: CONFIG.backend.dir,
      stdio: 'pipe',
    });
    
    let output = '';
    pip.stdout.on('data', (data) => {
      output += data.toString();
      // Show progress
      if (data.toString().includes('Successfully installed')) {
        process.stdout.write('.');
      }
    });
    
    pip.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR') || msg.includes('error:')) {
        process.stderr.write(msg);
      }
    });
    
    pip.on('close', (code) => {
      if (code === 0) {
        logSuccess('Backend dependencies installed');
        resolve();
      } else {
        logError('Failed to install backend dependencies');
        reject(new Error(output));
      }
    });
  });
}

function installFrontendDependencies() {
  return new Promise((resolve, reject) => {
    logStep('Installing frontend dependencies...');
    
    const npm = spawn('npm', ['install', '--legacy-peer-deps'], {
      cwd: CONFIG.frontend.dir,
      stdio: 'pipe',
    });
    
    npm.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('added') || msg.includes('packages')) {
        process.stdout.write('.');
      }
    });
    
    npm.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR') || msg.includes('error:')) {
        process.stderr.write(msg);
      }
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        logSuccess('Frontend dependencies installed');
        resolve();
      } else {
        logError('Failed to install frontend dependencies');
        reject(new Error('npm install failed'));
      }
    });
  });
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    logStep('Initializing database...');
    
    const python = spawn('python', ['-c', `
import asyncio
import sys
sys.path.insert(0, ".")
from app.db.base import init_db
asyncio.run(init_db())
print("Database initialized")
    `], {
      cwd: CONFIG.backend.dir,
      stdio: 'pipe',
    });
    
    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.stderr.on('data', (data) => { output += data.toString(); });
    
    python.on('close', (code) => {
      if (code === 0) {
        logSuccess('Database initialized');
        resolve();
      } else {
        logError('Database initialization failed');
        logError(output);
        reject(new Error(output));
      }
    });
  });
}

function startProcess(name, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    logStep(`Starting ${name}...`);
    
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    processes.set(name, proc);
    
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        logError(`${name} startup timeout`);
        reject(new Error(`${name} startup timeout`));
      }
    }, options.timeout || 60000);
    
    proc.stdout.on('data', (data) => {
      const msg = data.toString();
      if (options.readyText && msg.includes(options.readyText)) {
        started = true;
        clearTimeout(timeout);
        logSuccess(`${name} started successfully`);
        resolve(proc);
      }
      // Log important messages
      if (msg.includes('ERROR') || msg.includes('error:') || msg.includes('Exception')) {
        console.log(`  ${name}: ${msg.trim()}`);
      }
    });
    
    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR') || msg.includes('error:') || msg.includes('Exception') || msg.includes('Traceback')) {
        console.log(`  ${name} ERROR: ${msg.trim()}`);
      }
    });
    
    proc.on('close', (code) => {
      processes.delete(name);
      if (!shutdown && code !== 0) {
        logError(`${name} exited with code ${code}`);
      }
    });
    
    proc.on('error', (err) => {
      processes.delete(name);
      clearTimeout(timeout);
      if (!started) {
        reject(err);
      }
    });
  });
}

async function waitForHealth(url, name, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(2000, () => reject(new Error('Timeout')));
      });
      logSuccess(`${name} health check passed`);
      return true;
    } catch (err) {
      if (i === maxAttempts - 1) {
        logError(`${name} health check failed after ${maxAttempts} attempts`);
        return false;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return false;
}

async function startBackend() {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // Development: use uvicorn with reload
    await startProcess('Backend', 'uvicorn', [
      'app.main:app',
      '--host', '0.0.0.0',
      '--port', String(CONFIG.backend.port),
      '--reload',
      '--reload-dir', 'app',
    ], {
      cwd: CONFIG.backend.dir,
      readyText: 'Application startup complete',
    });
  } else {
    // Production: use gunicorn with uvicorn workers
    await startProcess('Backend', 'gunicorn', [
      'app.main:app',
      '--workers', '4',
      '--worker-class', 'uvicorn.workers.UvicornWorker',
      '--bind', `0.0.0.0:${CONFIG.backend.port}`,
      '--timeout', '120',
      '--keep-alive', '5',
    ], {
      cwd: CONFIG.backend.dir,
      readyText: 'Listening on',
    });
  }
  
  await waitForHealth(CONFIG.backend.healthUrl, 'Backend');
}

async function startFrontend() {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // Development: Next.js dev server
    await startProcess('Frontend', 'npm', ['run', 'dev'], {
      cwd: CONFIG.frontend.dir,
      readyText: 'Ready',
      timeout: 120000,
    });
  } else {
    // Production: Build then start
    logStep('Building frontend for production...');
    await new Promise((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: CONFIG.frontend.dir,
        stdio: 'inherit',
      });
      build.on('close', (code) => {
        if (code === 0) {
          logSuccess('Frontend built');
          resolve();
        } else {
          reject(new Error('Build failed'));
        }
      });
    });
    
    await startProcess('Frontend', 'npm', ['run', 'start'], {
      cwd: CONFIG.frontend.dir,
      readyText: 'Ready',
    });
  }
  
  await waitForHealth(CONFIG.frontend.healthUrl, 'Frontend');
}

function setupSignalHandlers() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      if (shutdown) return;
      shutdown = true;
      
      logWarning(`Received ${signal}, shutting down gracefully...`);
      
      // Kill all child processes
      for (const [name, proc] of processes) {
        logInfo(`Stopping ${name}...`);
        proc.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
      }
      
      // Wait a bit for processes to exit
      await new Promise(r => setTimeout(r, 2000));
      
      logSuccess('Shutdown complete');
      process.exit(0);
    });
  });
}

async function main() {
  printBanner();
  
  setupSignalHandlers();
  
  try {
    validateEnvironment();
    
    // Install dependencies
    await installBackendDependencies();
    await installFrontendDependencies();
    
    // Initialize database
    await initializeDatabase();
    
    // Start services
    await Promise.all([
      startBackend(),
      startFrontend(),
    ]);
    
    // Print summary
    console.log(`
${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗
║                    LeadFlow Dashboard Running                 ║
╠══════════════════════════════════════════════════════════════╣
║  Frontend:  http://localhost:${CONFIG.frontend.port.toString().padEnd(25)}║
║  Backend:   http://localhost:${CONFIG.backend.port.toString().padEnd(25)}║
║  API Docs:  http://localhost:${CONFIG.backend.port.toString().padEnd(25)}║
╚══════════════════════════════════════════════════════════════╝${RESET}
    `);
    
    logInfo('Press Ctrl+C to stop all services');
    
    // Keep process alive
    await new Promise(() => {});
    
  } catch (error) {
    logError(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };