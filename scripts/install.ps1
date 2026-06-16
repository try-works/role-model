#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$OwnerRepo = $(if ($env:ROLE_MODEL_REPOSITORY) { $env:ROLE_MODEL_REPOSITORY } else { "try-works/role-model" }),
    [string]$Version = $(if ($env:ROLE_MODEL_VERSION) { $env:ROLE_MODEL_VERSION } else { "latest" }),
    [string]$InstallRoot = $(if ($env:ROLE_MODEL_INSTALL_ROOT) { $env:ROLE_MODEL_INSTALL_ROOT } else { Join-Path $env:LOCALAPPDATA "Programs\RoleModelRouter" }),
    [string]$BinDir = $(if ($env:ROLE_MODEL_BIN_DIR) { $env:ROLE_MODEL_BIN_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\RoleModelRouter\bin" })
)

$ErrorActionPreference = "Stop"

function Get-Target {
    $architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
    switch ($architecture) {
        ([System.Runtime.InteropServices.Architecture]::X64) { return "win32-x64" }
        default { throw "Unsupported Windows architecture: $architecture" }
    }
}

function Resolve-Version([string]$Repository, [string]$RequestedVersion) {
    if ($RequestedVersion -ne "latest") {
        return $RequestedVersion
    }

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest"
    if (-not $release.tag_name) {
        throw "Failed to resolve the latest release tag."
    }
    return [string]$release.tag_name
}

function Ensure-UserPathContains([string]$PathEntry) {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $parts = @()
    if ($userPath) {
        $parts = $userPath.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries)
    }

    $match = $parts | Where-Object { $_.TrimEnd("\") -ieq $PathEntry.TrimEnd("\") }
    if (-not $match) {
        $newParts = @($PathEntry) + $parts
        [Environment]::SetEnvironmentVariable("Path", ($newParts -join ";"), "User")
        if (-not (($env:Path -split ";") | Where-Object { $_.TrimEnd("\") -ieq $PathEntry.TrimEnd("\") })) {
            $env:Path = "$PathEntry;$env:Path"
        }
        return $true
    }

    return $false
}

$target = Get-Target
$resolvedVersion = Resolve-Version -Repository $OwnerRepo -RequestedVersion $Version
$assetName = "role-model-router-$target.zip"
$downloadUrl = "https://github.com/$OwnerRepo/releases/download/$resolvedVersion/$assetName"
$packageDir = Join-Path $InstallRoot (Join-Path $resolvedVersion $target)
$launcherBatch = Join-Path $packageDir "Role-Model.bat"
$runtimeExe = Join-Path $packageDir "role-model-runtime.exe"
$shimPath = Join-Path $BinDir "role-model-router.cmd"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("role-model-router-" + [System.Guid]::NewGuid().ToString("N"))
$archivePath = Join-Path $tempDir $assetName

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
try {
    if (Test-Path $packageDir) {
        Remove-Item -LiteralPath $packageDir -Recurse -Force
    }

    New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

    Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
    Expand-Archive -LiteralPath $archivePath -DestinationPath $packageDir -Force

    $launcherTarget = if (Test-Path $launcherBatch) { $launcherBatch } else { $runtimeExe }
    if (-not (Test-Path $launcherTarget)) {
        throw "Expected launcher not found in package: $launcherTarget"
    }

    @(
        "@echo off",
        "call `"$launcherTarget`" %*"
    ) -join "`r`n" | Set-Content -LiteralPath $shimPath -Encoding Ascii

    $pathUpdated = Ensure-UserPathContains -PathEntry $BinDir

    Write-Host "Installed role-model-router to $packageDir"
    Write-Host "Launcher command: $shimPath"
    if ($pathUpdated) {
        Write-Host "Updated your user PATH. Open a new terminal before running role-model-router."
    } else {
        Write-Host "Run role-model-router from a new terminal."
    }
}
finally {
    if (Test-Path $tempDir) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force
    }
}
