# Resource Watch Datasets Access Tools

This directory contains tools to fetch and view all datasets from the Resource Watch platform, including the same datasets displayed in the `/data/explore` page.

## 📁 Files Overview

- **`fetch-all-datasets.js`** - Node.js script to fetch all datasets from the Resource Watch API
- **`datasets-viewer.html`** - Web interface to browse and search all datasets
- **`README_DATASETS.md`** - This documentation file

## 🚀 Quick Start

### 1. Fetch All Datasets

First, run the script to fetch all datasets from the Resource Watch API:

```bash
cd resource-watch
node scripts/fetch-all-datasets-simple.js
```

This will:
- Connect to the Resource Watch API (`https://api.resourcewatch.org`)
- Fetch all available datasets (365 datasets)
- Save them to `data/all-datasets-simple.json`
- Display a summary in the console

**Expected Output:**
```
Total Datasets: 365
Published Datasets: 365
Datasets with Layers: 364
Datasets with Widgets: 349
Datasets with Metadata: 360
```

### 2. Export to CSV (Simple Display)

After fetching the data, export to CSV for easy viewing in spreadsheet applications:

```bash
# Option 1: Export to CSV using the main script
node scripts/fetch-all-datasets-simple.js csv

# Option 2: Use the standalone CSV export script
node scripts/export-to-csv.js
```

This will create:
- `data/all-datasets-simple.csv` (full version with all fields)
- `data/datasets-simple.csv` (simplified version)

### 3. View Datasets in Web Interface (Optional)

If you prefer a web interface, open the web viewer:

```bash
# Open the HTML file in your browser
open scripts/datasets-viewer.html
# or
firefox scripts/datasets-viewer.html
# or
google-chrome scripts/datasets-viewer.html
```

## 📊 Dataset Information

Each dataset includes:

- **Name**: Human-readable dataset name
- **Slug**: URL-friendly identifier (used in `/data/explore/{slug}`)
- **Description**: Detailed description of the dataset
- **Provider**: Data source organization
- **Layers**: Number of map layers available
- **Widgets**: Number of visualization widgets
- **Metadata**: Additional metadata information

## 🔧 Script Usage

### Basic Usage

```bash
# Fetch all datasets
node scripts/fetch-all-datasets.js

# Search for specific datasets
node scripts/fetch-all-datasets.js search "climate"

# Show summary statistics
node scripts/fetch-all-datasets.js summary
```

### Command Options

| Command | Description |
|---------|-------------|
| `node fetch-all-datasets-simple.js` | Fetch all datasets and display them |
| `node fetch-all-datasets-simple.js search "term"` | Search datasets by name/description |
| `node fetch-all-datasets-simple.js summary` | Show dataset statistics |
| `node fetch-all-datasets-simple.js csv` | Export datasets to CSV format |
| `node export-to-csv.js` | Standalone CSV export script |

### Environment Variables

The script uses these environment variables (with defaults):

```bash
NEXT_PUBLIC_API_URL=https://api.resourcewatch.org
NEXT_PUBLIC_ENVS_SHOW=production
NEXT_PUBLIC_APPLICATIONS=rw
```

## 📊 CSV Export Features

The CSV export provides a simple, spreadsheet-friendly format with:

### CSV Columns
- **ID**: Unique dataset identifier
- **Name**: Human-readable dataset name
- **Slug**: URL-friendly identifier
- **Provider**: Data source organization
- **Published**: Whether the dataset is published (Yes/No)
- **Layers**: Number of map layers
- **Widgets**: Number of visualization widgets
- **Metadata**: Number of metadata entries
- **Created At**: Dataset creation date
- **Updated At**: Last update date

### CSV Files Created
- **`datasets-simple.csv`**: Simplified version with essential fields
- **`all-datasets-simple.csv`**: Full version with all available fields

### Usage
```bash
# Quick CSV export
node scripts/export-to-csv.js

# CSV export with main script
node scripts/fetch-all-datasets-simple.js csv
```

## 🤖 Chatbot Integration

The chatbot now uses the local dataset data for "@" token functionality:

### Setup for Chatbot
```bash
# 1. Fetch datasets (if not already done)
node scripts/fetch-all-datasets-simple.js

# 2. Copy to public folder for browser access
node scripts/copy-datasets-to-public.js
```

### Chatbot Features
- **@ Mentions**: Type "@" to see dataset autocomplete
- **Slug Resolution**: Uses dataset slugs as primary identifiers
- **Correct Names**: Shows actual dataset names from CSV
- **Map Integration**: Activates map layers for selected datasets

### Testing Chatbot Datasets
```bash
# Test browser-compatible dataset loading
node scripts/test-browser-datasets.js
```

## 🌐 Web Viewer Features (Optional)

