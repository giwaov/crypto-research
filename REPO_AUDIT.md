# Repository Audit: blind-auction-arcium

## ❌ IRREGULARITIES FOUND

This repository is named "blind-auction-arcium" but contains **multiple unrelated projects**.

---

## ✅ ARCIUM-RELATED (Should Stay)

### Directories:
- `blind-auction/` - Main Arcium blind auction project
- `blind-auction-frontend/` - Blind auction frontend
- `private-contact-discovery/` - Arcium PSI project
- `private-contact-discovery-frontend/` - PCD frontend
- `private-contact-discovery-repo/` - PCD repo

### Files:
- `ARCIUM_RTG_SUBMISSION.md` - Arcium RTG submission
- `PRIVATE_CONTACT_DISCOVERY_SUBMISSION.md` - PCD submission
- `arcium-setup.sh` - Arcium setup script
- `blind_auction_lib.rs` - Deployed program
- `pcd-setup.sh` - PCD setup script

---

## ❌ NON-ARCIUM PROJECTS (Should Be Removed or Separated)

### Miden (ZK Rollup):
- `miden-docs/` - Miden documentation fork
- `miden-web-tutorials/` - Miden web tutorials
- `miden-content/` - Miden content
- `miden_testnet_setup.sh` - Miden setup script

### Seismic (Encrypted EVM):
- `seismic-alloy/` - Seismic Alloy fork
- `seismic-foundry/` - Seismic Foundry fork
- `seismic-solidity/` - Seismic Solidity fork
- `seismic-starter/` - Seismic starter
- `summit/` - Seismic consensus client

### OpenGradient (AI):
- `og-defi-sentinel/` - DeFi sentiment oracle
- `sdk/` - OpenGradient SDK fork
- `opengradient-audit/` - OpenGradient audit

### Fortytwo (Swarm Agent):
- `fortytwo_agent.py` - Agent script
- `fortytwo_actions.json` - Actions
- `fortytwo_challenges.json` - Challenges
- `fortytwo_loop.sh` - Loop script
- `fortytwo_monitor.py` - Monitor script
- `fortytwo_private_key.pem` - Private key
- `fortytwo_public_key.pem` - Public key
- `fortytwo_responses.json` - Responses
- `fortytwo_tokens.json` - Tokens

### OM1 (Robotics):
- `OM1/` - OpenMind robotics runtime fork
- `openmind_agent.py` - Agent script
- `openmind_chat.py` - Chat script
- `openmind_simple_chat.py` - Simple chat

### Other Projects:
- `mx-semantics/` - Pi-Squared semantics fork
- `zk-benchmark/` - ZK benchmark fork
- `src/` - Unknown source directory
- `transfer/` - Transfer directory
- `teleops_control.py` - Teleops control script

### Temporary/Junk Files:
- `tmpclaude-*-cwd` (400+ temporary files!)
- `nul` - Empty file
- `agent.log`, `agent-error.log` - Log files
- `recover_wallet.exp`, `recover_wallet2.exp` - Wallet recovery scripts
- `railway.json` - Railway deployment config
- `~/` directory

---

## 📊 Summary

**Total directories:** 21
**Arcium-related:** 5 (24%)
**Non-Arcium:** 16 (76%)

**Total files (excluding temp):** ~30
**Arcium-related:** 5 (17%)
**Non-Arcium:** 25 (83%)

**Temporary files:** 400+ tmpclaude-*-cwd files

---

## 🎯 RECOMMENDATIONS

### Option 1: Clean This Repo (Make it Arcium-only)
Keep only Arcium projects, move everything else to separate repos

### Option 2: Rename This Repo
Rename to something like "blockchain-projects" or "privacy-tech-portfolio"

### Option 3: Create Separate Repos
- `arcium-projects` (blind auction + PCD)
- `miden-work` (all Miden projects)
- `seismic-work` (all Seismic projects)
- `opengradient-work` (DeFi sentinel + SDK)
- `agent-experiments` (Fortytwo, OM1, etc.)

---

## ⚠️ IMMEDIATE CLEANUP NEEDED

1. Delete 400+ `tmpclaude-*-cwd` temporary files
2. Remove junk files (nul, logs, wallet recovery scripts)
3. Decide on repository structure
4. Update .gitignore to prevent temp files

