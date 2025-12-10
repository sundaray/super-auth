---
'lucidauth': patch
---

Fix getSession to return null during Next.js prerendering instead of throwing an error when cookies() is called at build time.
