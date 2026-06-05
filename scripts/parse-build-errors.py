import os
import re
import sys

def main():
    log_path = "ios/xcodebuild.log"
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    
    if not os.path.exists(log_path):
        print(f"Log file not found at {log_path}")
        return

    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        log_content = f.read()

    # Split into lines
    lines = log_content.splitlines()

    critical_errors = []
    failed_commands = []
    capture_failed_commands = False

    for line in lines:
        line_clean = line.strip()
        
        # Capture the Xcode summary section at the end of the log
        if "The following build commands failed:" in line:
            capture_failed_commands = True
            failed_commands.append(line_clean)
            continue
        
        if capture_failed_commands:
            if line_clean == "" or line_clean.startswith("** BUILD FAILED **"):
                capture_failed_commands = False
            else:
                failed_commands.append(line_clean)
                continue

        # Look for compiler, script, or linker errors
        # Strip timestamps from logs (common in CI platforms like GitHub Actions)
        clean_msg = re.sub(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*", "", line_clean)
        
        # Filter target error logs
        if any(term in clean_msg for term in ["error:", "error : ", "PhaseScriptExecution", "clang: error:", "swiftc error:"]):
            # Ignore standard warning tallies or notes to keep the summary high-signal
            if not any(noise in clean_msg for noise in ["warnings generated", "warning:", "note:", "warnings compiled"]):
                critical_errors.append(clean_msg)

    # De-duplicate errors while preserving order
    seen = set()
    deduped_errors = []
    for err in critical_errors:
        if err not in seen:
            seen.add(err)
            deduped_errors.append(err)

    # Format the markdown output
    output = []
    output.append("### :red_circle: Xcode Build Failure Summary\n")
    
    if failed_commands:
        output.append("#### Failed Build Commands:")
        output.append("```text")
        output.append("\n".join(failed_commands))
        output.append("```\n")
        
    if deduped_errors:
        output.append("#### Extracted Critical Errors:")
        output.append("```text")
        # Show first 40 unique errors to avoid flooding
        output.append("\n".join(deduped_errors[:40]))
        if len(deduped_errors) > 40:
            output.append(f"\n... and {len(deduped_errors) - 40} more errors. See the full log file in the build artifacts.")
        output.append("```")
    else:
        output.append("No specific compiler error lines matched. Please inspect the raw logs.")

    markdown_summary = "\n".join(output)

    # If GITHUB_STEP_SUMMARY env is available, write to it, otherwise print to stdout
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as sf:
            sf.write(markdown_summary + "\n")
        print("Build error summary written to GITHUB_STEP_SUMMARY.")
    else:
        print("=== BUILD ERROR SUMMARY ===")
        print(markdown_summary)

if __name__ == "__main__":
    main()
