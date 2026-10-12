# CalcMaster Lightweight PowerShell Local Web Server
$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

# ---------------------------------------------------------------
# .env loader — SERVER-SIDE SECRETS
# CURRENCY_API_KEY is read here and served ONLY through the
# /api/rates proxy below. The .env file itself is never sent
# to a browser (see the secret-file block in the request loop).
# The file is re-read on every /api/rates call, so you can paste
# or change the key without restarting the server.
# ---------------------------------------------------------------
$envPath = Join-Path $PSScriptRoot '.env'

function Read-DotEnv {
    param([string]$Path)
    $vars = @{}
    if (Test-Path $Path) {
        foreach ($line in (Get-Content $Path)) {
            $l = $line.Trim()
            if ($l -and -not $l.StartsWith('#')) {
                $i = $l.IndexOf('=')
                if ($i -gt 0) {
                    $k = $l.Substring(0, $i).Trim()
                    $v = $l.Substring($i + 1).Trim().Trim('"').Trim("'")
                    $vars[$k] = $v
                }
            }
        }
    }
    return $vars
}

$bootKey = (Read-DotEnv $envPath)['CURRENCY_API_KEY']
if ($bootKey) {
    Write-Host "Currency API key loaded from .env (kept server-side)"
} else {
    Write-Host "No CURRENCY_API_KEY in .env - the app will use the keyless rate endpoint"
}

try {
    $listener.Start()
    Write-Host "CalcMaster Server running at http://localhost:$port/"
    Start-Process "http://localhost:$port/"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }

        # ---------------------------------------------------
        # 1) /api/rates — currency proxy, key never exposed
        #    Returns an envelope so the client never has to
        #    guess at upstream HTTP status codes:
        #      {"ok":true,"source":"...","payload":{...}}
        #      {"ok":false,"source":"...","error":"..."}
        # ---------------------------------------------------
        if ($localPath -eq "/api/rates") {
            $response.ContentType = "application/json; charset=utf-8"
            $payload = ""
            $currencyApiKey = (Read-DotEnv $envPath)['CURRENCY_API_KEY']

            if (-not $currencyApiKey) {
                # 200 + no-key: the client just moves on to its keyless
                # endpoint without logging a failed request
                $response.StatusCode = 200
                $payload = '{"ok":false,"source":"none","error":"no-key"}'
            } else {
                $upstreamUrl = "https://v6.exchangerate-api.com/v6/$currencyApiKey/latest/USD"
                try {
                    $up = Invoke-WebRequest -Uri $upstreamUrl -UseBasicParsing -TimeoutSec 10
                    $payload = '{"ok":true,"source":"exchangerate-api.com","payload":' + $up.Content + '}'
                    $response.StatusCode = 200
                } catch {
                    $body = ""
                    $status = 0
                    try {
                        $status = [int]$_.Exception.Response.StatusCode
                        $errStream = $_.Exception.Response.GetResponseStream()
                        if ($errStream) {
                            $errStream.Position = 0
                            $reader = New-Object System.IO.StreamReader($errStream)
                            $body = $reader.ReadToEnd()
                            $reader.Close()
                        }
                    } catch {}

                    # Classify: a 404 on the keyed URL means the key itself is
                    # not recognised (the provider answers with an HTML page,
                    # not JSON). Anything else is an infrastructure problem.
                    $errType = "upstream-error"
                    if ($body -match '"error-type"\s*:\s*"([^"]+)"') {
                        $errType = $Matches[1]
                    } elseif ($status -eq 404) {
                        $errType = "unsupported-key"
                    }

                    $response.StatusCode = 200
                    $payload = '{"ok":false,"source":"exchangerate-api.com","error":"' + $errType + '"}'
                    Write-Host "Currency proxy error: $errType (upstream HTTP $status)"
                }
            }

            $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # ---------------------------------------------------
        # 2) Block secrets and dotfiles (.env, .git, ...)
        # ---------------------------------------------------
        $leaf = Split-Path $localPath -Leaf
        $isSecret = ($localPath -match '\.\.') -or
                    ($localPath -match '\.env') -or
                    ($localPath -match '(^|/)\.') -or
                    ($localPath -match '\.ps1$')

        if ($isSecret) {
            $response.StatusCode = 404
            $response.Close()
            continue
        }

        # ---------------------------------------------------
        # 3) Static files
        # ---------------------------------------------------
        $filePath = Join-Path $PSScriptRoot $localPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)

            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript" }
            elseif ($filePath.EndsWith(".json")) { $response.ContentType = "application/json" }
            else { $response.ContentType = "application/octet-stream" }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} catch {
    Write-Host "Server stopped: $_"
} finally {
    $listener.Stop()
}
