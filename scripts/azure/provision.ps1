param(
  [string]$ResourceGroup = "Dev_Team_Data",
  [string]$Location = "uksouth",
  [string]$Prefix = "skills4crm",
  [string]$PostgresAdmin = "crmadmin",
  [string]$PostgresPassword,
  [string]$JwtSecret,
  [string]$GitHubRepo = "Siung1468/Employer-Engagement-CRM",
  [string]$GitHubBranch = "master",
  [string]$Suffix
)

$ErrorActionPreference = "Stop"

function Invoke-Az {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  & az @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI command failed: az $($Arguments -join ' ')"
  }
}

function New-RandomHex([int]$Bytes) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $buffer = New-Object byte[] $Bytes
  $rng.GetBytes($buffer)
  -join ($buffer | ForEach-Object { $_.ToString("x2") })
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI is required. Run this in Azure Cloud Shell or install Azure CLI first."
}

if (-not $Suffix) {
  $Suffix = (New-RandomHex 3).ToLowerInvariant()
}

$suffix = $Suffix.ToLowerInvariant()
$acrName = ($Prefix -replace "[^a-zA-Z0-9]", "").ToLowerInvariant() + "acr" + $suffix
$planName = "$Prefix-api-plan"
$apiAppName = "$Prefix-api-$suffix"
$staticAppName = "$Prefix-web-$suffix"
$postgresName = "$Prefix-pg-$suffix"
$databaseName = "skills4crm"

if (-not $PostgresPassword) {
  $PostgresPassword = New-RandomHex 18
}

if (-not $JwtSecret) {
  $JwtSecret = New-RandomHex 32
}

Write-Host "Checking resource group $ResourceGroup..."
Invoke-Az group show --name $ResourceGroup --output none

Write-Host "Creating Azure Container Registry $acrName..."
$acrExists = & az acr show --resource-group $ResourceGroup --name $acrName --query "name" -o tsv 2>$null
if ($acrExists) {
  Write-Host "Azure Container Registry $acrName already exists; reusing it."
} else {
  Invoke-Az acr create `
    --resource-group $ResourceGroup `
    --name $acrName `
    --sku Basic `
    --admin-enabled true | Out-Null
}

Write-Host "Creating PostgreSQL Flexible Server $postgresName..."
Invoke-Az postgres flexible-server create `
  --resource-group $ResourceGroup `
  --name $postgresName `
  --location $Location `
  --admin-user $PostgresAdmin `
  --admin-password $PostgresPassword `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 16 `
  --public-access 0.0.0.0 | Out-Null

Write-Host "Creating PostgreSQL database $databaseName..."
Invoke-Az postgres flexible-server db create `
  --resource-group $ResourceGroup `
  --server-name $postgresName `
  --database-name $databaseName | Out-Null

Write-Host "Allowing Azure services to reach PostgreSQL..."
Invoke-Az postgres flexible-server firewall-rule create `
  --resource-group $ResourceGroup `
  --name $postgresName `
  --rule-name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0 | Out-Null

$databaseUrl = "postgres://${PostgresAdmin}:${PostgresPassword}@${postgresName}.postgres.database.azure.com:5432/${databaseName}`?sslmode=require"

Write-Host "Creating Linux App Service plan $planName..."
Invoke-Az appservice plan create `
  --resource-group $ResourceGroup `
  --name $planName `
  --location $Location `
  --is-linux `
  --sku B1 | Out-Null

Write-Host "Creating API Web App $apiAppName..."
Invoke-Az webapp create `
  --resource-group $ResourceGroup `
  --plan $planName `
  --name $apiAppName `
  --deployment-container-image-name "$acrName.azurecr.io/skills4crm-api:bootstrap" | Out-Null

Write-Host "Configuring API Web App settings..."
Invoke-Az webapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $apiAppName `
  --settings `
    NODE_ENV=production `
    PORT=8080 `
    DATABASE_URL=$databaseUrl `
    JWT_SECRET=$JwtSecret `
    JWT_EXPIRES_IN=7d `
    LOG_LEVEL=info `
    CORS_ORIGIN="https://$staticAppName.azurestaticapps.net" | Out-Null

Invoke-Az webapp config set `
  --resource-group $ResourceGroup `
  --name $apiAppName `
  --generic-configurations '{\"healthCheckPath\":\"/api/healthz\"}' | Out-Null

Write-Host "Creating Static Web App $staticAppName..."
Invoke-Az staticwebapp create `
  --resource-group $ResourceGroup `
  --name $staticAppName `
  --location $Location `
  --sku Free | Out-Null

$acrUsername = & az acr credential show --name $acrName --query "username" -o tsv
if ($LASTEXITCODE -ne 0) { throw "Failed to read ACR username." }
$acrPassword = & az acr credential show --name $acrName --query "passwords[0].value" -o tsv
if ($LASTEXITCODE -ne 0) { throw "Failed to read ACR password." }
$staticToken = & az staticwebapp secrets list --resource-group $ResourceGroup --name $staticAppName --query "properties.apiKey" -o tsv
if ($LASTEXITCODE -ne 0) { throw "Failed to read Static Web Apps deployment token." }

Write-Host ""
Write-Host "Provisioning complete."
Write-Host ""
Write-Host "GitHub repository secrets to set:"
Write-Host "ACR_LOGIN_SERVER=$acrName.azurecr.io"
Write-Host "ACR_USERNAME=$acrUsername"
Write-Host "ACR_PASSWORD=$acrPassword"
Write-Host "AZURE_API_APP_NAME=$apiAppName"
Write-Host "AZURE_POSTGRES_DATABASE_URL=$databaseUrl"
Write-Host "AZURE_STATIC_WEB_APPS_API_TOKEN=$staticToken"
Write-Host "VITE_API_BASE_URL=https://$apiAppName.azurewebsites.net"
Write-Host ""
Write-Host "Also set AZURE_CREDENTIALS to a service principal JSON that can deploy to this resource group."
Write-Host "API health URL: https://$apiAppName.azurewebsites.net/api/healthz"
Write-Host "Frontend URL: https://$staticAppName.azurestaticapps.net"
