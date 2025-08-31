import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Icon from 'components/ui/icon';

const DataTable = ({ data, title = 'Data Table', className = '' }) => {
  const [sorting, setSorting] = useState({ key: null, direction: 'asc' });
  const [globalFilter, setGlobalFilter] = useState('');

  const sortedAndFilteredData = useMemo(() => {
    if (!data?.rows) return [];
    
    let processedRows = [...data.rows];
    
    // Apply sorting
    if (sorting.key) {
      processedRows.sort((a, b) => {
        const aVal = a[sorting.key];
        const bVal = b[sorting.key];
        
        if (aVal === bVal) return 0;
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sorting.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    // Apply filtering
    if (globalFilter) {
      const filter = globalFilter.toLowerCase();
      processedRows = processedRows.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(filter)
        )
      );
    }
    
    return processedRows;
  }, [data?.rows, sorting, globalFilter]);

  const handleSort = (key) => {
    if (sorting.key === key) {
      setSorting(prev => ({
        key,
        direction: prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setSorting({ key, direction: 'asc' });
    }
  };

  const handleExport = (format) => {
    if (!data) return;
    
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'excel') {
      exportToExcel();
    }
  };

  const exportToCSV = () => {
    if (!data) return;
    
    const headers = data.columns.map(col => col.label);
    const rows = sortedAndFilteredData.map(row =>
      data.columns.map(col => {
        const value = row[col.key];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToExcel = () => {
    // For now, just export as CSV with .xlsx extension
    // In a real implementation, you'd use a library like SheetJS
    exportToCSV();
  };

  if (!data) {
    return (
      <div className="data-table-no-data">
        No data available
      </div>
    );
  }

  return (
    <div className={classnames('data-table-container', className)}>
      {/* Header */}
      <div className="data-table-header">
        <h3 className="data-table-title">{title}</h3>
        <div className="data-table-controls">
          <input
            type="text"
            className="data-table-search-input"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="data-table-export-buttons">
            <button
              className="data-table-export-btn data-table-export-btn-csv"
              onClick={() => handleExport('csv')}
            >
              CSV
            </button>
            <button
              className="data-table-export-btn data-table-export-btn-excel"
              onClick={() => handleExport('excel')}
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {data.columns.map(col => (
                <th
                  key={col.key}
                  className={classnames('data-table-header-cell', {
                    'data-table-header-cell-sortable': col.sortable
                  })}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="data-table-header-content">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="data-table-sort-indicator">
                        {sorting.key === col.key ? (
                          sorting.direction === 'asc' ? (
                            <Icon name="icon-arrow-up" />
                          ) : (
                            <Icon name="icon-arrow-down" />
                          )
                        ) : (
                          <Icon name="icon-arrows-v" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredData.length > 0 ? (
              sortedAndFilteredData.map((row, rowIndex) => (
                <tr key={rowIndex} className="data-table-row">
                  {data.columns.map(col => (
                    <td key={col.key} className="data-table-cell">
                      {col.type === 'number' && typeof row[col.key] === 'number'
                        ? row[col.key].toFixed(2)
                        : row[col.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={data.columns.length} 
                  className="data-table-no-data-cell"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="data-table-footer">
        Showing {sortedAndFilteredData.length} of {data.rows.length} results
      </div>

      <style jsx>{`
        .data-table-container {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin: 1.5rem 0;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .data-table-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .data-table-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        .data-table-controls {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .data-table-search-input {
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          width: 200px;
          transition: all 0.2s ease;
          background: white;
          color: #374151;
        }

        .data-table-search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .data-table-export-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .data-table-export-btn {
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        .data-table-export-btn-csv {
          background: #059669;
          color: white;
        }

        .data-table-export-btn-csv:hover {
          background: #047857;
          transform: translateY(-1px);
        }

        .data-table-export-btn-excel {
          background: #2563eb;
          color: white;
        }

        .data-table-export-btn-excel:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .data-table-wrapper {
          overflow-x: auto;
          background: white;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }

        .data-table-header-cell {
          padding: 1rem 1.25rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s ease;
        }

        .data-table-header-cell-sortable {
          cursor: pointer;
          user-select: none;
        }

        .data-table-header-cell-sortable:hover {
          background: #f3f4f6;
        }

        .data-table-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .data-table-sort-indicator {
          color: #9ca3af;
          margin-left: 0.5rem;
        }

        .data-table-row {
          transition: background-color 0.2s ease;
        }

        .data-table-row:hover {
          background: #f9fafb;
        }

        .data-table-cell {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
          color: #374151;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        .data-table-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        .data-table-no-data,
        .data-table-no-data-cell {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
          font-style: italic;
          font-family: 'Inter', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        @media (max-width: 768px) {
          .data-table-header {
            flex-direction: column;
            align-items: stretch;
          }

          .data-table-controls {
            justify-content: space-between;
          }

          .data-table-search-input {
            width: 100%;
          }

          .data-table-container {
            margin: 1rem 0;
          }
        }
      `}</style>
    </div>
  );
};

DataTable.propTypes = {
  data: PropTypes.shape({
    columns: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      sortable: PropTypes.bool.isRequired,
      type: PropTypes.oneOf(['string', 'number', 'date'])
    })).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired
  }),
  title: PropTypes.string,
  className: PropTypes.string
};

export default DataTable;



