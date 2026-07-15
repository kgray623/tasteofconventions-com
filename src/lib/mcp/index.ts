import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listMyInvitationsTool from "./tools/list-my-invitations";

// The OAuth issuer MUST be the direct Supabase host. The `.lovable.cloud`
// runtime proxy publishes a different issuer in its discovery document,
// so mcp-js rejects tokens whose configured issuer doesn't match.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "taste-of-conventions-mcp",
  title: "Taste of Conventions",
  version: "0.1.0",
  instructions:
    "Tools for the Taste of Conventions event app. Use `whoami` to verify the signed-in user, and `list_my_invitations` to read invitations the signed-in user is authorized to see (RLS applies).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listMyInvitationsTool],
});
