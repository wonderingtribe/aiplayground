# Tasks

## Unified Workbench Implementation
- [ ] Research and identify shared canvas component
- [ ] Identify Training Set Compiler and Agent Compiler components
- [ ] Merge /training and /creation routes into a single unified route (e.g., /workbench)
- [ ] Implement collapsible right-side sub-drawer
- [ ] Implement "Train" and "Create" tabs within the sub-drawer
- [ ] Consolidate top-nav items (replace Training/Creation with a single item)
- [ ] Ensure state persistence for selected nodes and compiler inputs during tab switching
- [ ] Verify no loss of functionality

## Navbar Active State Fix
- [ ] Locate navigation component and active-state logic
- [ ] Analyze why multiple items are marked active simultaneously
- [ ] Fix matching logic to ensure exact route matching
