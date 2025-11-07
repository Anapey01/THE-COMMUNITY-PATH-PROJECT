notepad setup_structure.ps1

# ===============================
# Project Setup Script (PowerShell Version)
# ===============================
# Creates missing folders/files for community-path
# without deleting or overwriting existing code
# ===============================

$BASE_DIR = "community-path"

Write-Host "🚀 Setting up Community Path folder structure..."

# === Create base directories ===
$dirs = @(
    "$BASE_DIR/backend/logic",
    "$BASE_DIR/backend/routes",
    "$BASE_DIR/backend/utils",
    "$BASE_DIR/frontend/html",
    "$BASE_DIR/frontend/static/css",
    "$BASE_DIR/frontend/static/js",
    "$BASE_DIR/frontend/static/images/sdg-icons",
    "$BASE_DIR/frontend/static/assets/videos",
    "$BASE_DIR/frontend/static/assets/fonts/inter"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

# === Backend files ===
$backendFiles = @(
    "app.py", "db.sqlite", "models.py"
)
foreach ($file in $backendFiles) {
    $path = "$BASE_DIR/backend/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

$logicFiles = @("match_engine.py", "sdg_mapper.py", "validation.py")
foreach ($file in $logicFiles) {
    $path = "$BASE_DIR/backend/logic/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

$routesFiles = @("auth_routes.py", "user_routes.py", "match_routes.py")
foreach ($file in $routesFiles) {
    $path = "$BASE_DIR/backend/routes/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

$utilsFiles = @("helpers.py", "db_init.py")
foreach ($file in $utilsFiles) {
    $path = "$BASE_DIR/backend/utils/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

# === Frontend HTML ===
$htmlFiles = @(
    "index.html","about.html","signup.html","login.html","main.html",
    "onboarding_step1.html","onboarding_step2.html","onboarding_step3.html",
    "onboarding_step4.html","match_result.html"
)
foreach ($file in $htmlFiles) {
    $path = "$BASE_DIR/frontend/html/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

# === Frontend static files ===
$cssFiles = @("style.css","forms.css","dashboard.css")
foreach ($file in $cssFiles) {
    $path = "$BASE_DIR/frontend/static/css/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

$jsFiles = @("main.js","onboarding.js","match.js","auth.js","api.js")
foreach ($file in $jsFiles) {
    $path = "$BASE_DIR/frontend/static/js/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

# Images and Assets
$imgFiles = @("logo.png","banner.jpg")
foreach ($file in $imgFiles) {
    $path = "$BASE_DIR/frontend/static/images/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

$assetVideo = "$BASE_DIR/frontend/static/assets/videos/intro_sdgs.mp4"
if (!(Test-Path $assetVideo)) { New-Item -ItemType File -Path $assetVideo | Out-Null }

# === Root-level files ===
$rootFiles = @("README.md",".env.example","requirements.txt",".gitignore")
foreach ($file in $rootFiles) {
    $path = "$BASE_DIR/$file"
    if (!(Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
}

Write-Host "`n✅ Folder structure ensured — existing code preserved!"
Write-Host "`n📁 Current structure:"
Get-ChildItem $BASE_DIR -Recurse | Select-Object FullName
Write-Host "`n🎉 Setup complete!"
