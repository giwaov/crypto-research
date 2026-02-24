# Documentation Bugs, Typos, and Inconsistencies Report

## Summary
After a comprehensive audit of the OpenGradient website (opengradient.ai), documentation (docs.opengradient.ai), and GitHub repositories, I've identified several issues that could improve the developer experience.

---

## 🔴 Critical Issues

### 1. `login()` function has incorrect documentation
**Location:** [API Reference - Python SDK](https://docs.opengradient.ai/api_reference/python_sdk/)

**Problem:** The `login()` function documentation appears to be copy-pasted from `list_files()`. It incorrectly states:
> "List files in a model repository version."
> Arguments: `model_name`, `version`
> Returns: `List[Dict]: List of file metadata dictionaries`

**Expected:** Should document actual login credentials/parameters.

---

### 2. `og.init()` comment says "mainnet" but defaults to devnet
**Location:** [API Reference - init function](https://docs.opengradient.ai/api_reference/python_sdk/)

**Problem:** Documentation says:
> `rpc_url`: Optional RPC URL for the blockchain network, **defaults to mainnet**

But the actual default value is `https://ogevmdevnet.opengradient.ai` which is **devnet**, not mainnet.

---

## 🟠 Inconsistencies

### 3. Settlement mode naming is inconsistent
**Locations:** 
- [Glossary](https://docs.opengradient.ai/help/glossary.html)
- [SDK LLM docs](https://docs.opengradient.ai/developers/sdk/llm.html)
- API Reference

**Problem:** Different naming conventions used:
| Glossary | SDK Docs | API Reference |
|----------|----------|---------------|
| `SETTLE_INDIVIDUAL` | `SETTLE` | `settle-batch` (kebab-case) |
| `SETTLE_BATCH` | `SETTLE_BATCH` | - |
| `SETTLE_INDIVIDUAL_WITH_METADATA` | `SETTLE_METADATA` | - |

**Suggestion:** Standardize on one naming convention throughout.

---

### 4. Model string identifiers vs enum naming unclear
**Location:** [SDK LLM docs](https://docs.opengradient.ai/developers/sdk/llm.html)

**Problem:** Examples show `"openai/gpt-4.1"` and `"anthropic/claude-4.0-sonnet"` strings, but the SDK uses enums like `GPT_4_1_2025_04_14` and `CLAUDE_4_0_SONNET`. Need clearer mapping documentation.

---

### 5. Multiple MemSync domains cause confusion
**Problem:** Documentation references multiple domains without clarifying which is authoritative:
- `api.memchat.io` (API endpoint)
- `memsync.ai` (app?)
- `app.memsync.ai` (dashboard)
- `memsync.mintlify.app` (full guide)

**Suggestion:** Add a note clarifying the purpose of each domain.

---

### 6. Windows WSL note missing "fix in progress" status
**Location:** [SDK Installation docs](https://docs.opengradient.ai/developers/sdk/)

**Problem:** Docs say "Windows users should temporarily enable WSL when installing opengradient" but doesn't mention the fix is in progress (as noted in GitHub README).

---

## 🟡 Typos & Generated Noise

### 7. API Reference shows "The type of the None singleton"
**Location:** [API Reference](https://docs.opengradient.ai/api_reference/python_sdk/) - appears dozens of times

**Problem:** All enum variables show this auto-generated pdoc text:
> `static ASCENDING` - The type of the None singleton.

This is noise from the documentation generator and should be cleaned up.

---

## 🔵 Missing/Incomplete Information

### 8. Alpha Testnet Faucet shows "TBD"
**Location:** [Network Deployments](https://docs.opengradient.ai/learn/network/deployment.html)

**Problem:** The Alpha Testnet (deprecated) section shows:
> Faucet: TBD

Should either provide the URL or remove this section entirely.

---

### 9. PersonalizedChatbot example is incomplete
**Location:** [MemSync Tutorial](https://docs.opengradient.ai/developers/memsync/tutorial.html)

**Problem:** The example code references `build_context()` and `generate_response()` methods but never defines them. Developers copying this code will get errors.

---

### 10. TypeScript SDK not documented
**Location:** [Developers Overview](https://docs.opengradient.ai/developers/)

**Problem:** The [ts-sdk](https://github.com/OpenGradient/ts-sdk) repository exists on GitHub but isn't mentioned anywhere in the documentation. Same for [og-agent-starter](https://github.com/OpenGradient/og-agent-starter).

---

### 11. x402 SDK page may be broken
**Location:** [x402.html](https://docs.opengradient.ai/developers/sdk/x402.html)

**Problem:** Page appears to have no content or fails to load.

---

## 📋 Additional Suggestions

| Item | Suggestion |
|------|------------|
| Error codes | Add comprehensive error code documentation |
| Rate limits | Document rate limits for x402 and MemSync APIs |
| Pricing | Add pricing/cost information for inference calls |
| Glossary | Add links from glossary terms to relevant documentation |

---

## Environment
- **Date reviewed:** February 3, 2026
- **Pages reviewed:** ~15 documentation pages, 3 GitHub repos
- **Browser:** N/A (programmatic fetch)

---

Thank you for building OpenGradient! Happy to provide more details on any of these issues.
