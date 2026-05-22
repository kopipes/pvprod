# SOT Deployment Rules

## Source Code
- SOT app source code is managed in GitHub.
- Always check Git status before deployment.
- Pull or deploy only from the intended GitHub branch.
- Do not deploy uncommitted or unclear local changes.

## Database
- SOT database is hosted on the VPS.
- Before any database structure/schema update, always create a backup first.
- Database backup must be restorable so changes can be rolled back.
- Do not run migrations, schema changes, table changes, or destructive DB commands without confirming that a backup exists.
- If a DB update fails, stop and report the issue instead of trying random fixes.

## Existing Services
- Do not bother, stop, overwrite, delete, or restart unrelated existing applications or services on the VPS.
- During deployment, only touch files, processes, services, and database objects that belong to SOT.
- Before restarting anything, confirm the service/process name is for SOT.
- Do not modify global VPS config unless explicitly required and confirmed.
- Do not overwrite existing `.env`, Nginx configs, PM2 configs, systemd services, or database data without backup/confirmation.

## Sync Requirement
- If there are any code, config, or deployment changes, make sure local, GitHub, and VPS are synchronized.
- Before deployment, check local status with `git status`.
- Make sure local committed changes are pushed to GitHub.
- Make sure the VPS pulls the correct latest commit from GitHub.
- After deployment, verify the VPS is running the same commit as GitHub.
- Do not leave changes only on local, only on GitHub, or only on the VPS unless explicitly instructed.
- If there is a mismatch between local, GitHub, and VPS, stop and report the mismatch before continuing.

## Deployment Safety Checklist
Before deployment:
1. Confirm target app is SOT.
2. Confirm GitHub branch.
3. Run `git status`.
4. Confirm deployment path.
5. Confirm the service/process belongs to SOT.
6. If database structure will change, backup the VPS database first.
7. Deploy without affecting unrelated apps/services.
8. Verify SOT works after deployment.
9. Confirm local, GitHub, and VPS are synchronized.
10. Confirm VPS is running the latest intended GitHub commit.