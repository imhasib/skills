# Workflow safety guard — blocks direct pushes to main/master and force pushes.
# Wired from .claude/settings.json as a PreToolUse hook on Bash and PowerShell.
# Receives tool input as JSON on stdin. Exit 2 = block (stderr shown to Claude).

$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = $null
if ($json.tool_input -and $json.tool_input.command) {
    $cmd = [string]$json.tool_input.command
}
if (-not $cmd) { exit 0 }

# Normalize whitespace for matching
$flat = ($cmd -replace '\s+', ' ').Trim()

# Block direct push to main / master
if ($flat -match '\bgit\s+push\b.*\b(origin\s+)?(main|master)\b' -and $flat -notmatch '\bgit\s+push\b.*:(main|master)\b') {
    [Console]::Error.WriteLine("BLOCKED by workflow guard: direct push to main/master is not allowed.")
    [Console]::Error.WriteLine("  Command: $cmd")
    [Console]::Error.WriteLine("  Per WORKFLOW.md, the workflow stops at PR creation; merging is manual.")
    [Console]::Error.WriteLine("  If this was intentional outside the workflow, run it from your own terminal.")
    exit 2
}

# Block force pushes anywhere
if ($flat -match '\bgit\s+push\b.*\s(-f|--force|--force-with-lease)(\s|$)') {
    [Console]::Error.WriteLine("BLOCKED by workflow guard: force push is not allowed.")
    [Console]::Error.WriteLine("  Command: $cmd")
    [Console]::Error.WriteLine("  Force pushes can destroy collaborator work. If genuinely needed, run from your own terminal.")
    exit 2
}

# Block CLI merge that touches main/master
if ($flat -match '\bgit\s+merge\b' -and $flat -match '\b(main|master)\b') {
    [Console]::Error.WriteLine("BLOCKED by workflow guard: CLI merge involving main/master is not allowed.")
    [Console]::Error.WriteLine("  Command: $cmd")
    [Console]::Error.WriteLine("  Use a PR per WORKFLOW.md.")
    exit 2
}

exit 0
