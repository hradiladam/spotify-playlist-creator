
This is a log of known issues that don't impact core functionality. This is not a lsit of full tests cases with manual to repliccate bugs, its semisolated Component tests only

# 001 SearchBar Component Test Issues - Clear Button Does Not Remove Error

- Description: Clicking the clear button removes the input text but does not clear the displayed error message and error state.
- Test Reference: SearchBar.test.tsx - clears input and error when clear button clicked
- Priority: High - Bad UX experience
- Severity: High - The feature still works (search calls happen) once Network starts working, but the UI misleads the user into thinking they’re stuck in an error state.
- Status: Open

-----------------------------------------------------------------------------

# 002 SearchBar Component Issue: Empty Results Not Displayed

- Description: When the API returns an empty array, the `<SearchBar />` component does not show any indication that no results were found.
- Test Reference: SearchBar.test.tsx - handles empty results gracefully
- Priority: Low - Polish issue
- Severity: Low - Spotify search in unlikely do return nothing, it's jsut a 'just in case' issue
- Status: Open


-----------------------------------------------------------------------------