The `datasets-viewer.html` provides:

### Search & Filter
- **Search**: Find datasets by name, description, or slug
- **Filters**: 
  - All datasets
  - Datasets with map layers
  - Datasets with widgets
  - Datasets with metadata

### Statistics
- Total number of datasets
- Number of datasets with layers
- Number of datasets with widgets
- Current filtered results

### Navigation
- **Pagination**: Browse through large result sets
- **Direct Links**: Click any dataset to open it on Resource Watch
- **Responsive Design**: Works on desktop and mobile

## 🔗 API Endpoint Details

The script connects to the same API endpoint used by the `/data/explore` page:

```
GET https://api.resourcewatch.org/v1/dataset
```

### Query Parameters

- `env`: Environment (production)
- `application`: Application identifier (rw)
- `includes`: Related data to include (layer,metadata,vocabulary,widget)
- `status`: Dataset status (saved)
- `published`: Published datasets only (true)
- `page[number]`: Page number for pagination
- `page[size]`: Items per page (max 100)

## 📋 Example Output

### Console Output
```
🚀 Starting to fetch all datasets...

📡 Fetching page 1...
📊 Total datasets available: 365
✅ Page 1: 100 datasets fetched
📈 Progress: 100/365 (27%)

📡 Fetching page 2...
✅ Page 2: 100 datasets fetched
📈 Progress: 200/365 (55%)

...

🎉 Fetching complete! Total datasets: 365

============================================================
📋 DATASET LIST
============================================================
  1 | Global Power Plant Database                    | global-power-plant-database | Global Energy ... | Layers: 1 | Widgets: 0
     Description: Global database of power plants with detailed information about each facility...
     Functions: This dataset provides comprehensive information about power plants worldwide...

  2 | Gini Index                                    | gini-index                   | World Bank Gro... | Layers: 1 | Widgets: 0
     Description: Income inequality measures using the Gini coefficient...

...

============================================================
📊 DATASET SUMMARY
============================================================
Total Datasets: 365
Datasets with Layers: 245
Datasets with Widgets: 89
Datasets with Metadata: 365

Top Providers:
  World Bank Group: 45 datasets
  Global Forest Watch: 32 datasets
  NASA: 28 datasets
  ...
```

### Web Viewer Features
- **Dark Theme**: Matches the Resource Watch design
- **Interactive Cards**: Hover effects and click to open
- **Real-time Search**: Instant filtering as you type
- **Statistics Dashboard**: Live counts and metrics

## 🔍 Finding Specific Datasets

### By Name
```bash
node scripts/fetch-all-datasets.js search "power plant"
```

### By Provider
```bash
node scripts/fetch-all-datasets.js search "World Bank"
```

### By Topic
```bash
node scripts/fetch-all-datasets.js search "climate"
node scripts/fetch-all-datasets.js search "forest"
node scripts/fetch-all-datasets.js search "ocean"
```

## 📁 Data Storage

Datasets are saved to:
```
resource-watch/data/all-datasets.json
```

File structure:
```json
{
  "metadata": {
    "totalDatasets": 365,
    "fetchedAt": "2024-01-15T10:30:00.000Z",
    "apiUrl": "https://api.resourcewatch.org",
    "environment": "production"
  },
  "datasets": [
    {
      "id": "dataset-id",
      "name": "Dataset Name",
      "slug": "dataset-slug",
      "description": "Dataset description...",
      "provider": "Data Provider",
      "layer": [...],
      "widget": [...],
      "metadata": [...]
    }
  ]
}
```

## 🔄 Updating Data

To refresh the dataset list:

```bash
# Remove old data
rm data/all-datasets.json

# Fetch fresh data
node scripts/fetch-all-datasets.js
```

## 🛠️ Troubleshooting

### Common Issues

1. **Network Error**: Check your internet connection
2. **API Rate Limiting**: The script includes delays between requests
3. **File Permissions**: Ensure you can write to the `data/` directory
4. **Node.js Version**: Requires Node.js 14+ for async/await support

### Error Messages

- `Failed to load datasets`: Check if the JSON file exists
- `Error fetching page X`: Network or API issue
- `No datasets found`: Search term too specific

## 🔗 Related Files

- **`services/dataset.ts`**: API service functions
- **`layout/explore/actions.js`**: Redux actions for dataset fetching
- **`pages/data/explore/[[...dataset]].jsx`**: Main explore page
- **`components/datasets/list/`**: Dataset list components

## 📞 Support

For issues with:
- **API Access**: Check Resource Watch API documentation
- **Script Errors**: Review console output for details
- **Web Viewer**: Check browser console for JavaScript errors

---

*This tool provides complete access to all Resource Watch datasets, matching the functionality of the `/data/explore` page but with enhanced search and filtering capabilities.*
