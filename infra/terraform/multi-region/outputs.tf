output "global_routing_plan_file" {
  description = "Path to generated global routing plan"
  value       = local_file.global_routing_plan.filename
}

output "failover_runbook_file" {
  description = "Path to generated failover runbook"
  value       = local_file.multi_region_runbook.filename
}

output "primary_region" {
  description = "Configured primary region"
  value       = var.primary_region
}

output "secondary_region" {
  description = "Configured secondary region"
  value       = var.secondary_region
}
