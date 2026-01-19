#!/bin/bash

# Wait for RabbitMQ to start
echo "Waiting for RabbitMQ to start..."
sleep 30

# Create virtual host
echo "Creating virtual host: cab-booking"
rabbitmqctl add_vhost cab-booking

# Set permissions for default user on the new vhost
rabbitmqctl set_permissions -p cab-booking cab_admin ".*" ".*" ".*"

# Enable management plugin if not already enabled
rabbitmq-plugins enable rabbitmq_management

# Create exchanges based on event schema from PDF
echo "Creating exchanges..."

# Topic exchanges for different event types
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare exchange name=ride-events type=topic
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare exchange name=driver-events type=topic
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare exchange name=payment-events type=topic
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare exchange name=booking-events type=topic

# Direct exchange for notifications
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare exchange name=notification-events type=direct

# Create queues for different services (based on PDF architecture)
echo "Creating queues..."

# Booking Service queues
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=booking-service-queue durable=true

# Driver Service queues
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=driver-service-queue durable=true

# Ride Service queues
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=ride-service-queue durable=true

# Payment Service queues
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=payment-service-queue durable=true

# Notification Service queues
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=notification-service-queue durable=true

# ETA Service queues (for real-time calculations)
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=eta-service-queue durable=true

# Matching Service queues (AI matching engine)
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=matching-service-queue durable=true

# Monitoring Service queues
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=monitoring-service-queue durable=true

# Wallet Service queues
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare queue name=wallet-service-queue durable=true

# Bind queues to exchanges with routing keys (based on event schema from PDF)
echo "Creating queue bindings..."

# Booking Events Bindings
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=booking-events destination=booking-service-queue routing_key="booking.*"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=booking-events destination=matching-service-queue routing_key="booking.created"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=booking-events destination=eta-service-queue routing_key="booking.created"

# Ride Events Bindings (from PDF: ride.created, ride.assigned, etc.)
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=ride-events destination=ride-service-queue routing_key="ride.*"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=ride-events destination=matching-service-queue routing_key="ride.created"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=ride-events destination=eta-service-queue routing_key="ride.created"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=ride-events destination=notification-service-queue routing_key="ride.assigned"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=ride-events destination=monitoring-service-queue routing_key="ride.*"

# Driver Events Bindings (from PDF: driver.location.updated)
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=driver-events destination=driver-service-queue routing_key="driver.*"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=driver-events destination=eta-service-queue routing_key="driver.location.updated"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=driver-events destination=monitoring-service-queue routing_key="driver.location.updated"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=driver-events destination=matching-service-queue routing_key="driver.status.*"

# Payment Events Bindings (from PDF: payment.completed, payment.failed)
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=payment-events destination=payment-service-queue routing_key="payment.*"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=payment-events destination=ride-service-queue routing_key="payment.completed"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=payment-events destination=wallet-service-queue routing_key="payment.completed"
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=payment-events destination=notification-service-queue routing_key="payment.failed"

# Notification Events Bindings
rabbitmqadmin -u cab_admin -p cab123!@# -V cab-booking declare binding source=notification-events destination=notification-service-queue routing_key="*"

echo "RabbitMQ configuration completed successfully!"
echo "Access RabbitMQ Management UI at: http://localhost:15672"
echo "Username: cab_admin"
echo "Password: cab123!@#"