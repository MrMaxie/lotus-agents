param(
    [Parameter(Mandatory = $true)]
    [string]$Destination,

    [ValidateSet("minimal", "with-local", "custom-layout")]
    [string]$Mode = "minimal",

    [switch]$Force
)

$ErrorActionPreference = "Stop"

$sourceRoot = Split-Path -Parent $PSScriptRoot
$destinationRoot = [System.IO.Path]::GetFullPath($Destination)

$packEntries = @(
    "AGENTS.md",
    "START_HERE.md",
    "REFERENCE.md",
    "skills",
    "templates",
    "lotus.config.yaml.example",
    "lotus.config.schema.json",
    "scripts/validate-contract.ps1",
    "scripts/validate-contract.sh"
)

function Ensure-ParentDirectory {
    param([string]$Path)

    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent | Out-Null
    }
}

function Copy-Entry {
    param(
        [string]$RelativePath
    )

    $sourcePath = Join-Path $sourceRoot $RelativePath
    $targetPath = Join-Path $destinationRoot $RelativePath

    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Missing source entry: $RelativePath"
    }

    if ((Test-Path -LiteralPath $targetPath) -and -not $Force) {
        throw "Target already exists: $targetPath. Use -Force to overwrite."
    }

    Ensure-ParentDirectory -Path $targetPath

    if ((Test-Path -LiteralPath $targetPath) -and $Force) {
        Remove-Item -Recurse -Force -LiteralPath $targetPath
    }

    Copy-Item -Recurse -Force -LiteralPath $sourcePath -Destination $targetPath
}

if (-not (Test-Path -LiteralPath $destinationRoot)) {
    New-Item -ItemType Directory -Path $destinationRoot | Out-Null
}

foreach ($entry in $packEntries) {
    Copy-Entry -RelativePath $entry
}

if ($Mode -eq "with-local") {
    $localRoot = Join-Path $destinationRoot ".local"
    foreach ($dir in @(
        ".local",
        ".local/issues",
        ".local/issues-notes",
        ".local/questions",
        ".local/runs"
    )) {
        $path = Join-Path $destinationRoot $dir
        if (-not (Test-Path -LiteralPath $path)) {
            New-Item -ItemType Directory -Path $path | Out-Null
        }
    }

    $localAgentsTarget = Join-Path $localRoot "AGENTS.md"
    $contextTarget = Join-Path $localRoot "context.md"

    if ((Test-Path -LiteralPath $localAgentsTarget) -and -not $Force) {
        throw "Target already exists: $localAgentsTarget. Use -Force to overwrite."
    }
    if ((Test-Path -LiteralPath $contextTarget) -and -not $Force) {
        throw "Target already exists: $contextTarget. Use -Force to overwrite."
    }

    Copy-Item -Force -LiteralPath (Join-Path $sourceRoot "templates/local.AGENTS.example.md") -Destination $localAgentsTarget
    Copy-Item -Force -LiteralPath (Join-Path $sourceRoot "templates/context.md") -Destination $contextTarget
}

if ($Mode -eq "custom-layout") {
    $configPath = Join-Path $destinationRoot "lotus.config.yaml"
    if ((Test-Path -LiteralPath $configPath) -and -not $Force) {
        throw "Target already exists: $configPath. Use -Force to overwrite."
    }

    Copy-Item -Force -LiteralPath (Join-Path $sourceRoot "lotus.config.yaml.example") -Destination $configPath
}

Write-Host "Initialized Lotus Agents starter pack in $destinationRoot"
Write-Host "Mode: $Mode"
