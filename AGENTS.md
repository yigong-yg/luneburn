# AGENTS.md

This file is the shared operating contract for all coding and review agents working on Luneburn, including generator agents and reviewer agents.

Luneburn is a portfolio artifact: a static React/TypeScript app that visualizes how measurement methods diverge against known synthetic ground truth. The goal is not to build a SaaS product. The goal is a rigorous, legible, testable artifact that can survive close review by a senior measurement practitioner.

## Read First

Before changing code or reviewing code, read:

- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_STARTUP_PROMPT.md` when starting from a fresh session
- This `AGENTS.md`

The `docs/` directory is intentionally gitignored, but it is authoritative local planning context. If the docs are missing in your environment, say so and proceed conservatively from this file.

## P0 Privacy And Local-State Hygiene

This is the first gate for every agent, before implementation or review. Do not commit local agent state, credentials, private machine paths, local usernames, browser artifacts, or private prompt/config files. Treat this as P0 because Luneburn is public from day one.

Forbidden in git:

- Local agent/editor directories such as `.claude/`, `.codex/`, `.cursor/`, `.continue/`, `.windsurf/`, and `.aider*`.
- Local secrets or credentials: `.env*` except committed examples, API keys, auth tokens, passwords, private keys, certificates, SSH keys, and service account material.
- Machine-local absolute paths such as `C:\Users\...`, `/Users/...`, or `/home/...`.
- Local browser/test artifacts, screenshots, logs, caches, or generated review output.
- Personal contact data beyond intentional public authorship metadata already present in the license or public profile materials.

Before staging or committing, run a focused hygiene check:

```bash
git status --short
git grep -n -I -E "(gh[pousr]_|github_pat_|sk-|OPENAI_API_KEY|api[_-]?key|secret|token|password|passwd|private[_-]?key|-----BEGIN)" -- . ':!package-lock.json'
git grep -n -I -E "(C:\\\\Users\\\\|/Users/|/home/)" -- . ':!package-lock.json'
```

If a sensitive file was ever committed, remove it from tracking immediately, add a durable ignore rule, and tell Yi whether public history needs rotation or rewrite. Never bury this in a feature commit.

## Core Rules

- Keep scope tight. No backend, no auth, no database, no user-uploaded data, no server-side state.
- Do not expand beyond the current milestone. V0 means hero view, Super Bowl, last-touch, DiD-TWFE, fixture tests, local/deployed app.
- Use small, reviewable changes. Prefer commit-sized slices even when you are not asked to create commits.
- Never rewrite unrelated files or revert user changes you did not make.
- Keep pure logic in `src/lib`; side effects belong in `src/components`, `src/hooks`, or `src/state`.
- Keep narrative logic typed. Components branch on `HeroScenarioConfig`, `EstimationResult.status`, `assumptionFlags`, and palette kind. Do not bury `scenarioId === "commerce-channel-launch"` behavior inside UI components.
- Status is not color-only. Warnings and invalid states need labels, badges, text, or numeric readouts.

## Commands

Run these from the repository root:

```bash
npm run lint
npm run test
npm run build
npm run dev
```

Use `npm run dev` for local browser checks. Use `npm run preview` only after a production build if you need to inspect the built artifact.

## Test-Driven Development

Work in this loop:

1. Write or update the smallest meaningful test first.
2. Run the test and confirm it fails for the right reason.
3. Implement the smallest code change that makes it pass.
4. Run the local target test, then the relevant full suite.
5. Only then polish UI or refactor.

For estimator work, every method needs the three-fixture matrix:

- Validity fixture: assumptions satisfied, recovers `tau_comp` within documented tolerance.
- Stress fixture: known failure mode triggered, bias direction and warning flags match theory.
- Unsupported fixture: structural assumptions violated, returns `status: "invalid"` with no fake estimate.

For frontend work, tests should cover typed state transitions and rendering-critical branches, but browser interaction is mandatory for acceptance.

## Never Cheat Evaluation

The point of this project is credibility. Do not make tests pass by weakening the project.

Forbidden:

- Do not delete, skip, or loosen tests to pass CI.
- Do not lower thresholds without updating the relevant docs and explaining why.
- Do not hard-code outputs only to satisfy tests.
- Do not mock away the behavior under review.
- Do not hide warnings or invalid states to make the UI look cleaner.
- Do not use `any`, broad casts, or type suppression as a shortcut.
- Do not make estimator functions read `dataset.groundTruth.comparisonEstimand` to produce the estimate.
- Do not make estimator functions read `counterfactualOutcomes` as if they were observable data.

Allowed:

- Estimation results may compute `coverage95` by comparing the confidence interval to `groundTruth.comparisonEstimand`, because coverage is a diagnostic.
- Tests may use `groundTruth` and `counterfactualOutcomes` as oracle data.
- UI may display ground truth because known truth is the artifact's central premise.

If a fixture reveals that the documented failure mode is wrong, do not force the code to match the document. Report the mismatch, update the design, then update code and tests.

## Browser And Playwright Review

Any meaningful frontend change requires browser verification. A screenshot alone is not enough.

Use Playwright, the in-app browser, or equivalent browser automation to:

- Load the app.
- Click every visible button and segmented control.
- Change every select/dropdown option.
- Drag or keyboard-adjust every slider.
- Exercise every view mode currently implemented.
- Switch every scenario currently implemented.
- Confirm warning and invalid states render as labels/badges/text, not color alone.
- Check desktop and mobile viewport widths.
- Confirm text does not overflow, overlap, or become unreadable.
- Confirm `prefers-reduced-motion` behavior if animation is introduced.

For V0/Session 0 specifically, click through:

- Super Bowl state.
- Commerce Launch state.
- Scenario selector.
- All sliders.
- Reset button if present.

If browser automation is unavailable, state that explicitly in the final report and list the manual checks that still need to be run.

## Generator Agent Protocol

Before editing:

- State the narrow slice you are implementing.
- Identify the tests or browser checks that will prove it works.
- Check the worktree for existing changes and avoid unrelated files.

During implementation:

- Keep changes small.
- Add tests before or alongside code.
- Prefer named exports.
- Preserve existing visual and type contracts.
- Do not introduce new dependencies without a clear reason.

Before handing off:

- Run `npm run lint`, `npm run test`, and `npm run build` unless a command is impossible.
- Run browser interaction checks for frontend changes.
- Provide a review packet with:
  - Goal of the change.
  - Files changed.
  - Tests added or updated.
  - Commands run and results.
  - Browser interactions performed.
  - Known risks or TODOs.
  - Any intentional deviations from `SPEC.md` or `ARCHITECTURE.md`.

## Reviewer Agent Protocol

Default to code-review posture: findings first, ordered by severity. Look for bugs, behavioral regressions, missing tests, architectural drift, and false confidence.

Review both code and evidence:

- Read the diff.
- Read nearby files, not just changed lines.
- Re-run the relevant tests.
- Run the app and use browser automation.
- Verify that the generator's review packet is true.
- Try to falsify the acceptance criteria.

Specific review targets:

- Estimators do not cheat by reading ground truth or counterfactuals.
- Fixture tests actually fail when implementation is wrong.
- Status logic handles `ok`, `warning`, and `invalid`.
- Commerce Launch remains `fails-instructively`, not green-success framed.
- Hero view uses role palette; compare-all uses method palette.
- Components do not encode scenario-specific behavior with raw scenario-id conditionals.
- Slider changes affect the expected state, not just cosmetic labels.
- Every visible interactive control has been clicked or keyboard-adjusted.
- Accessibility basics hold: labels, contrast, keyboard navigation, no color-only meaning.
- No scope creep: upload, auth, backend, real-data measurement, or unnecessary platform work.

When reporting, include:

- Findings with file/line references when possible.
- Missing tests or missing browser checks.
- Commands run.
- Browser actions performed.
- Residual risk.

If there are no issues, say that clearly and still mention remaining test gaps or risks.

## Maximizing Claude Code Review Effectiveness

Claude Code is most useful when the change is small, the intent is explicit, and the evidence is reproducible. Help the reviewer by making the review surface crisp.

Do:

- Keep PRs or working slices under one conceptual change.
- Prefer one estimator, one UI behavior, or one state contract per slice.
- Include the review packet described above.
- Leave tests named after the behavior they protect.
- Keep generated data deterministic with seeds.
- Keep visual states easy to reach through explicit scenario/stub controls.
- Use typed contracts instead of prose-only conventions.
- Add comments only where a reviewer would otherwise have to reverse-engineer statistical intent.

Do not:

- Hand off a giant "everything changed" diff.
- Mix visual polish, estimator math, dependency churn, and doc edits in one slice.
- Hide failing checks behind "not relevant."
- Ask the reviewer to infer intent from screenshots.
- Make the reviewer discover undocumented assumptions.

Preferred review cadence:

1. Session 0 visual skeleton.
2. Super Bowl DGP + ground-truth tests.
3. Last-touch estimator + fixture matrix.
4. DiD-TWFE estimator + fixture matrix.
5. Hero chart wired to real estimates.
6. README screenshot + 90-second tour + V0 deploy.

Each slice should be independently reviewable and leave the app runnable.
