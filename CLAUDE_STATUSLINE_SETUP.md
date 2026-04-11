# Claude Code Status Line Setup

Custom status line showing model, context window usage, token counts, and session cost.

## Output Format

```
[Claude Sonnet 4.6] Context: ▓▓▓░░░░░░░ 30% | Tokens: 45,678 | In: 44,000 Out: 1,678 | Session: $0.0000
```

## Files Created

### `~/.claude/statusline.sh`

Bash script that receives Claude Code session JSON via stdin and formats the status line.

```bash
#!/bin/bash
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name')
USED=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
IN_TOK=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
OUT_TOK=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
TOTAL=$((IN_TOK + OUT_TOK))
comma() { printf "%d" "$1" | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta'; }
BAR_WIDTH=10
FILLED=$((USED / 10))
EMPTY=$((BAR_WIDTH - FILLED))
BAR=$(printf "%${FILLED}s" | tr ' ' '▓')$(printf "%${EMPTY}s" | tr ' ' '░')
printf "[%s] Context: %s %s%% | Tokens: %s | In: %s Out: %s | Session: $%.4f" "$MODEL" "$BAR" "$USED" "$(comma $TOTAL)" "$(comma $IN_TOK)" "$(comma $OUT_TOK)" "$COST"
```

### `~/.claude/settings.json`

Wires the script into Claude Code's status line:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline.sh"
  }
}
```

## Setup Steps

1. Create the script at `~/.claude/statusline.sh` with the content above
2. Make it executable: `chmod +x ~/.claude/statusline.sh`
3. Add the `statusLine` block to `~/.claude/settings.json`
4. Restart Claude Code

## Notes

- Requires `jq` to be installed (`brew install jq`)
- `cost.total_cost_usd` may not be available in the status line JSON schema — the Session field may always show `$0.0000`
- Token counts are formatted with commas using a `sed`-based `comma()` helper function
- The context bar uses `▓` for used and `░` for remaining, scaled to 10 characters