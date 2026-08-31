# R17/R18 ASGI contract validation

The application image remains the production runtime. The test-only Compose
target derives from that image, installs the pinned test runner, and executes
the existing Admin and mobile/API ASGI contracts without host Python packages.

Run the complete validation target from the repository root:

```sh
node scripts/run_r17_r18_asgi_contracts.mjs
```

The target builds `writing-coach` first, builds `writing-coach-tests` from that
image, and runs:

- `tests/test_r17_admin_routes.py`;
- `tests/test_reference_data_cache.py`;
- `tests/test_session_bootstrap.py`; and
- `tests/test_media_status_compact.py`.

The test service is assigned to Compose's `test` profile, so ordinary
`docker compose up` does not start it; the checked-in runner enables that
profile explicitly.

The test service uses SQLite only for isolated validation and has no dependency
on the PostgreSQL service. It does not start the learner runtime, mutate
production data, or activate providers.
