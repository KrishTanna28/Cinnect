1. Enforce authentication across the entire application so that no protected resource can be accessed without being logged in.

* Identify all entry points to the system:

  * API routes
  * Page routes
  * Any server actions or mutations

* Ensure that **only the home page (landing page) remains publicly accessible**. Everything else should require authentication.

* Add a centralized authentication check:

  * Reuse existing auth/session logic if present
  * Otherwise, implement a lightweight and consistent check (e.g., session, token, or cookie-based)

* Apply this check globally instead of repeating logic in every file:

  * Use middleware or a shared utility where appropriate
  * Ensure all protected routes automatically enforce authentication

* For unauthenticated access:

  * API routes → return a clean 401 response (`{ error: "Unauthorized" }`)
  * Page routes → redirect user to login page

* Do not break existing authenticated flows. Ensure logged-in users experience no disruption.

* Handle edge cases:

  * Expired sessions
  * Missing tokens
  * Invalid authentication state

* Keep responses user-friendly:

  * Do not expose internal auth errors
  * Use simple messages like “Please log in to continue”

* Ensure frontend properly handles unauthorized responses:

  * Redirect to login when needed
  * Avoid showing broken UI or raw errors

* Keep implementation minimal and consistent with the current codebase. Avoid unnecessary restructuring.

* Final result: any attempt to access anything other than the home page without authentication should be blocked at a global level.

2. Improve reliability, validation, and error handling across the entire codebase.

* Identify all points where user input, external data, or async operations can fail (API routes, database calls, auth flows, AI calls, form submissions, etc.).

* Add proper input validation where needed (use Zod where appropriate, but don’t force it everywhere). Base decisions on how data flows through the existing code.

* Introduce rate limiting for sensitive or high-traffic endpoints (auth, reviews, comments, AI features, etc.) in a clean and reusable way.

* Ensure all critical operations are wrapped with proper error handling:

  * Database queries
  * External/API calls
  * Auth/session handling
  * Any async logic

* Standardize error handling across the backend:

  * Never expose raw errors, stack traces, or library errors to the client
  * Convert all errors into clean, consistent responses
  * Use simple, user-friendly messages (e.g., “Something went wrong”, “Invalid input”, “Too many requests”)

* Improve frontend error handling:

  * Replace technical error messages with user-friendly ones
  * Ensure all API error responses are handled gracefully
  * Avoid showing raw server responses or undefined states

* Maintain a clear separation:

  * Detailed errors → internal (logs/debugging)
  * Clean messages → user-facing

* Do not overengineer or heavily restructure the project. Integrate improvements naturally into the existing architecture.

* Preserve all current functionality. Focus on making the system more robust, predictable, and user-friendly without breaking existing flows.

* Ensure consistency in how errors are handled and displayed across the entire app.
