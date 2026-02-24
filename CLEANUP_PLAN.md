# Repository Cleanup Plan

This document outlines how to organize the blind-auction-arcium repository to separate Arcium and non-Arcium projects.

## Recommended Structure

```
blind-auction-arcium/
├── arcium/                    # Main Arcium projects (keep at root or move here)
│   ├── blind-auction/
│   ├── blind-auction-frontend/
│   ├── private-contact-discovery/
│   ├── private-contact-discovery-frontend/
│   └── private-contact-discovery-repo/
│
├── archive/                   # Non-Arcium projects (preserved but organized)
│   ├── miden/
│   │   ├── miden-docs/
│   │   ├── miden-web-tutorials/
│   │   ├── miden-content/
│   │   └── miden_testnet_setup.sh
│   │
│   ├── seismic/
│   │   ├── seismic-alloy/
│   │   ├── seismic-foundry/
│   │   ├── seismic-solidity/
│   │   ├── seismic-starter/
│   │   └── summit/
│   │
│   ├── opengradient/
│   │   ├── og-defi-sentinel/
│   │   ├── sdk/
│   │   └── opengradient-audit/
│   │
│   ├── agents/
│   │   ├── fortytwo/
│   │   │   ├── fortytwo_agent.py
│   │   │   ├── fortytwo_actions.json
│   │   │   ├── fortytwo_challenges.json
│   │   │   ├── fortytwo_loop.sh
│   │   │   ├── fortytwo_monitor.py
│   │   │   ├── fortytwo_private_key.pem
│   │   │   ├── fortytwo_public_key.pem
│   │   │   ├── fortytwo_responses.json
│   │   │   └── fortytwo_tokens.json
│   │   │
│   │   └── om1/
│   │       ├── OM1/
│   │       ├── openmind_agent.py
│   │       ├── openmind_chat.py
│   │       └── openmind_simple_chat.py
│   │
│   └── misc/
│       ├── mx-semantics/
│       ├── zk-benchmark/
│       ├── src/
│       ├── transfer/
│       └── teleops_control.py
│
└── docs/                      # Documentation
    ├── ARCIUM_RTG_SUBMISSION.md
    ├── PRIVATE_CONTACT_DISCOVERY_SUBMISSION.md
    ├── REPO_AUDIT.md
    └── README.md
```

## Manual Cleanup Steps

Due to permission issues with automated moves, here's how to manually organize:

### Option A: Using File Explorer (Windows)
1. Open File Explorer to `c:\Users\DELL\Desktop\crabdao-agent`
2. Create the `archive` folder structure as shown above
3. Drag and drop directories into their respective archive folders
4. Delete temporary files (see below)

### Option B: Using Git Bash
```bash
# Create archive structure
mkdir -p archive/{miden,seismic,opengradient,agents/fortytwo,agents/om1,misc}

# Move Miden projects
git mv miden-docs miden-web-tutorials miden-content archive/miden/
git mv miden_testnet_setup.sh archive/miden/

# Move Seismic projects
git mv seismic-alloy seismic-foundry seismic-solidity seismic-starter summit archive/seismic/

# Move OpenGradient projects
git mv og-defi-sentinel sdk opengradient-audit archive/opengradient/

# Move Fortytwo agent files
git mv fortytwo_* archive/agents/fortytwo/

# Move OM1 files
git mv OM1 openmind_*.py archive/agents/om1/

# Move misc projects
git mv mx-semantics zk-benchmark src transfer teleops_control.py archive/misc/

# Move docs (optional)
mkdir -p docs
git mv ARCIUM_RTG_SUBMISSION.md PRIVATE_CONTACT_DISCOVERY_SUBMISSION.md REPO_AUDIT.md docs/
```

## Files to Delete

### Temporary Files (400+ files)
```bash
# Delete all tmpclaude temporary files
find . -name "tmpclaude-*-cwd" -type f -delete

# Delete other temp/junk files
rm -f nul agent.log agent-error.log
rm -f recover_wallet.exp recover_wallet2.exp
rm -f railway.json
```

### Private Keys (IMPORTANT)
If you no longer need the Fortytwo private keys, consider deleting:
- `fortytwo_private_key.pem`
- `fortytwo_public_key.pem`

Otherwise, move them to `archive/agents/fortytwo/`

## Update .gitignore

Add these lines to `.gitignore`:
```
# Temporary files
tmpclaude-*-cwd
nul
*.log

# Private keys (if not needed)
*.pem

# OS files
.DS_Store
Thumbs.db
```

## After Cleanup

Once organized:
```bash
git add .
git commit -m "refactor: organize repository - separate Arcium and archived projects

- Move non-Arcium projects (Miden, Seismic, OpenGradient, agents) to archive/
- Clean up 400+ temporary tmpclaude files
- Keep Arcium projects at root for easy access
- Update .gitignore to prevent temp file pollution"
git push
```

## Alternative: Create Separate Repos

If you prefer, you could create separate repositories for each ecosystem:
- `arcium-projects` (blind auction + PCD)
- `miden-work` (all Miden projects)
- `seismic-work` (all Seismic projects)
- `opengradient-work` (DeFi sentinel + SDK)
- `agent-experiments` (Fortytwo, OM1)

This would give each ecosystem its own clean Git history.
