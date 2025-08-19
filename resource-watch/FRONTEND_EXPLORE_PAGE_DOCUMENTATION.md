# Frontend Documentation: `/data/explore` Page

## Overview

The `/data/explore` page is the main data exploration interface of the Resource Watch platform. It provides users with a comprehensive view of datasets, interactive maps, filtering capabilities, and an AI-powered research chatbot. This documentation covers all components, their relationships, design elements, and functionality.

## Page Structure & Architecture

### Main Entry Point
- **File**: `pages/data/explore/[[...dataset]].jsx`
- **Purpose**: Next.js dynamic route handler for the explore page
- **Key Features**:
  - URL state management (viewport, filters, selected dataset)
  - Server-side data fetching
  - Redux state synchronization

### Core Layout Component
- **File**: `layout/explore/component.jsx`
- **Purpose**: Main layout orchestrator for the explore page
- **Key Features**:
  - Responsive design (desktop/mobile)
  - Sidebar and map layout management
  - AI chatbot integration
  - Dynamic content rendering based on state

## Component Hierarchy

```
ExplorePage (pages/data/explore/[[...dataset]].jsx)
└── Explore (layout/explore/component.jsx)
    ├── Layout (layout/layout/layout-app)
    ├── ExploreSidebar (layout/explore/explore-sidebar)
    │   ├── ExploreMenu (layout/explore/explore-menu)
    │   └── Sidebar Content (conditional rendering)
    │       ├── ExploreDatasets (layout/explore/explore-datasets)
    │       ├── ExploreTopics (layout/explore/explore-topics)
    │       ├── ExploreCollections (layout/explore/explore-collections)
    │       ├── ExploreFavorites (layout/explore/explore-favorites)
    │       ├── ExploreDiscover (layout/explore/explore-discover)
    │       ├── ExploreNearRealTime (layout/explore/explore-near-real-time)
    │       ├── ExploreAreasOfInterest (layout/explore/explore-areas-of-interest)
    │       └── ExploreMyData (layout/explore/explore-my-data)
    ├── ExploreMap (layout/explore/explore-map)
    ├── ExploreDetail (layout/explore/explore-detail) - when dataset selected
    └── ResearchChatbot (components/research/research-chatbot.jsx)
```

## Key Components Breakdown

### 1. Dataset Widget System

#### ExploreDatasets Component
- **File**: `layout/explore/explore-datasets/component.jsx`
- **Purpose**: Main container for dataset listing and filtering
- **Key Features**:
  - Dataset pagination
  - Tag filtering
  - Search functionality
  - Sort controls
  - Related dashboards display

#### DatasetList Component
- **File**: `components/datasets/list/component.js`
- **Purpose**: Renders the grid/list of dataset cards
- **Key Features**:
  - Responsive grid layout
  - Dataset card rendering
  - Mode switching (grid/list)

#### DatasetListItem Component
- **File**: `components/datasets/list/list-item/component.jsx`
- **Purpose**: Individual dataset card with interactive elements
- **Key Features**:
  - Dataset metadata display
  - Chart/map thumbnails
  - "Add Map" functionality
  - Collection management
  - Forward links

### 2. AI Research Chatbot

#### ResearchChatbot Component
- **File**: `components/research/research-chatbot.jsx`
- **Purpose**: AI-powered research assistant with dataset integration
- **Key Features**:
  - WebSocket communication with backend
  - Dataset mention functionality (`@datasetName`)
  - Real-time chat interface
  - Token-based dataset selection
  - Map layer integration

#### Key Chatbot Functions:
- **`handleDatasetMention`**: Processes `@` mentions and activates map layers
- **`selectDataset`**: Handles dataset selection from dropdown
- **`removeDataset`**: Removes datasets and deactivates map layers
- **`sendChatMessage`**: Sends messages to research backend

### 3. Map Integration

#### ExploreMap Component
- **File**: `layout/explore/explore-map`
- **Purpose**: Interactive map display with layer management
- **Integration Points**:
  - Dataset layer activation
  - Viewport state management
  - Basemap controls
  - Drawing tools

