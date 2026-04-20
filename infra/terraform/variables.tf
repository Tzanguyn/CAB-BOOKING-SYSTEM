variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "namespace" {
  description = "Kubernetes namespace for CAB Booking"
  type        = string
  default     = "cab-booking"
}

variable "jwt_secret" {
  description = "JWT secret used by services"
  type        = string
  sensitive   = true
}
