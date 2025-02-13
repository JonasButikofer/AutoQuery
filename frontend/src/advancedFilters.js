import React, { useState } from 'react';

const AdvancedFilters = ({ availableColumns, onFiltersUpdate }) => {
  // Each filter row has an id, selected column, data type, operator, and value(s)
  const [filters, setFilters] = useState([]);

  // Add a new empty filter row
  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: Date.now(), // simple unique id
        column: '',
        dataType: 'text',
        operator: '=', // default operator for numeric filters
        value1: '',    // for text or numeric "="
        value2: ''     // only used for numeric range
      }
    ]);
  };

  // Update a specific field in a filter row and notify the parent
  const updateFilter = (id, field, value) => {
    const updatedFilters = filters.map(filter => {
      if (filter.id === id) {
        return { ...filter, [field]: value };
      }
      return filter;
    });
    setFilters(updatedFilters);
    notifyParent(updatedFilters);
  };

  // Remove a filter row by its id and notify the parent
  const removeFilter = (id) => {
    const updatedFilters = filters.filter(filter => filter.id !== id);
    setFilters(updatedFilters);
    notifyParent(updatedFilters);
  };

  // Construct a filters object for the backend.
  // For numeric ranges, the value is a string "min,max".
  const notifyParent = (filtersArray) => {
    const filtersObject = {};
    filtersArray.forEach(filter => {
      if (filter.column) {
        if (filter.dataType === 'numeric') {
          if (filter.operator === 'range' && filter.value1 && filter.value2) {
            filtersObject[filter.column] = `${filter.value1},${filter.value2}`;
          } else if (filter.operator === '=' && filter.value1) {
            filtersObject[filter.column] = filter.value1;
          }
        } else if (filter.dataType === 'text' && filter.value1) {
          filtersObject[filter.column] = filter.value1;
        }
      }
    });
    onFiltersUpdate(filtersObject);
  };

  return (
    <div className="advanced-filters">
      <h3>Advanced Filters</h3>
      {filters.map(filter => (
        <div key={filter.id} className="filter-row" style={{ marginBottom: '1rem' }}>
          {/* Column Selector */}
          <select
            value={filter.column}
            onChange={(e) => updateFilter(filter.id, 'column', e.target.value)}
          >
            <option value="">Select Column</option>
            {availableColumns.map((col, index) => (
              <option key={index} value={col}>
                {col}
              </option>
            ))}
          </select>

          {/* Data Type Selector */}
          <select
            value={filter.dataType}
            onChange={(e) => updateFilter(filter.id, 'dataType', e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="text">Text</option>
            <option value="numeric">Numeric</option>
          </select>

          {/* Numeric Operator Selector */}
          {filter.dataType === 'numeric' && (
            <select
              value={filter.operator}
              onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            >
              <option value="=">=</option>
              <option value="range">Range</option>
            </select>
          )}

          {/* Input for text or numeric "=" operator */}
          {((filter.dataType === 'text') ||
            (filter.dataType === 'numeric' && filter.operator === '=')) && (
            <input
              type={filter.dataType === 'numeric' ? 'number' : 'text'}
              placeholder={filter.dataType === 'numeric' ? 'Value' : 'Keyword'}
              value={filter.value1}
              onChange={(e) => updateFilter(filter.id, 'value1', e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            />
          )}

          {/* Inputs for numeric range */}
          {filter.dataType === 'numeric' && filter.operator === 'range' && (
            <>
              <input
                type="number"
                placeholder="Min"
                value={filter.value1}
                onChange={(e) => updateFilter(filter.id, 'value1', e.target.value)}
                style={{ marginLeft: '0.5rem' }}
              />
              <input
                type="number"
                placeholder="Max"
                value={filter.value2}
                onChange={(e) => updateFilter(filter.id, 'value2', e.target.value)}
                style={{ marginLeft: '0.5rem' }}
              />
            </>
          )}

          {/* Button to remove a filter row */}
          <button onClick={() => removeFilter(filter.id)} style={{ marginLeft: '0.5rem' }}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={addFilter}>Add Filter</button>
    </div>
  );
};

export default AdvancedFilters;
