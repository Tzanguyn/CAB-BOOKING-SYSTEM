terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

resource "kubernetes_namespace" "cab_booking" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/name"    = "cab-booking"
      "app.kubernetes.io/managed" = "terraform"
    }
  }
}

resource "kubernetes_secret" "cab_booking_secrets" {
  metadata {
    name      = "cab-booking-secrets"
    namespace = kubernetes_namespace.cab_booking.metadata[0].name
  }

  data = {
    JWT_SECRET = var.jwt_secret
  }

  type = "Opaque"
}

resource "kubernetes_config_map" "cab_booking_config" {
  metadata {
    name      = "cab-booking-config"
    namespace = kubernetes_namespace.cab_booking.metadata[0].name
  }

  data = {
    NODE_ENV       = "production"
    AUTH_SERVICE_URL = "http://auth-service:3004"
    BOOKING_SERVICE_URL = "http://booking-service:3003"
    RIDE_SERVICE_URL = "http://ride-service:3009"
    REDIS_URL = "redis://redis:6379"
    RABBITMQ_URL = "amqp://cab_admin:cab123!@#@rabbitmq:5672/cab-booking"
  }
}
