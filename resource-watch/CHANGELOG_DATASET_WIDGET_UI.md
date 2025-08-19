# Changelog - Dataset Widget UI Improvements

## Overview
This changelog documents the frontend CSS/styling changes made to fix the dataset widget UI issues, specifically addressing the black overlay problem, replacing pink text with the new color scheme, and improving the sidebar styling.

---

## 🎨 Color Scheme Update

### Changed Files:
1. **`resource-watch/css/_settings.scss`**
   - **Line 35**: `$dark-pink: #c32d7b` → `$dark-pink: #fab72e`
   - **Line 87**: `$header-gradient-color-1: rgba(#c32d7b, 0.8)` → `$header-gradient-color-1: rgba(#fab72e, 0.8)`

2. **`resource-watch/css/components/admin/dataset/card.scss`**
   - **Line 2**: `$dark-pink: #c32d7b` → `$dark-pink: #fab72e`

### Impact:
- All "SEE ALL DATA" links now use #fab72e instead of pink
- Star icons for favoriting datasets use the new color
- Active dataset borders and highlights use #fab72e
- Header gradient elements updated to match new color scheme

---

## 🔧 Black Overlay Fix

### Changed Files:

#### 1. **`resource-watch/layout/explore/explore-datasets/list/list-item/_styles.scss`**
- **Component**: Main dataset list item styling
- **Changes**:
  - Added `background-color: white` to `.info` section (Line 59)
  - Added `border-radius: 0 4px 4px 0` to `.info` section (Line 60)
- **Purpose**: Ensures the white background extends to the bottom of dataset cards, eliminating the visual gap

#### 2. **`resource-watch/css/components/app/explore/dataset_widget.scss`**
- **Component**: General dataset widget styling
- **Changes**:
  - Added `background-color: white` to `.actions` section (Line 48)
- **Purpose**: Ensures consistent white background for action buttons area

#### 3. **`resource-watch/layout/explore/explore-datasets/explore-datasets-actions/_styles.scss`**
- **Component**: Dataset action buttons (Add to map, favorite star)
- **Changes**:
  - Added `background-color: white` to `.c-explore-datasets-actions` (Line 4)
- **Purpose**: Ensures the action buttons area has proper white background

#### 4. **`resource-watch/css/components/app/pages/explore.scss`**
- **Component**: Main explore page styling
- **Changes**:
  - **Line 23**: `background: rgba(30, 30, 30, 0.85)` → `background: rgba(255, 255, 255, 0.95)`
  - **Line 26**: `color: #fff` → `color: #333`
- **Purpose**: Removes the dark overlay that was covering dataset cards and provides better contrast

---

## 🎛️ Sidebar Improvements

### Changed Files:

#### 1. **`resource-watch/layout/explore/explore-menu/_styles.scss`**
- **Component**: Left sidebar navigation menu
- **Changes**:
  - **Line 6-7**: `min-width: 200px` → `min-width: 180px`, `max-width: 200px` → `max-width: 180px`
  - **Line 42**: `fill: #FFFFFF` → `fill: #fab72e` (sidebar icons)
  - **Line 52**: `fill: #FFFFFF` → `fill: #fab72e` (active state icons)
  - **Line 49**: Added `font-size: 12px` to section names
  - **Line 58**: Added `font-size: 12px` to active state section names
- **Purpose**: Reduces sidebar width, changes icons to #fab72e, and makes text smaller

#### 2. **`resource-watch/css/components/app/pages/explore.scss`**
- **Component**: Explore page layout
- **Changes**:
  - **Line 12-13**: `min-width: 330px` → `min-width: 310px`, `max-width: 330px` → `max-width: 310px`
- **Purpose**: Adjusts sidebar content width to match the reduced menu width

---

## 📋 Component Mapping

### Dataset Widget Structure:
```
Dataset Card
├── Chart/Map Preview (left side)
└── Info Section (right side)
    ├── Source & Date
    ├── Title
    └── Actions Area
        ├── "Add to map" button
        └── Star (favorite) button
```

### Files by Component:
- **Main Dataset List**: `explore-datasets/list/list-item/_styles.scss`
- **Action Buttons**: `explore-datasets/explore-datasets-actions/_styles.scss`
- **General Widget**: `components/app/explore/dataset_widget.scss`
- **Color Variables**: `css/_settings.scss`
- **Explore Page**: `components/app/pages/explore.scss`
- **Sidebar Menu**: `layout/explore/explore-menu/_styles.scss`

---

## 🎯 Specific UI Elements Affected

### Before Changes:
- ❌ Black overlay cut off before bottom of cards
- ❌ Dark panel background covering dataset cards
- ❌ Pink text (#c32d7b) for "SEE ALL DATA" links
- ❌ Pink star icons and active states
- ❌ Blue sidebar icons (#FFFFFF)
- ❌ Sidebar width: 200px
- ❌ Larger text size in sidebar

### After Changes:
- ✅ White background extends fully to bottom
- ✅ White panel background with dark text for better contrast
- ✅ Golden text (#fab72e) for "SEE ALL DATA" links
- ✅ Golden star icons and active states
- ✅ Golden sidebar icons (#fab72e)
- ✅ Reduced sidebar width: 180px
- ✅ Smaller text size (12px) in sidebar

---

## 🔍 Testing Checklist

- [ ] Dataset cards display with full white background
- [ ] No dark overlay covering dataset cards
- [ ] "SEE ALL DATA" links appear in #fab72e color
- [ ] Star icons for favoriting use #fab72e color
- [ ] Active dataset borders use #fab72e color
- [ ] Sidebar icons are #fab72e color
- [ ] Sidebar width is reduced to 180px
- [ ] Sidebar text is smaller (12px)
- [ ] No visual gaps or overlays on dataset cards
- [ ] Consistent appearance across all dataset sections

---

## 📝 Notes

- **Scope**: Frontend CSS/styling changes only
- **No Backend Changes**: All modifications are purely visual
- **Global Impact**: Color changes affect entire application due to SCSS variable usage
- **Maintainability**: Changes use existing SCSS variables for consistency
- **Sidebar Optimization**: Reduced width provides more space for main content

---

*Last Updated: December 2024*
*Files Modified: 7*
*Components Affected: Dataset Widget, Color Scheme, Sidebar Navigation, Explore Page Layout*
