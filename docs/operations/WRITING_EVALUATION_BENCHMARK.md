# Writing Evaluation Benchmark Operations

## Purpose

This runner applies the versioned Writing quality benchmark to normalized
learner-facing evaluation results. It supports deterministic offline replay and
prepares a separately human-gated live orchestration path. A benchmark PASS is
quality evidence for the selected scope only; it does not authorize deployment,
runtime activation, public release, or promotion of Writing to COMPLETE.

The benchmark uses the single product capability identity
`writing_evaluator` for both English and Chinese. It never defines a
language-specific evaluator capability.

## Replay mode

Replay makes no provider or network request:

```powershell
python scripts/run_writing_evaluation_benchmark.py `
  --input benchmark-results.json `
  --output benchmark-report.json
```

The UTF-8 input is a duplicate-free JSON object:

```json
{
  "benchmark_version": 1,
  "evaluator_label": "reviewed-model-v1",
  "results": {
    "en-clean-agreement": {
      "grammar": 80,
      "vocabulary": 75,
      "coherence": 75,
      "task_achievement": 75,
      "naturalness": 75,
      "cefr_estimate": "B1",
      "summary_vi": "...",
      "strengths_vi": [],
      "priorities_vi": [],
      "strength_evidence": [],
      "errors": []
    }
  }
}
```

The input benchmark version must exactly match the code-owned corpus version.
Unknown or duplicate case IDs, malformed results, unsafe evaluator labels, and
missing rubric dimensions fail closed. Old benchmark data is not upgraded
automatically. English results use the English error taxonomy; Chinese results
use the Chinese taxonomy.

## Partial runs

Select cases or one language explicitly:

```powershell
python scripts/run_writing_evaluation_benchmark.py `
  --input benchmark-results.json `
  --case en-clean-agreement `
  --case zh-clean-word-order

python scripts/run_writing_evaluation_benchmark.py `
  --input benchmark-results.json `
  --language en
```

Reports label the scope as `full` or `partial` and include selected and missing
case counts. A partial scope may pass, but `full_corpus_certified` remains
false. A comparison with only one selected side is `not_executed`; it is never
reported as passing.

Pairwise comparisons reuse the two selected case results. Target-level
comparisons likewise reuse captured results and receive the declared language
profile ordering rather than embedding CEFR or HSK ordering in generic logic.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Selected benchmark scope passed. |
| `1` | Linguistic/quality benchmark failure. |
| `2` | Invalid input, unsafe usage, cancellation, or unavailable live integration. |
| `3` | Evaluator/provider execution failure or malformed live result. |

Provider execution failure is not evidence that linguistic quality failed.
The report preserves that distinction through `status`, case execution state,
and `execution_failures`.

An execution failure means the evaluator could not produce a usable normalized
result. A benchmark quality failure means a usable result violated one or more
quality constraints. Operators must not interpret either status as the other.

## Report and overwrite safety

The aggregate UTF-8 report includes corpus and selection counts, individual
case findings, comparison states, failure-category counts, and full-corpus
certification state. Arbitrary input fields are not copied into output; only
the benchmark's normalized learner-facing result fields are retained.

Existing output and capture files are not overwritten. Use `--force` only when
replacement is intentional:

```powershell
python scripts/run_writing_evaluation_benchmark.py `
  --input benchmark-results.json `
  --output benchmark-report.json `
  --force
```

Do not put API keys, Authorization headers, environment dumps, database URLs,
OAuth secrets, or Cloudflare credentials in input, labels, output, or command
arguments. Credentials remain in the existing server-managed runtime.

## Live mode — human gate

Every real provider benchmark, paid request, production credential use, or
runtime/configuration change requires explicit human authorization. The live
path requires all three safety signals plus a safe label:

```text
--live --acknowledge-provider-cost --yes --evaluator-label SAFE_LABEL
```

Before any injected evaluator is called, the runner prints:

- selected case count;
- full or partial scope;
- `maximum_live_requests`, equal to the selected case count;
- capability identity `writing_evaluator`.

There is at most one evaluator request per selected case. Pairwise and
target-level checks reuse those results. There is no second-pass judge, retry
through another provider, provider discovery, or synthetic substitution. There
is no provider-to-provider fallback.

The standalone CLI intentionally does **not** install a real live adapter at
this checkpoint. The current learner evaluation pipeline is assembled inside
`app.py`; importing it in an operator script would introduce application
side effects. Even with all live flags, the standalone command therefore exits
with code `2` and makes zero requests. A later reviewed integration must inject
one callable that exercises the same complete learner `writing_evaluator`
capability path, including request/schema construction and normalization. It
must not call a provider directly or bypass capability routing.

Tests exercise the live orchestration only with deterministic fake callables.
No provider benchmark was executed while establishing this runbook.

## Preserving a future live capture

Once a reviewed application adapter exists, live orchestration can write both
the aggregate report and normalized replay capture:

```text
--live --acknowledge-provider-cost --yes --evaluator-label SAFE_LABEL
--output benchmark-report.json --capture benchmark-results.json
```

The capture uses the same versioned replay envelope documented above. It can be
archived and replayed offline later. `--capture` never stores credentials or a
raw provider envelope, and normal overwrite rules still apply.
