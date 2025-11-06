Param()

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Output "npm not found, skipping JS checks"
  exit 0
}

Push-Location web
try {
  $force = ($env:WEB_CHECK_INSTALL -eq '1')
  $hasNodeModules = Test-Path node_modules

  if ($force -or -not $hasNodeModules) {
    $mode = if ($force) { 'forced' } else { 'bootstrap' }
    Write-Output "Installing web dependencies ($mode) with 'npm ci'..."
    npm ci --no-fund --no-audit
    $ciCode = $LASTEXITCODE
    if ($ciCode -ne 0) {
      Write-Warning "npm ci failed (exit $ciCode). Falling back to 'npm install' to avoid Windows unlink issues."
      npm install --no-fund --no-audit
      $insCode = $LASTEXITCODE
      if ($insCode -ne 0) {
        Write-Error "Dependency installation failed (npm install exit $insCode)."
        exit 1
      }
    }
  } else {
    Write-Output "Using existing node_modules; set WEB_CHECK_INSTALL=1 to force reinstall"
  }

  function Ensure-LocalTool($tool) {
    if (-not (Test-Path (Join-Path ".\node_modules\.bin" $tool))) {
      Write-Warning "Missing tool '$tool' in node_modules/.bin; running 'npm install' to reconcile devDependencies..."
      npm install --no-fund --no-audit
      if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to provision '$tool' via npm install."
        exit 1
      }
      if (-not (Test-Path (Join-Path ".\node_modules\.bin" $tool))) {
        Write-Error "'$tool' still not found in node_modules/.bin after install."
        exit 1
      }
    }
  }

  Ensure-LocalTool "tsc"
  Ensure-LocalTool "eslint"
  Ensure-LocalTool "vitest"

  # No additional resolver required; ESLint configured to ignore .js unresolved checks in TS ESM imports

  npm run typecheck
  if ($LASTEXITCODE -ne 0) { exit 1 }

  npm run lint
  if ($LASTEXITCODE -ne 0) { exit 1 }

  npm run test:unit
  if ($LASTEXITCODE -ne 0) { exit 1 }
}
finally {
  Pop-Location
}

exit 0

