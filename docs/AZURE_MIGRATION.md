# Azure migration runbook

This app is a pnpm monorepo with:

- `artifacts/crm`: Vite/React frontend.
- `artifacts/api-server`: Express API.
- `lib/db`: Drizzle/PostgreSQL schema and migrations.

The recommended Azure shape is:

- Frontend: Azure Container Apps using `Dockerfile.frontend` when all resources must remain in UK South. Azure Static Web Apps is also supported by the repo workflow, but it is not available in UK South.
- API: Azure Container Apps or Azure App Service for Containers using the root `Dockerfile`.
- Database: Azure Database for PostgreSQL Flexible Server.
- Secrets: App Service application settings or Key Vault references.

## 1. Provision Azure resources

Create:

- Azure Database for PostgreSQL Flexible Server.
- Azure Container Registry.
- Linux App Service for Containers for the API.
- Azure Static Web Apps for the CRM frontend.
- Optional but recommended: Key Vault and Application Insights.

You can provision the baseline resources with:

```powershell
./scripts/azure/provision.ps1
```

Run it from Azure Cloud Shell or a machine where Azure CLI is installed and logged in.

If the subscription has not used these services before, an Azure Owner or subscription-level Contributor must first register the resource providers:

```powershell
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.Web --wait
az provider register --namespace Microsoft.DBforPostgreSQL --wait
```

Set the API App Service health check path to:

```text
/api/healthz
```

## 2. Configure API App Service settings

Use App Service application settings, preferably backed by Key Vault references:

```text
NODE_ENV=production
PORT=8080
DATABASE_URL=postgres://<user>:<password>@<server>.postgres.database.azure.com:5432/<database>?sslmode=require
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
LOG_LEVEL=info
CORS_ORIGIN=https://<your-static-web-app>.azurestaticapps.net
```

The API fails fast in production if `JWT_SECRET` is missing or still using the development fallback.

## 3. Configure GitHub repository secrets

For `.github/workflows/azure-api-container.yml`:

```text
ACR_LOGIN_SERVER=<registry>.azurecr.io
ACR_USERNAME=<registry-username-or-service-principal>
ACR_PASSWORD=<registry-password-or-service-principal-secret>
AZURE_API_APP_NAME=<api-app-service-name>
AZURE_CREDENTIALS=<json-output-from-az-ad-sp-create-for-rbac>
AZURE_POSTGRES_DATABASE_URL=postgres://...?...sslmode=require
```

For `.github/workflows/azure-static-web-app.yml`:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN=<deployment-token-from-static-web-app>
VITE_API_BASE_URL=https://<api-app-service-name>.azurewebsites.net
```

## 4. Deploy

For the UK South deployment, use `.github/workflows/azure-container-apps.yml`. It builds the API, frontend, and migration images in ACR, runs Drizzle migrations, updates the API and web Container Apps, then smoke-tests both endpoints.

See `docs/GITHUB_CICD.md` for the GitHub secret setup.

## 5. Verify

Check:

```text
https://<api-app-service-name>.azurewebsites.net/api/healthz
https://<your-static-web-app>.azurestaticapps.net
```

Then log in with a real user or the seeded demo accounts if you intentionally keep demo seeding enabled for the target environment.

## Notes before production use

- `autoSeed()` currently creates demo accounts/data when the database is empty. Disable or gate this before production cutover if the environment should start clean.
- Keep `CORS_ORIGIN` restricted to the Static Web Apps URL or your custom domain.
- If you add a custom domain or Azure Front Door, update both `CORS_ORIGIN` and `VITE_API_BASE_URL`.
