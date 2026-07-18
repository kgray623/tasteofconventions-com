## Fix the GitHub-access instructions in the audit bundle

You're on the mobile Preview-mode `...` menu (Share / Publish / Settings / Code / Files / More / History). That menu doesn't have GitHub — GitHub lives in the **Chat mode** composer's **Plus (+)** button, not here.

### What I'll change in `/mnt/documents/database-audit-bundle.md`

Rewrite "Step 1 — Give ChatGPT the source code" so it works for both mobile and desktop, and stops referring to a menu that doesn't exist on your screen.

New Step 1 wording:

**Mobile (what you're on now)**
1. In the bottom bar, tap **Chat** to switch out of Preview mode into Chat mode.
2. In the chat composer, tap the **+** (Plus) button on the left of the text box.
3. Tap **GitHub** → **Connect project** → authorize the Lovable GitHub App → pick the account/org → **Create Repository**.
4. Open the new repo on github.com and copy its URL.
5. Paste the URL into ChatGPT.

**Desktop**
1. In the chat input (bottom left), click the **+** (Plus) button.
2. Choose **GitHub** → **Connect project** → authorize → **Create Repository**.
3. Copy the repo URL from github.com and paste it into ChatGPT.

**If your workspace is on a free plan and the repo has to stay private:** download the code instead — desktop only: open the **Code Editor** (`</>` icon), then **Download codebase** at the bottom of the file tree. Upload that ZIP to ChatGPT.

I'll also add a one-line note at the top of Step 1 saying: "The GitHub option is in the **Chat mode Plus (+) menu**, not the Preview `...` menu."

No other sections of the bundle change. I'll re-export the file and give you the download link.
