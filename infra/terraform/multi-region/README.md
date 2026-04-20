# Multi-region Terraform Baseline

This folder contains a Phase 5 baseline for multi-region deployment planning.

## What It Generates

- `generated/global-routing-plan.json`: global routing profile for primary/secondary regions.
- `generated/failover-runbook.txt`: operational failover runbook template.

## Run

```bash
cd infra/terraform/multi-region
terraform init
terraform plan
terraform apply -auto-approve
```

## Notes

- This baseline is provider-agnostic and uses `local_file` to generate plans/runbooks.
- Integrate with cloud-specific providers (Azure/AWS/GCP) in the next iteration for fully provisioned global routing.
