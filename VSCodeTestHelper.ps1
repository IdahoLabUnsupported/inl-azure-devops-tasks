param(
    [Parameter(Mandatory = $true)]
    [string]$TestName
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

Write-Output "node ./node_modules/mocha/bin/mocha $testPattern"
Write-Output "-------------------------------------------------------------------------------------------------------------------------"
& node ./node_modules/mocha/bin/mocha $testPattern
Write-Output "-------------------------------------------------------------------------------------------------------------------------"