#### Map Actions (Redux)
- **File**: `layout/explore/actions.js`
- **Key Actions**:
  - `toggleMapLayerGroup`: Activates/deactivates dataset layers
  - `setMapLayerGroupActive`: Sets specific layer as active
  - `resetMapLayerGroupsInteraction`: Resets layer interactions
  - `setViewport`: Updates map viewport state

### 4. Sidebar Navigation

#### ExploreSidebar Component
- **File**: `layout/explore/explore-sidebar`
- **Purpose**: Left sidebar container with navigation
- **Sections**:
  - **DISCOVER**: Featured datasets and topics
  - **ALL DATA**: Complete dataset catalog
  - **NEAR REAL-TIME**: Real-time data sources
  - **TOPICS**: Thematic collections
  - **COLLECTIONS**: User-curated collections
  - **FAVORITES**: User-favorited datasets
  - **AREAS OF INTEREST**: Geographic areas
  - **MY DATA**: User-uploaded data

#### ExploreMenu Component
- **File**: `layout/explore/explore-menu`
- **Purpose**: Navigation menu with section switching
- **Features**:
  - Icon-based navigation
  - Section highlighting
  - User authentication checks

## Design System & Styling

### Color Scheme
- **Primary Yellow**: `#fab72e` (used for highlights, icons, titles)
- **Dark Background**: `rgba(30, 30, 30, 0.85)` with `backdrop-filter: blur(8px)`
- **Text Colors**: White for primary text, yellow for highlights
- **Pink Replacement**: All pink elements changed to `#fab72e`

### Layout Components

#### Dataset Cards
- **Black Overlay**: Extends to bottom for visual consistency
- **Chart Thumbnails**: Map or chart previews
- **Metadata Display**: Title, description, last updated date
- **Action Buttons**: "Add Map", "Add to Collection", "View Details"

#### Sidebar Design
- **Reduced Width**: Optimized for better content space
- **Smaller Font Size**: Improved readability
- **Yellow Icons**: `#fab72e` color for navigation icons
- **Scrollable Content**: Vertical scrolling with custom scrollbar

#### Chatbot UI
- **Dark Panel**: `background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(8px)`
- **Integrated Send Button**: Positioned inside input box
- **Token Display**: Horizontal layout below input
- **Compact Design**: Space-efficient interface

### Responsive Design
- **Desktop**: Full sidebar + map layout
- **Mobile**: Modal-based navigation with limited functionality
- **Breakpoints**: Uses `lib/media` for responsive behavior

## State Management (Redux)

### Explore State Structure
```javascript
{
  datasets: {
    selected: string,        // Currently selected dataset
    list: array,            // Dataset list
    total: number,          // Total datasets count
    limit: number,          // Pagination limit
    page: number,           // Current page
    loading: boolean        // Loading state
  },
  filters: {
    search: string,         // Search query
    selected: {
      topics: array,        // Selected topic filters
      data_types: array,    // Data type filters
      frequencies: array,   // Frequency filters
      time_periods: array   // Time period filters
    }
  },
  sort: {
    selected: string,       // Sort method
    direction: number       // Sort direction
  },
  map: {
    viewport: object,       // Map viewport state
    basemap: string,        // Basemap selection
    labels: string,         // Label settings
    boundaries: boolean,    // Boundary display
    layerGroups: array,     // Active map layers
    aoi: string            // Area of interest
  },
  sidebar: {
    section: string,        // Active sidebar section
    anchor: string,         // Sidebar anchor
    selectedCollection: string // Selected collection
  }
}
```

## Data Flow & Interactions

### 1. Dataset Selection Flow
```
User clicks dataset → DatasetListItem → Redux action → Map layer activation → URL update
```

### 2. Chatbot Integration Flow
```
User types @dataset → handleDatasetMention → Dataset search → Map activation → Token creation
```

### 3. Filter Application Flow
```
User selects filter → Redux action → API call → Dataset list update → Pagination reset
```

### 4. Map Interaction Flow
```
User interacts with map → Viewport change → Redux action → URL update → State persistence
```

## API Integration

### Dataset Services
- **File**: `services/dataset.js`
- **Key Functions**:
  - `fetchDatasets`: Retrieves dataset list with filters
  - `fetchDataset`: Gets individual dataset details
  - `fetchFiltersTags`: Gets available filter tags

