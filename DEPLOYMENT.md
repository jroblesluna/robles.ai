# Deployment

## How it works

```
push.sh (local)  →  git commit + push to GitHub main
                         ↓
              GitHub Actions (.github/workflows/deploy.yml)
                         ↓
              SSH into VPS  →  pull.sh (git pull + build + pm2 restart)
```

After the one-time setup below, the full cycle is:

```bash
bash push.sh    # commit, push — deploy starts automatically
```

---

## One-time setup (GitHub Secrets)

The workflow authenticates to the VPS via SSH key. You need to add four secrets
to the GitHub repo (Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP or hostname (e.g. `123.45.67.89` or `robles.ai`) |
| `VPS_USER` | SSH user on the VPS (e.g. `ubuntu`, `antonio`, or `root`) |
| `VPS_SSH_KEY` | **Private** SSH key that has access to the VPS (the full contents of `~/.ssh/id_rsa` or equivalent — see below) |
| `VPS_REPO_PATH` | Absolute path to the repo on the VPS (e.g. `/home/ubuntu/robles.ai`) |

### Generating the SSH key pair (if you don't have one already)

On your Mac:

```bash
# Generate a dedicated deploy key (no passphrase)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""

# Copy the PUBLIC key to the VPS (authorize it to connect)
ssh-copy-id -i ~/.ssh/github_deploy.pub VPS_USER@VPS_HOST

# Verify it works
ssh -i ~/.ssh/github_deploy VPS_USER@VPS_HOST "echo connected"
```

Then add the **private key** (`~/.ssh/github_deploy`, the one WITHOUT `.pub`) as
the `VPS_SSH_KEY` secret:

```bash
# Print the private key to copy-paste into the GitHub secret
cat ~/.ssh/github_deploy
```

### Adding secrets via CLI (optional, faster than the UI)

```bash
gh secret set VPS_HOST      --repo jroblesluna/robles.ai
gh secret set VPS_USER      --repo jroblesluna/robles.ai
gh secret set VPS_SSH_KEY   --repo jroblesluna/robles.ai < ~/.ssh/github_deploy
gh secret set VPS_REPO_PATH --repo jroblesluna/robles.ai
```

---

## pull.sh (on the VPS)

The script the workflow triggers. It fetches `origin/main` and inspects **which
files changed** to do only the work that's justified — no more blind rebuilds:

| Changed files | Action |
|---------------|--------|
| `package.json` / `package-lock.json` | `npm install` + build + pm2 restart |
| `src/`, `server/`, `shared/`, configs (vite/tailwind/tsconfig), `index.html` | build + pm2 restart |
| only `server/data/` (blog posts) | sync data into `dist/` + pm2 restart (no compile) |
| only docs / `*.sh` / `.gitignore` | nothing (server left running) |
| no new commits | no-op |

Make sure it is executable on the VPS:
```bash
chmod +x pull.sh
```

---

## Manual deploy (fallback)

If GitHub Actions is unavailable or you need to deploy without pushing:

```bash
# From your Mac (SSH into VPS and run pull.sh)
ssh VPS_USER@VPS_HOST "cd /path/to/robles.ai && bash pull.sh"

# Or run push.sh locally which commits + pushes (Actions then deploys)
bash push.sh
```
