# Luneburn

**A Measurement Assumption Lab.** Same campaign. Same truth. Different assumptions.

Luneburn is a static, interactive portfolio artifact by [Yi Gong](https://github.com/yigong-yg). It uses synthetic campaigns with known counterfactual outcomes to show where measurement methods diverge, and when their numbers answer different questions.

![The assumption lab: last-touch and DiD estimates against the same synthetic truth](public/luneburn-preview.png)

## A 90-second tour

1. **0–20 seconds: inspect the assumption lab.** At seed 42, the true average post-period weekly lift is 1.32%. Last-touch reports 2.39%; DiD-TWFE reports 1.60%. The intervals, warning labels, and seed stability band make the disagreement inspectable.
2. **20–40 seconds: move channel correlation.** Use `ρ → ref`, then `Replay drift from reference`. Last-touch drifts while the truth stays fixed. Open Calibration to vary the effect and noise, or Methodology to inspect what the design assumes.
3. **40–65 seconds: follow Estimand contracts.** At seed 2307, Search receives about 42% of observed path credit, while the paired oracle says switching Search off costs 129 conversions. Each panel names its own question and denominator. Video's negative MMM estimate is visibly flagged and explained.
4. **65–90 seconds: choose the question before the number.** Switch among path credit, channel-off effects, and joint-lift allocation. Move Demand capture or Search × Video synergy, answer the decision check, and use Copy this state to reproduce the estimand lab's exact settings.

The numbers above describe the canonical defaults; the app computes them from seeded data. A channel-off effect and a Shapley allocation are different quantities. Observational path credit is never labeled causal lift.

## Run locally

Use Node.js 22 and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. The routes are `#/assumptions` and `#/estimands`. Page two encodes its controls, question, and seed in the URL; page one's controls currently remain local state.

## Verify

```sh
npm run lint
npm test
npm run build
```

The GitHub Actions workflow runs the same checks on pushes and pull requests and caps built JavaScript at 80 kB gzip. Separately, pre-release browser acceptance must exercise both routes at desktop and 390px, including every control, warning labels, copy round trips, and keyboard navigation; that sweep is not part of CI.

Tests cover deterministic generation, paired-oracle invariants, estimator validity/stress/unsupported fixtures, question and unit compatibility, URL state, and rendering-critical interactions. Estimators cannot use the oracle to produce estimates; known truth is for display and diagnostics.

## Design and limits

React, strict TypeScript, Vite, Tailwind, Zustand, and bespoke SVG charts. All computation runs in the browser. There are no accounts, uploads, backend, or real-data measurement features. Analytics currently dispatch local events without a network provider.

- **Assumption stress:** one synthetic Super Bowl scenario, last-touch attribution, and DiD-TWFE.
- **Estimand contracts:** one multichannel scenario, Markov path credit, MMM-lite, and paired channel-off and Shapley oracles. MMM is deliberately small enough to audit; it is not a production planning model.
- **Uncertainty:** displayed intervals depend on the method's assumptions. Coverage of one known truth does not certify identification. The seed band is a deterministic sweep, not a confidence interval.

## Deployment

The production build is the static `dist/` directory. For a Vercel project, use the repository root, the Vite preset, `npm run build`, and output directory `dist`. Hash routes do not require server rewrites. No application secrets are required.

Public launch is pending. A production URL will be added after both routes have been verified on the deployed build.

[MIT license](LICENSE).
