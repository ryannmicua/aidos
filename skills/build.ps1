# AIDOS Skills Build Script
# Creates ZIP files for Claude.ai skill upload
# Output: skills/dist/aidos-builder.zip, skills/dist/aidos-auditor.zip

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $PSScriptRoot "dist"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) "aidos-skills-$(Get-Random)"

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Copy-To {
    param([string]$Src, [string]$Dest)
    $dir = Split-Path $Dest -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    Copy-Item $Src $Dest
}

function Fix-PromptPaths {
    param([string]$File)
    $content = Get-Content $File -Raw
    $content = $content -replace '`src/rubrics/', '`rubrics/'
    $content = $content -replace '`src/templates/', '`templates/'
    $content = $content -replace '`src/framework\.md`', '`framework.md`'
    Set-Content $File $content -NoNewline
}

function New-SkillZip {
    param([string]$Name, [string]$StagingDir, [string]$OutPath)
    $zip = [System.IO.Compression.ZipFile]::Open($OutPath, 'Create')
    try {
        Get-ChildItem $StagingDir -File -Recurse | ForEach-Object {
            $rel = $_.FullName.Substring($StagingDir.Length + 1).Replace('\', '/')
            $entryName = "$Name/$rel"
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    }
    finally {
        $zip.Dispose()
    }
}

# Clean dist
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null
New-Item -ItemType Directory -Path $temp | Out-Null

try {
    # --- Builder ---
    $b = Join-Path $temp "aidos-builder"

    Copy-To (Join-Path $PSScriptRoot "builder\SKILL.md")              (Join-Path $b "SKILL.md")
    Copy-To (Join-Path $root "src\prompts\builder-prompt.md")         (Join-Path $b "builder-prompt.md")
    Copy-To (Join-Path $root "src\framework.md")                     (Join-Path $b "framework.md")
    Copy-To (Join-Path $root "src\rubrics\core.md")                  (Join-Path $b "rubrics\core.md")
    Copy-To (Join-Path $root "src\templates\problem.md")             (Join-Path $b "templates\problem.md")
    Copy-To (Join-Path $root "src\templates\solution.md")            (Join-Path $b "templates\solution.md")
    Copy-To (Join-Path $root "src\templates\tech-design.md")         (Join-Path $b "templates\tech-design.md")
    Copy-To (Join-Path $root "src\templates\testing.md")             (Join-Path $b "templates\testing.md")
    Copy-To (Join-Path $root "src\templates\issues-log.md")          (Join-Path $b "templates\issues-log.md")
    Copy-To (Join-Path $root "src\templates\overflow-log.md")       (Join-Path $b "templates\overflow-log.md")
    Copy-To (Join-Path $root "src\templates\meeting-minutes.md")    (Join-Path $b "templates\meeting-minutes.md")
    Copy-To (Join-Path $root "src\templates\retrospective.md")      (Join-Path $b "templates\retrospective.md")
    Copy-To (Join-Path $root "CONTRIBUTING.md")                    (Join-Path $b "CONTRIBUTING.md")

    Fix-PromptPaths (Join-Path $b "builder-prompt.md")

    New-SkillZip -Name "aidos-builder" -StagingDir $b -OutPath (Join-Path $dist "aidos-builder.zip")

    # --- Auditor ---
    $a = Join-Path $temp "aidos-auditor"

    Copy-To (Join-Path $PSScriptRoot "auditor\SKILL.md")             (Join-Path $a "SKILL.md")
    Copy-To (Join-Path $root "src\prompts\auditor-prompt.md")        (Join-Path $a "auditor-prompt.md")
    Copy-To (Join-Path $root "src\framework.md")                    (Join-Path $a "framework.md")
    Copy-To (Join-Path $root "src\rubrics\core.md")                 (Join-Path $a "rubrics\core.md")
    Copy-To (Join-Path $root "src\rubrics\problem.md")              (Join-Path $a "rubrics\problem.md")
    Copy-To (Join-Path $root "src\rubrics\solution.md")             (Join-Path $a "rubrics\solution.md")
    Copy-To (Join-Path $root "src\rubrics\tech-design.md")          (Join-Path $a "rubrics\tech-design.md")
    Copy-To (Join-Path $root "src\rubrics\testing.md")              (Join-Path $a "rubrics\testing.md")
    Copy-To (Join-Path $root "src\templates\retrospective.md")     (Join-Path $a "templates\retrospective.md")
    Copy-To (Join-Path $root "CONTRIBUTING.md")                   (Join-Path $a "CONTRIBUTING.md")

    Fix-PromptPaths (Join-Path $a "auditor-prompt.md")

    New-SkillZip -Name "aidos-auditor" -StagingDir $a -OutPath (Join-Path $dist "aidos-auditor.zip")

    # Report
    Write-Host "`nBuild complete:" -ForegroundColor Green
    Get-ChildItem $dist -Filter "*.zip" | ForEach-Object {
        $size = [math]::Round($_.Length / 1KB, 1)
        Write-Host "  $($_.Name) - ${size} KB" -ForegroundColor Cyan
    }
}
finally {
    Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
