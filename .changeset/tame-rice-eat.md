---
'fastly-compute-proxy': patch
---

Updated agent endpoint response to reset `age` and `date` and drop `cache-tag` on cache hits, and to answer `If-None-Match` with 304
