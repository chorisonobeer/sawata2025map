# プロジェクトの全コードをエクスポートするスクリプト
$outputDir = $PWD.Path
$outputFile = Join-Path $outputDir "Project-All-Code-Export.txt"

# 除外するファイル名のリスト
$excludeFiles = @(
    "package-lock.json",
    ".gitignore",
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".DS_Store",
    "export-code.ps1",
    "export-code.bat",
    "Project-All-Code-Export.txt"
)

# 除外するディレクトリのリスト
$excludeDirs = @(
    "node_modules",
    ".git",
    ".next",
    "out",
    "dist",
    ".vscode",
    "coverage"
)

# 対象とする拡張子
$includeExts = @(
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    ".json",
    ".md",
    ".css",
    ".html",
    ".toml"
)

# 出力開始
@"
<documents>
"@ | Out-File -FilePath $outputFile -Encoding utf8

# 全ファイルを対象に
$files = Get-ChildItem -Path $outputDir -Recurse -File | Where-Object { 
    $includePath = $true
    
    # 除外ディレクトリのチェック
    foreach ($dir in $excludeDirs) {
        if ($_.FullName -like "*$dir*") {
            $includePath = $false
            break
        }
    }
    
    # 除外ファイルのチェック
    if ($_.Name -in $excludeFiles) {
        $includePath = $false
    }
    
    # 拡張子のチェック
    if ($_.Extension -notin $includeExts) {
        $includePath = $false
    }
    
    $includePath
}

$index = 1
foreach ($file in $files) {
    # ファイルサイズチェック (1MB以上は除外)
    if ($file.Length -gt 1MB) {
        Write-Warning "Skipping large file $($file.Name) (size: $($file.Length) bytes)"
        continue
    }

    # ファイルパスを相対パスに変換
    $relativePath = $file.FullName.Replace($outputDir, "").TrimStart("\")
    
    @"
<document index="$index">
<source>$relativePath</source>
<document_content>
"@ | Add-Content -Path $outputFile -Encoding utf8

    try {
        $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding utf8 -ErrorAction Stop
        if ($content) {
            $content | Add-Content -Path $outputFile -Encoding utf8
        }
    }
    catch {
        Write-Warning "Error reading file $($file.FullName): $_"
        "Error reading file content" | Add-Content -Path $outputFile -Encoding utf8
    }

    @"
</document_content>
</document>
"@ | Add-Content -Path $outputFile -Encoding utf8
    
    $index++
}

@"
</documents>
"@ | Add-Content -Path $outputFile -Encoding utf8

Write-Host "Export completed to $outputFile with $($files.Count) files"