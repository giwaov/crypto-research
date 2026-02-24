# OpenGradient Website & Documentation Audit Report

**Audit Date:** February 3, 2026  
**Audited By:** Community Contributor  
**Scope:** opengradient.ai, docs.opengradient.ai, github.com/OpenGradient

---

## Executive Summary

This report documents bugs, typos, inconsistencies, and improvement opportunities found during a comprehensive review of OpenGradient's public-facing documentation and website.

**Total Issues Found:** 20  
- 🔴 Critical: 2  
- 🟠 Inconsistencies: 5  
- 🟡 Typos/Grammar: 2  
- 🔵 Missing Info: 4  
- ⚪ UI/UX: 3  
- 📝 Documentation Gaps: 4  

---

## 🔴 Critical Issues

### Issue #1: `login()` Function Has Wrong Documentation

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Location** | [API Reference - Python SDK](https://docs.opengradient.ai/api_reference/python_sdk/) |
| **Type** | Copy-paste error |

**Current (Incorrect):**
```python
def login(model_name: str, version: str) ‑> List[Dict]
# List files in a model repository version.
# Arguments: model_name, version
# Returns: List[Dict]: List of file metadata dictionaries
```

**Expected:** Should document login credentials and authentication flow.

---

### Issue #2: `og.init()` Comment Says "Mainnet" But Defaults to Devnet

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Location** | [API Reference - init function](https://docs.opengradient.ai/api_reference/python_sdk/) |
| **Type** | Misleading documentation |

**Current:**
> `rpc_url`: Optional RPC URL for the blockchain network, **defaults to mainnet**

**Actual Default:** `https://ogevmdevnet.opengradient.ai` (devnet)

**Fix:** Change to "defaults to devnet" or update the default value.

---

## 🟠 Inconsistencies

### Issue #3: Settlement Mode Naming Inconsistency

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Locations** | Glossary, SDK docs, API Reference |
| **Type** | Naming inconsistency |

**Comparison Table:**

| Source | Value 1 | Value 2 | Value 3 |
|--------|---------|---------|---------|
| Glossary | `SETTLE_INDIVIDUAL` | `SETTLE_BATCH` | `SETTLE_INDIVIDUAL_WITH_METADATA` |
| SDK Docs | `SETTLE` | `SETTLE_BATCH` | `SETTLE_METADATA` |
| API Reference | `settle-batch` | - | - |

**Recommendation:** Standardize on SCREAMING_SNAKE_CASE throughout.

---

### Issue #4: Model Identifier Mapping Unclear

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Location** | [SDK LLM docs](https://docs.opengradient.ai/developers/sdk/llm.html) |
| **Type** | Documentation gap |

**Problem:**
- Examples show: `"openai/gpt-4.1"`, `"anthropic/claude-4.0-sonnet"`
- SDK enums are: `GPT_4_1_2025_04_14`, `CLAUDE_4_0_SONNET`

**Recommendation:** Add a mapping table or clarify when to use strings vs enums.

---

### Issue #5: Multiple MemSync Domains Confusing

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Location** | MemSync documentation throughout |
| **Type** | UX confusion |

**Domains Referenced:**
1. `api.memchat.io` - API endpoint
2. `memsync.ai` - Marketing site?
3. `app.memsync.ai` - Dashboard
4. `memsync.mintlify.app` - Full documentation

**Recommendation:** Add a "MemSync URLs" section clarifying each domain's purpose.

---

### Issue #6: Windows WSL Note Missing Fix Status

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Location** | [SDK Installation](https://docs.opengradient.ai/developers/sdk/) |
| **Type** | Incomplete information |

**Docs say:**
> Windows users should temporarily enable WSL when installing opengradient

**GitHub README says:**
> Windows users should temporarily enable WSL when installing `opengradient` (fix in progress).

**Recommendation:** Add "(fix in progress)" to docs for consistency.

---

### Issue #7: RPC URL Default Mismatch

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Location** | [API Reference](https://docs.opengradient.ai/api_reference/python_sdk/) |
| **Type** | Incorrect documentation |

The `og.init()` function shows two different defaults:
- Comment: "defaults to mainnet"
- Actual code: `'https://ogevmdevnet.opengradient.ai'` (devnet)

---

## 🟡 Typos & Grammar

### Issue #8: Awkward Phrasing in Glossary

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Location** | [Glossary - x402 definition](https://docs.opengradient.ai/help/glossary.html) |
| **Type** | Grammar |

**Current:**
> "It absolves the Internet's original sin..."

**Suggested:**
> "It addresses the Internet's original sin..." or "It solves the Internet's original sin..."

---

### Issue #9: Auto-Generated Noise in API Docs

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Location** | [API Reference](https://docs.opengradient.ai/api_reference/python_sdk/) |
| **Type** | Generated content |

**Problem:** All enum variables show:
> `static ASCENDING` - The type of the None singleton.

This appears dozens of times and is pdoc auto-generation noise.

**Recommendation:** Configure pdoc to suppress these or manually clean up.

---

## 🔵 Missing/Incomplete Information

### Issue #10: Alpha Testnet Faucet Shows "TBD"

| Field | Value |
|-------|-------|
| **Location** | [Network Deployments](https://docs.opengradient.ai/learn/network/deployment.html) |

**Current:** `Faucet: TBD`

**Recommendation:** Either provide the URL or remove the deprecated network section.

---

### Issue #11: PersonalizedChatbot Example Incomplete

| Field | Value |
|-------|-------|
| **Location** | [MemSync Tutorial](https://docs.opengradient.ai/developers/memsync/tutorial.html) |

**Problem:** The `PersonalizedChatbot` class references:
- `self.build_context(memories)` - never defined
- `self.generate_response(context, user_message)` - never defined

Developers copying this will get `AttributeError`.

---

### Issue #12: TypeScript SDK Not Documented

| Field | Value |
|-------|-------|
| **Location** | [Developers Overview](https://docs.opengradient.ai/developers/) |

**Problem:** These GitHub repos exist but aren't in docs:
- [ts-sdk](https://github.com/OpenGradient/ts-sdk) - TypeScript SDK
- [og-agent-starter](https://github.com/OpenGradient/og-agent-starter) - Agent starter kit

---

### Issue #13: x402 SDK Page Appears Empty/Broken

| Field | Value |
|-------|-------|
| **Location** | [x402.html](https://docs.opengradient.ai/developers/sdk/x402.html) |

Page failed to load content during audit.

---

## ⚪ UI/UX Issues

### Issue #14: Repetitive "Permalink to" Text

| Field | Value |
|-------|-------|
| **Location** | All documentation pages |

Headers display "Permalink to 'Header Name'" which clutters the document.

---

### Issue #15: Glossary Lacks Cross-References

| Field | Value |
|-------|-------|
| **Location** | [Glossary](https://docs.opengradient.ai/help/glossary.html) |

Terms should link to relevant documentation sections.

---

### Issue #16: Navigation Inconsistency

| Field | Value |
|-------|-------|
| **Location** | Various pages |

Some pages show "Previous/Next" navigation, others don't.

---

## 📝 Documentation Gaps

| # | Topic | Description |
|---|-------|-------------|
| 17 | Error Handling | No comprehensive error code documentation |
| 18 | Rate Limits | No rate limit information for APIs |
| 19 | Pricing | No cost information for inference calls |
| 20 | Changelog | No public changelog for SDK versions |

---

## Recommendations Summary

### High Priority
1. Fix `login()` function documentation
2. Correct mainnet/devnet terminology
3. Standardize settlement mode naming
4. Complete MemSync tutorial example

### Medium Priority
5. Clean up auto-generated API doc noise
6. Add TypeScript SDK documentation
7. Fix or remove x402 SDK page
8. Add model identifier mapping table

### Low Priority
9. Add MemSync domain clarification
10. Update Windows WSL note with fix status
11. Improve glossary with cross-references
12. Add error code documentation

---

## Appendix: Pages Reviewed

| URL | Status |
|-----|--------|
| opengradient.ai | ✅ Reviewed |
| docs.opengradient.ai | ✅ Reviewed |
| docs.opengradient.ai/developers/ | ✅ Reviewed |
| docs.opengradient.ai/developers/sdk/ | ✅ Reviewed |
| docs.opengradient.ai/developers/sdk/llm.html | ✅ Reviewed |
| docs.opengradient.ai/developers/sdk/ml_inference.html | ✅ Reviewed |
| docs.opengradient.ai/developers/memsync/ | ✅ Reviewed |
| docs.opengradient.ai/developers/memsync/tutorial.html | ✅ Reviewed |
| docs.opengradient.ai/api_reference/python_sdk/ | ✅ Reviewed |
| docs.opengradient.ai/models/model_hub/ | ✅ Reviewed |
| docs.opengradient.ai/learn/architecture/ | ✅ Reviewed |
| docs.opengradient.ai/learn/network/deployment.html | ✅ Reviewed |
| docs.opengradient.ai/about/ | ✅ Reviewed |
| docs.opengradient.ai/about/use_cases.html | ✅ Reviewed |
| docs.opengradient.ai/twins/ | ✅ Reviewed |
| docs.opengradient.ai/help/glossary.html | ✅ Reviewed |
| github.com/OpenGradient | ✅ Reviewed |
| github.com/OpenGradient/sdk | ✅ Reviewed |

---

*Report generated on February 3, 2026*
