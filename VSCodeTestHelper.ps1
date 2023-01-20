param(
    [Parameter(Mandatory = $true)]
    [string]$TestName,

    [Parameter(Mandatory = $false)]
    [switch]$NoMocha
)

# Get our paths that we need
$scriptPath = Split-Path $MyInvocation.MyCommand.Path -Parent
$buildDirectory = Join-Path -Path $scriptPath -ChildPath "_build"

# Build the test pattern
$testPattern = Join-Path -Path $buildDirectory -ChildPath "**"
if ($TestName.StartsWith("*")) {
    $testPattern = Join-Path -Path $testPattern -ChildPath $TestName
} else {
    $testPattern = Join-Path -Path $testPattern -ChildPath "*$TestName"
}
if (-Not $TestName.EndsWith(".js") -or -Not $TestName.EndsWith("*")) {
    $testPattern += "*.js"
}

if ($NoMocha) {
    $files = Get-ChildItem $testPattern -Recurse
    Write-Output "node $testPattern"
    Write-Output "-------------------------------------------------------------------------------------------------------------------------"
    foreach ($file in $files) {
        & node $file.FullName
    }
    Write-Output "-------------------------------------------------------------------------------------------------------------------------"
}
else {
    Write-Output "node ./node_modules/mocha/bin/mocha $testPattern"
    Write-Output "-------------------------------------------------------------------------------------------------------------------------"
    & node ./node_modules/mocha/bin/mocha $testPattern
    Write-Output "-------------------------------------------------------------------------------------------------------------------------"
}