# Agent guidance

Read applicable `CLAUDE.md`, `.claude/CLAUDE.md`, and `.claude/rules/*.md` instructions.
At conversation startup, also read `$HOME/.claude/CLAUDE.md` and applicable rules under
`$HOME/.claude/rules/`. Treat these as supplementary guidance, subject to instruction priority.

## Codex Fast mode troubleshooting

Verified 2026-10-23 against official OpenAI documentation and installed Codex CLI 0.163.0.

- Do not recommend `/fast` unconditionally. Its availability depends on the interface,
  effective `fast_mode` feature flag, and the active model's advertised service tiers.
- This machine's CLI reported `fast_mode stable false`, although user configuration already
  selected `service_tier = "fast"`. This is evidence of a disabled feature, not proof of
  the desktop app's effective configuration or account entitlement.
- For a new terminal CLI session, use the native invocation below. It enables the feature
  and selects Fast for that invocation without editing the user's configuration:

  ```sh
  codex --enable fast_mode -c 'service_tier="fast"'
  ```

- Read-only check, verified locally to report `fast_mode stable true`:

  ```sh
  codex --enable fast_mode -c 'service_tier="fast"' features list
  ```

  This checks the feature override, not server acceptance or actual inference speed.
  `--strict-config` is not supported by `codex features` in this installed version.
- In the new interactive CLI, check `/` for available commands. Use `/fast` only if listed;
  it toggles the tier, so do not blindly toggle it after explicitly selecting Fast.
  `/statusline` can add a Fast status indicator. If unavailable, inspect `/debug-config`
  and model/account support rather than repeatedly suggesting `/fast`.
- For persistent configuration, official documentation specifies top-level
  `service_tier = "fast"` and `fast_mode = true` in the existing `[features]` table.
  Do not add a duplicate table or automatically modify harness configuration.
- A CLI launch does not change an already running desktop app or conversation. Do not
  invent an app slash command or promise that a custom command can grant Fast access.
- Official subscription Fast mode requires supported models and ChatGPT sign-in;
  API-key sessions are a separate case. Included subscription usage is charged at 2.5x
  Standard; purchased credits and Enterprise pay-as-you-go at 2x, per the checked docs.
- Report the evidence boundary: no paid inference or desktop UI was tested for this note.

Sources:

- https://learn.chatgpt.com/docs/agent-configuration/speed
- https://learn.chatgpt.com/docs/developer-commands
- https://learn.chatgpt.com/docs/config-file/config-reference
