# OCHE publishing instructions

This ZIP is a complete project, not a GitHub upload attachment.

**To publish:**

1. Extract the entire ZIP into a folder on your Windows computer.
2. Double-click `OCHE_PUBLISH.cmd` inside that folder.
3. If GitHub sign-in is requested, complete it in the browser. Git for Windows is required. The free GitHub CLI is optional; if installed it simplifies sign-in.
4. The uploader checks the source files against hashes, clones the existing `connex222/OCHE-MASTER` repository, copies only the packaged project files, commits and pushes to `main`. It refuses to overwrite differing original source files. It never force pushes.
5. The already-configured `OCHE-MASTER` Render service automatically deploys new commits; check the service dashboard for success.

GitHub: https://github.com/connex222/OCHE-MASTER
Render: https://dashboard.render.com/web/srv-dbsrbnm1egvs73eli4og
Live URL (after a successful deploy): https://oche-master.onrender.com

The producer has NOT published this ZIP and has NOT verified a live Render deployment. The code is unchanged; visual assets and the asset-fetch Docker build are packaged.
