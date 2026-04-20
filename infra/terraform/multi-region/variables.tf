variable "primary_region" {
  description = "Primary deployment region"
  type        = string
  default     = "southeastasia"
}

variable "secondary_region" {
  description = "Secondary deployment region"
  type        = string
  default     = "eastasia"
}

variable "primary_ingress_hostname" {
  description = "Primary region ingress hostname"
  type        = string
  default     = "api-primary.cab-booking.local"
}

variable "secondary_ingress_hostname" {
  description = "Secondary region ingress hostname"
  type        = string
  default     = "api-secondary.cab-booking.local"
}

variable "global_routing_profile_name" {
  description = "Global routing profile name"
  type        = string
  default     = "cab-booking-global-routing"
}

variable "global_routing_strategy" {
  description = "Global routing strategy: failover, weighted, or performance"
  type        = string
  default     = "failover"

  validation {
    condition     = contains(["failover", "weighted", "performance"], var.global_routing_strategy)
    error_message = "global_routing_strategy must be one of: failover, weighted, performance"
  }
}

variable "global_health_probe_path" {
  description = "Health probe path for global routing"
  type        = string
  default     = "/health"
}

variable "global_dns_ttl_seconds" {
  description = "DNS TTL for global routing profile"
  type        = number
  default     = 30
}

variable "failover_window_seconds" {
  description = "Failure detection window before failover"
  type        = number
  default     = 90
}

variable "failback_stabilization_seconds" {
  description = "Stabilization duration before failback"
  type        = number
  default     = 300
}

variable "primary_capacity" {
  description = "Estimated primary region capacity units"
  type        = number
  default     = 100
}

variable "secondary_capacity" {
  description = "Estimated secondary region capacity units"
  type        = number
  default     = 60
}
