# GitHub CI/CD setup

This repository deploys to the UK South Azure Container Apps environment via:

```text
.github/workflows/azure-container-apps.yml
```

The workflow builds images in Azure Container Registry, runs the Drizzle migration job, updates the API and frontend Container Apps, then smoke-tests both public endpoints.

## Required GitHub secret

Create one repository secret:

```text
AZURE_CREDENTIALS
```

Generate its value with an Azure service principal scoped to the dev resource group:

```powershell
az ad sp create-for-rbac `
  --name skills4crm-github-actions-dev `
  --role contributor `
  --scopes /subscriptions/51a49afe-7232-459a-a7e3-411f4d5b9a37/resourceGroups/Dev_Team_Data `
  --sdk-auth
```

Copy the full JSON output into the `AZURE_CREDENTIALS` GitHub secret.

## Azure resources used by the workflow

```text
Resource group:       Dev_Team_Data
ACR:                  skills4crmacr07b768
API Container App:    skills4crm-api-07b768
Web Container App:    skills4crm-web-07b768
Migration job:        skills4crm-migrate-07b768
```

## Deployment trigger

The workflow runs on:

- manual dispatch from GitHub Actions
- push to `master` or `main`

If Replit pushes to this GitHub repository, Azure deployment follows automatically.