### WebSocket Communication
- **Research Chatbot**: `ws://localhost:5029/ws`
- **Real-time Updates**: Status messages, token usage, streaming responses
- **Dataset Integration**: Map layer activation via WebSocket events

## URL State Management

### Query Parameters
- **Map State**: `zoom`, `lat`, `lng`, `pitch`, `bearing`, `basemap`, `labels`
- **Dataset State**: `page`, `sort`, `sortDirection`, `dataset`
- **Filters**: `search`, `topics`, `data_types`, `frequencies`, `time_periods`
- **Layers**: `layers` (encoded JSON of active layers)
- **Sidebar**: `section`, `selectedCollection`, `aoi`

### URL Synchronization
- **Automatic Updates**: URL reflects current state
- **Deep Linking**: Direct access to specific views
- **Browser History**: Back/forward navigation support

## Performance Optimizations

### Code Splitting
- **Dynamic Imports**: Schema scripts loaded on demand
- **Component Lazy Loading**: Heavy components loaded when needed
- **Image Optimization**: Thumbnails and charts optimized

### State Optimization
- **Memoization**: React.memo for expensive components
- **Callback Optimization**: useCallback for event handlers
- **Redux Selectors**: Efficient state selection

## Error Handling

### User Experience
- **Loading States**: Skeleton loaders and spinners
- **Error Boundaries**: Graceful error recovery
- **Fallback UI**: Default content when data unavailable

### Network Resilience
- **Retry Logic**: Failed API calls retried
- **Offline Support**: Cached data when available
- **WebSocket Reconnection**: Automatic reconnection on disconnect

## Accessibility Features

### Keyboard Navigation
- **Tab Order**: Logical tab sequence
- **Arrow Keys**: Dataset dropdown navigation
- **Escape Key**: Close modals and dropdowns

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for interactive elements
- **Semantic HTML**: Proper heading structure
- **Alt Text**: Image descriptions for charts and maps

## Browser Compatibility

### Supported Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Feature Detection
- **WebSocket**: Required for chatbot functionality
- **CSS Grid**: Used for responsive layouts
- **ES6+**: Modern JavaScript features

## Development Guidelines

### Component Structure
- **Functional Components**: Use hooks for state management
- **PropTypes**: Type checking for component props
- **Default Props**: Sensible defaults for optional props

### Styling Approach
- **SCSS Modules**: Component-scoped styles
- **CSS Variables**: Theme consistency
- **Responsive Design**: Mobile-first approach

### State Management
- **Redux**: Global state for app-wide data
- **Local State**: Component-specific state
- **URL State**: Navigation and deep linking

## Testing Strategy

### Unit Tests
- **Component Tests**: Individual component behavior
- **Redux Tests**: Action creators and reducers
- **Utility Tests**: Helper functions and utilities

### Integration Tests
- **User Flows**: End-to-end user interactions
- **API Integration**: Data fetching and updates
- **Map Interactions**: Geographic functionality

### Visual Regression
- **Screenshot Tests**: UI consistency across changes
- **Responsive Tests**: Layout across screen sizes
- **Cross-browser Tests**: Compatibility verification

## Deployment Considerations

### Build Optimization
- **Bundle Splitting**: Separate vendor and app bundles
- **Tree Shaking**: Remove unused code
- **Asset Optimization**: Compressed images and fonts

### Environment Configuration
- **API Endpoints**: Environment-specific URLs
- **Feature Flags**: Conditional feature enabling
- **Analytics**: Usage tracking and monitoring

## Future Enhancements

### Planned Features
- **Advanced Filtering**: More sophisticated filter options
- **Saved Searches**: User-defined search queries
- **Data Export**: Download capabilities for datasets
- **Collaboration**: Shared collections and annotations

### Performance Improvements
- **Virtual Scrolling**: Large dataset lists
- **Progressive Loading**: Incremental data loading
- **Caching Strategy**: Improved data caching

---

*This documentation covers the complete frontend architecture of the `/data/explore` page, including all components, their relationships, design elements, and functionality. For specific implementation details, refer to the individual component files mentioned above.*
