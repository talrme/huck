# Huck contributor context

Read `README.md` and `AI_README.md` before making changes. They document current UX decisions, shared versus local settings, Google Sheets deployment, sync guarantees, test commands, and known limitations.

Edit `tools/page.html` and source files; regenerate `index.html`, `manifest.webmanifest`, and `backend.sample.gs` with `node tools/build.mjs`. Keep both READMEs accurate when behavior changes.

Preserve real household logs and browser outboxes. Test with `?demo=1` or the simulated backend, never by silently writing fake records to the real Sheet. Backend redeployment is separate from pushing frontend code; tell the user when owner action is needed.

This is phone-first. Verify narrow-phone/desktop layouts, all styles/themes, image loading, interaction, and reduced-motion behavior for relevant changes. Do not recreate removed staging apps.
