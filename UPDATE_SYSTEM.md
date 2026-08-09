# Update system (v0.3.0)

This project has two update paths.

## 1) While developing locally: instant Docker refresh

Requires Docker Compose 2.22+.

```powershell
.\start_dev.ps1
```

`app.py` / `VERSION` changes are synced and the service restarts. `templates/` and `static/` are synced directly. A `requirements.txt` change triggers an image rebuild.

## 2) After the source is stored in Git: unattended update

The project folder must be a normal Git clone with an `origin` remote. The updater:

1. fetches `origin/main`;
2. does nothing if the commit is unchanged;
3. refuses to overwrite uncommitted local source;
4. stops only the writing service briefly;
5. backs up SQLite to `backups/`;
6. performs `git pull --ff-only`;
7. rebuilds/recreates Docker;
8. preserves the stable Docker volume `ai-writing-coach-data`.

Manual check/update:

```powershell
.\scripts\update_from_git.ps1
```

Install a Windows scheduled check every 5 minutes:

```powershell
.\scripts\install_auto_update_task.ps1 -EveryMinutes 5
```

Remove it:

```powershell
.\scripts\remove_auto_update_task.ps1
```

## Stable data

Compose now uses an explicit volume name:

`ai-writing-coach-data`

so changing the source folder/release name does not create a new database volume.

If you already used an older ZIP, try once:

```powershell
.\scripts\migrate_old_volume.ps1
```

The script copies `writing.db` and never deletes the old volume.

## Future database changes

The backend now establishes SQLite `PRAGMA user_version = 1`. Future releases should add ordered migrations (1 -> 2 -> 3...) rather than recreating tables. This is required before adding larger features.
