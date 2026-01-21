#!/bin/bash

# CAB Booking System Startup Script
# This script starts all services in the correct order

echo "🚀 Starting CAB Booking System..."
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running ✓"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from config-example.txt..."
    cp config-example.txt .env
    print_warning "Please edit .env file with your actual configuration values"
fi

# Start infrastructure services
print_status "Starting infrastructure services (PostgreSQL, MongoDB, Redis, RabbitMQ)..."

docker-compose up -d postgres mongodb redis rabbitmq

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
sleep 30

# Check if services are healthy
if docker-compose ps | grep -q "healthy\|running"; then
    print_success "Infrastructure services are running ✓"
else
    print_error "Some infrastructure services failed to start"
    docker-compose logs
    exit 1
fi

# Initialize RabbitMQ (if not already done)
print_status "Initializing RabbitMQ exchanges and queues..."
docker-compose exec rabbitmq rabbitmqadmin -u cab_admin -p cab123!@# declare exchange name=ride-events type=topic > /dev/null 2>&1 || true

# Start microservices
print_status "Starting microservices..."

# Start auth service
print_status "Starting auth-service..."
docker-compose up -d auth-service

# Start user service
print_status "Starting user-service..."
docker-compose up -d user-service

# Start driver service
print_status "Starting driver-service..."
docker-compose up -d driver-service

# Wait for services to start
sleep 10

# Test RabbitMQ connection
print_status "Testing RabbitMQ integration..."
if node test-rabbitmq.js > /dev/null 2>&1; then
    print_success "RabbitMQ integration test passed ✓"
else
    print_warning "RabbitMQ integration test failed - check logs"
fi

# Show status
print_status "System startup complete!"
echo ""
print_success "Available services:"
echo "  🐰 RabbitMQ Management: http://localhost:15672 (admin/cab123!@#)"
echo "  🔐 Auth Service: http://localhost:3001"
echo "  👤 User Service: http://localhost:3010"
echo "  🚗 Driver Service: http://localhost:3004"
echo ""
print_status "To check service health:"
echo "  curl http://localhost:3001/auth/health"
echo "  curl http://localhost:3010/api/users/health"
echo ""
print_status "To view logs:"
echo "  docker-compose logs -f [service-name]"
echo ""
print_status "To stop all services:"
echo "  docker-compose down"
echo ""
print_success "🎉 CAB Booking System is now running!"