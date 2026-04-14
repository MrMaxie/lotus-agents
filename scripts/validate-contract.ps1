param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$rootPath = [System.IO.Path]::GetFullPath($Root)
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message)
}

function Assert-PathExists {
    param(
        [string]$RelativePath,
        [string]$Label
    )

    $path = Join-Path $rootPath $RelativePath
    if (-not (Test-Path -LiteralPath $path)) {
        Add-Failure "$Label is missing: $RelativePath"
    }
}

$requiredEntries = @(
    @{ Path = "AGENTS.md"; Label = "Contract" },
    @{ Path = "START_HERE.md"; Label = "Starter guide" },
    @{ Path = "REFERENCE.md"; Label = "Secondary reference" },
    @{ Path = "skills"; Label = "Skills directory" },
    @{ Path = "templates"; Label = "Templates directory" },
    @{ Path = "lotus.config.yaml.example"; Label = "Config example" },
    @{ Path = "lotus.config.schema.json"; Label = "Config schema" }
)

foreach ($entry in $requiredEntries) {
    Assert-PathExists -RelativePath $entry.Path -Label $entry.Label
}

$templateFiles = @(
    "templates/context.md",
    "templates/issue.md",
    "templates/issue-notes.md",
    "templates/local.AGENTS.example.md",
    "templates/meeting.md",
    "templates/pr-notes.md",
    "templates/questions.issue.md",
    "templates/questions.runtime.md",
    "templates/review.md",
    "templates/review-answers.md",
    "templates/run.md",
    "templates/spec.feature.md"
)

foreach ($templateFile in $templateFiles) {
    Assert-PathExists -RelativePath $templateFile -Label "Template"
}

$expectedKeys = @(
    "docs_root",
    "specs_dir",
    "meetings_dir",
    "local_root",
    "local_agents_file",
    "context_file",
    "local_docs_root",
    "local_specs_dir",
    "local_meetings_dir",
    "issues_dir",
    "issue_notes_dir",
    "questions_dir",
    "runs_dir",
    "reviews_dir",
    "pr_notes_dir",
    "default_branch"
)

$configExamplePath = Join-Path $rootPath "lotus.config.yaml.example"
if (Test-Path -LiteralPath $configExamplePath) {
    $configExampleKeys = @{}
    foreach ($line in Get-Content -LiteralPath $configExamplePath) {
        if ($line -match '^\s*([a-z_]+):') {
            $configExampleKeys[$Matches[1]] = $true
        }
    }

    foreach ($key in $expectedKeys) {
        if (-not $configExampleKeys.ContainsKey($key)) {
            Add-Failure "Config example is missing key: $key"
        }
    }
}

$schemaPath = Join-Path $rootPath "lotus.config.schema.json"
if (Test-Path -LiteralPath $schemaPath) {
    try {
        $schema = Get-Content -Raw -LiteralPath $schemaPath | ConvertFrom-Json
        $schemaKeys = @($schema.properties.PSObject.Properties.Name)
        foreach ($key in $expectedKeys) {
            if ($schemaKeys -notcontains $key) {
                Add-Failure "Config schema is missing key: $key"
            }
        }
    }
    catch {
        Add-Failure "Config schema is not valid JSON: $($_.Exception.Message)"
    }
}

$skillFiles = Get-ChildItem -LiteralPath (Join-Path $rootPath "skills") -Filter *.md -File -ErrorAction SilentlyContinue
foreach ($skillFile in $skillFiles) {
    $content = Get-Content -Raw -LiteralPath $skillFile.FullName
    if ($content -match '\.local/' -or $content -match '\bdocs/') {
        Add-Failure "Hardcoded default path found in skill: $($skillFile.Name)"
    }
}

if ($failures.Count -gt 0) {
    Write-Host "Lotus Agents contract validation failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "Lotus Agents contract validation passed." -ForegroundColor Green
