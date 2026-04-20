terraform {
  required_version = ">= 1.6.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

locals {
  regions = {
    primary = {
      name                 = var.primary_region
      ingress_hostname     = var.primary_ingress_hostname
      estimated_capacity   = var.primary_capacity
      failover_priority    = 1
    }
    secondary = {
      name                 = var.secondary_region
      ingress_hostname     = var.secondary_ingress_hostname
      estimated_capacity   = var.secondary_capacity
      failover_priority    = 2
    }
  }

  global_routing_profile = {
    name                    = var.global_routing_profile_name
    strategy                = var.global_routing_strategy
    health_probe_path       = var.global_health_probe_path
    dns_ttl_seconds         = var.global_dns_ttl_seconds
    failover_window_seconds = var.failover_window_seconds
    regions                 = local.regions
    generated_at            = timestamp()
  }
}

resource "local_file" "global_routing_plan" {
  filename = "${path.module}/generated/global-routing-plan.json"
  content  = jsonencode(local.global_routing_profile)
}

resource "local_file" "multi_region_runbook" {
  filename = "${path.module}/generated/failover-runbook.txt"
  content  = <<EOT
CAB Booking Multi-region Failover Runbook

Primary Region: ${var.primary_region}
Secondary Region: ${var.secondary_region}
Routing Strategy: ${var.global_routing_strategy}
Health Probe Path: ${var.global_health_probe_path}

1. Verify health probes for both regional ingress endpoints.
2. If primary region fails for longer than ${var.failover_window_seconds}s, switch traffic policy to secondary.
3. Keep write path idempotent while region rebalancing is in progress.
4. Restore primary traffic gradually after stability for ${var.failback_stabilization_seconds}s.
5. Record incident summary and RTO/RPO metrics.
EOT
}
