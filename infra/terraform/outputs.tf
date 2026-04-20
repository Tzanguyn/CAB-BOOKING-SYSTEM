output "namespace" {
  description = "Namespace created for CAB Booking"
  value       = kubernetes_namespace.cab_booking.metadata[0].name
}

output "config_map_name" {
  description = "ConfigMap name used by CAB Booking services"
  value       = kubernetes_config_map.cab_booking_config.metadata[0].name
}

output "secret_name" {
  description = "Secret name used by CAB Booking services"
  value       = kubernetes_secret.cab_booking_secrets.metadata[0].name
  sensitive   = true
}
