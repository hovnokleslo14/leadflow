#!/bin/bash

# LeadFlow Dashboard - Startup Script
# For running without Docker (development or simple VPS deployment)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    log_warning "Running as root is not recommended for development"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing=()
    
    if ! command_exists python3; then
        missing+=("python3")
    fi
    
    if ! command_exists node; then
        missing+=("node")
    fi
    
    if ! command_exists npm; then
        missing+=("npm")
    fi
    
    if ! command_exists pip3; then
        missing+=("pip3")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        log_info "Please install them and try again"
        exit 1
    fi
    
    log_success "All dependencies found"
}

# Setup backend
setup_backend() {
    log_info "Setting up backend..."
    
    cd backend
    
    # Create virtual environment if not exists
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install dependencies
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Initialize database
    log_info "Initializing database..."
    python init_db.py
    
    cd ..
    log_success "Backend setup complete"
}

# Setup frontend
setup_frontend() {
    log_info "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    log_info "Installing Node.js dependencies..."
    npm install --legacy-peer-deps
    
    cd ..
    log_success "Frontend setup complete"
}

# Start backend
start_backend() {
    log_info "Starting backend..."
    
    cd backend
    source venv/bin/activate
    
    # Start uvicorn in background
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    
    cd ..
    log_success "Backend started (PID: $BACKEND_PID)"
}

# Start frontend
start_frontend() {
    log_info "Starting frontend..."
    
    cd frontend
    
    # Start Next.js in background
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
    log_success "Frontend started (PID: $FRONTEND_PID)"
}

# Start Celery worker
start_celery() {
    log_info "Starting Celery worker..."
    
    cd backend
    source venv/bin/activate
    
    celery -A app.celery_app worker --loglevel=info --concurrency=4 &
    CELERY_PID=$!
    
    cd ..
    log_success "Celery worker started (PID: $CELERY_PID)"
}

# Start Celery beat
start_celery_beat() {
    log_info "Starting Celery beat..."
    
    cd backend
    source venv/bin/activate
    
    celery -A app.celery_app beat --loglevel=info &
    CELERY_BEAT_PID=$!
    
    cd ..
    log_success "Celery beat started (PID: $CELERY_BEAT_PID)"
}

# Cleanup function
cleanup() {
    log_info "Shutting down..."
    
    # Kill background processes
    for pid in $BACKEND_PID $FRONTEND_PID $CELERY_PID $CELERY_BEAT_PID; do
        if kill -0 $pid 2>/dev/null; then
            kill $pid
        fi
    done
    
    # Wait for processes to exit
    wait $BACKEND_PID $FRONTEND_PID $CELERY_PID $CELERY_BEAT_PID 2>/dev/null
    
    log_success "All processes stopped"
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# Main
main() {
    echo "
╔══════════════════════════════════════════════════════════════╗
║                  LeadFlow Dashboard v1.0                      ║
║              Moderní CRM pro Minecraft vývojáře               ║
╚══════════════════════════════════════════════════════════════╝
"
    
    # Parse arguments
    SETUP=false
    SKIP_SETUP=false
    
    for arg in "$@"; do
        case $arg in
            --setup)
                SETUP=true
                ;;
            --skip-setup)
                SKIP_SETUP=true
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --setup         Run initial setup (install dependencies, init DB)"
                echo "  --skip-setup    Skip setup, only start services"
                echo "  --help, -h      Show this help"
                exit 0
                ;;
        esac
    done
    
    # Check dependencies
    check_dependencies
    
    # Setup if requested
    if [ "$SETUP" = true ] || [ "$SKIP_SETUP" = false ]; then
        if [ ! -d "backend/venv" ] || [ ! -d "frontend/node_modules" ]; then
            SETUP=true
        fi
    fi
    
    if [ "$SETUP" = true ]; then
        setup_backend
        setup_frontend
    fi
    
    # Start services
    start_backend
    sleep 3
    start_frontend
    sleep 2
    start_celery
    start_celery_beat
    
    # Print summary
    echo "
${GREEN}╔══════════════════════════════════════════════════════════════╗
║                    LeadFlow Dashboard Running                 ║
╠══════════════════════════════════════════════════════════════╣
║  Frontend:  http://localhost:3000                            ║
║  Backend:   http://localhost:8000                            ║
║  API Docs:  http://localhost:8000/docs                       ║
╚══════════════════════════════════════════════════════════════╝${NC}
"
    
    log_info "Press Ctrl+C to stop all services"
    
    # Wait for processes
    wait
}

# Run main
main "$@"