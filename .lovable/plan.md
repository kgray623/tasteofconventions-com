I’ll remove the install shortcut experience entirely so it can’t confuse users or trigger the broken behavior.

Plan:
1. Delete the `/install` page so the shortcut/install screen is gone.
2. Revert the web app manifest back to opening the normal app entry instead of forcing `/login?installed=1`.
3. Search for any links/buttons that send users to `/install` and remove or reroute them to `/login` as appropriate.
4. Verify the app no longer shows the install page and that the hydration error from `/install` is gone.

I will not change RSVP, invitations, login rules, quotas, or any backend behavior.