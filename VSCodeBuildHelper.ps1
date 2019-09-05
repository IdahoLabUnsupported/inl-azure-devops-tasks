param(
    [Parameter(Mandatory = $true)]
    [string]$WorkspaceDirectory,

    [Parameter(Mandatory = $true)]
    [string]$FileDirectory
)

# Ensure Drive letter casing matches
if ($WorkspaceDirectory.Substring(1, 1) -eq ":") {
    $WorkspaceDirectory = $WorkspaceDirectory.Substring(0, 1).ToUpper() + $WorkspaceDirectory.Substring(1);
}
if ($FileDirectory.Substring(1,1) -eq ":"){
    $FileDirectory = $FileDirectory.Substring(0,1).ToUpper() + $FileDirectory.Substring(1);
}

# Based on the paths provided determine the task directory name that we will use as the task name for the make file
$dirSeparator = [IO.Path]::DirectorySeparatorChar
$taskBaseDirectory = Join-Path -Path $WorkspaceDirectory -ChildPath "Tasks"
$relativeTaskDirectory = $FileDirectory.Replace($taskBaseDirectory, "")
$pathParts = $relativeTaskDirectory.Split($dirSeparator)
$taskDirectoryName = $pathParts[1]

Write-Output "Running Build for Task: $taskDirectoryName"
Set-Location $WorkspaceDirectory
& npm run build -- --dev --task=$taskDirectoryName
