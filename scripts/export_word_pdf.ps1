param(
    [Parameter(Mandatory = $true)][string]$InputDocx,
    [Parameter(Mandatory = $true)][string]$OutputPdf,
    [Parameter(Mandatory = $true)][string]$LogPath
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
    $line = "$(Get-Date -Format o) $Message"
    Add-Content -LiteralPath $LogPath -Value $line
}

$word = $null
$doc = $null
Set-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o) START"

try {
    Write-Step 'CREATE_WORD'
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.Options.PrintBackground = $false
    $word.Options.SavePropertiesPrompt = $false
    Write-Step "WORD_READY version=$($word.Version)"

    $absoluteInput = (Resolve-Path -LiteralPath $InputDocx).Path
    $absoluteOutput = [System.IO.Path]::GetFullPath($OutputPdf)
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($absoluteOutput)) | Out-Null

    Write-Step 'OPEN_DOCUMENT'
    $doc = $word.Documents.OpenNoRepairDialog($absoluteInput, $false, $true, $false)
    Write-Step 'DOCUMENT_OPEN'
    $doc.Repaginate()
    $pages = $doc.ComputeStatistics(2)
    Write-Step "PAGE_COUNT=$pages"
    $doc.ExportAsFixedFormat($absoluteOutput, 17)
    Write-Step "PDF_EXPORTED=$absoluteOutput"
}
catch {
    Write-Step "ERROR=$($_.Exception.ToString())"
    throw
}
finally {
    if ($doc) {
        Write-Step 'CLOSE_DOCUMENT'
        $doc.Close(0)
    }
    if ($word) {
        Write-Step 'QUIT_WORD'
        $word.Quit()
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    Write-Step 'DONE'
}
