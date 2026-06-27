I’ll fix the export downloads without reopening public access.

Plan:
1. Add an admin-only download UI on the admin page for the export files:
   - source ZIP
   - migrations ZIP
   - admin screenshots ZIP
   - database dump ZIP
   - database spreadsheet / CSV if still present in the protected bucket
2. Make each button fetch `/exports/<filename>` with the signed-in admin session token, then follow the protected redirect and save the file with the correct filename.
3. Add clear failure messages instead of freezing or opening a blank page if the session is missing, the user is not admin, or a file is missing.
4. Verify each targeted export URL as:
   - signed-out/non-token request is blocked
   - signed-in admin request returns a real downloadable file, not “Export not found”
   - mobile viewport admin download buttons do not freeze the page
   - desktop viewport admin download buttons do not freeze the page

Technical detail: the route currently requires a Bearer token, so plain links cannot work from the browser address bar or a normal `<a href>`. The fix is to trigger downloads from authenticated app code using the current admin session token.