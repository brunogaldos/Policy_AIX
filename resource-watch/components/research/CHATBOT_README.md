## Research Chatbot (components/research/research-chatbot.jsx)

### Overview
The chatbot supports dataset mentions using the `@` symbol and integrates with the Explore page’s map via the same Redux actions as the left-hand dataset widget. Selecting a dataset from the `@` dropdown (or pressing Enter) activates it on the map. Removing the token deactivates it.

### Key Behaviors
- **Dataset Fetch for Autocomplete**
  - Uses `fetchDatasets` from `services/dataset.ts` when the panel opens.
  - Current params: `page[size]=365`, `status='saved'`, `includes='layer,metadata'`.
  - File/loc: `research-chatbot.jsx` near the `fetchAllDatasets` function.

- **Friendly Names**
  - Dropdown and tokens display the user-friendly metadata name (if available), falling back to dataset name.
  - Function: `getDatasetDisplayName(dataset)`.

- **@ Dropdown Filtering**
  - Typing `@` shows a dropdown filtered by the text after `@`.
  - Logic: `handleInputChange` computes `filteredDatasets` using `getDatasetSearchTerms(dataset)` and limits to 365.

- **Add to Map (same as widget)**
  - On selection: `selectDataset(dataset)` dispatches the same Redux action as the widget: `toggleMapLayerGroup({ dataset, toggle: true })`, and sets default active layer with `setMapLayerGroupActive`.
  - On removal (X button or token deletion): dispatches `toggleMapLayerGroup({ dataset, toggle: false })` and `resetMapLayerGroupsInteraction()`.
  - Actions source: `layout/explore/actions.js`. Reducer: `layout/explore/reducers.js`.

- **Token Text Deactivation (manual delete in input)**
  - If the input no longer contains the token text (e.g., you delete any part of `@Token Name`), the chatbot:
    - Removes the token from `selectedDatasets` and `activeDatasets`
    - Dispatches `toggleMapLayerGroup({ dataset, toggle: false })`
    - Calls `resetMapLayerGroupsInteraction()`
  - Implemented inside `handleInputChange` to react immediately when the token text no longer matches.

### Core Functions & Where They Live
- `fetchAllDatasets` (loads autocomplete datasets)
  - File: `components/research/research-chatbot.jsx`
  - Purpose: Fetches datasets with relationships needed for map activation.

- `getDatasetDisplayName(dataset)` / `getDatasetSearchTerms(dataset)`
  - File: `components/research/research-chatbot.jsx`
  - Purpose: Friendly label extraction and search term generation used by the dropdown.

- `handleInputChange(e)`
  - File: `components/research/research-chatbot.jsx`
  - Purpose: Updates input state, shows/hides dropdown, filters datasets, and deactivates tokens when their label no longer exists in the input.

- `selectDataset(dataset)`
  - File: `components/research/research-chatbot.jsx`
  - Purpose: Inserts the `@Token Name` in the input, stores token state, dispatches `toggleMapLayerGroup` true, and activates the default layer.

- `removeDataset(selectedItem)`
  - File: `components/research/research-chatbot.jsx`
  - Purpose: Removes token and deactivates the dataset via `toggleMapLayerGroup` false and `resetMapLayerGroupsInteraction`.

### Redux Integration
- Add/Remove to map: `toggleMapLayerGroup`, `resetMapLayerGroupsInteraction`, `setMapLayerGroupActive` from `layout/explore/actions.js`.
- State handling for map layer groups is in `layout/explore/reducers.js`.

### Styling Notes
- Dropdown items show only the friendly name (no `@` prefix, no type badges) with softer gray text for readability.
- Tokens use the full friendly name (no shortening).

### Troubleshooting
- If the `@` dropdown is empty, confirm the dataset fetch params and network response.
- If map layers don’t activate, ensure the dataset objects include `layer` (relationships are required).

