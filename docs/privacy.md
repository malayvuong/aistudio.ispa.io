# Privacy

## What we store
- Account identity (Supabase user id + email).
- Generation history (input/output payloads, status, timestamps).
- Channel profiles (names + defaults such as language/tone/hashtags).
- Social links (type + URL).
- Asset metadata (image URLs when stored).
- Encrypted provider keys and crypto metadata (no plaintext).

## What we do NOT store
- Provider API keys in plaintext.
- Vault passphrases.
- Raw secrets sent from clients.

## Where data is used
- Inputs/outputs are used to render history and enable reruns.
- Channel profiles and social links are injected into prompts and descriptions.
