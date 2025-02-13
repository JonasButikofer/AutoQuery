import React, { useState } from 'react';

const AdvancedFilters = ({ availableColumns, onFiltersUpdate }) => {
  // "Where" filters state (for WHERE clause conditions)
  const [whereFilters, setWhereFilters] = useState([]);
  // Group By state: an array of columns to group by
  const [groupBy, setGroupBy] = useState([]);
  // Aggregates state: an array of objects, each with a function and column
  const [aggregates, setAggregates] = useState([]);
  // Order By state: an array of objects, each with a column and direction
  const [orderBy, setOrderBy] = useState([]);
  // State to toggle display of Group By section
  const [showGroupBy, setShowGroupBy] = useState(false);

  // ----------------- WHERE Filters ----------------- //
  const addWhereFilter = () => {
    const newFilter = {
      id: Date.now(),
      column: '',
      dataType: 'text',
      operator: '=', // default for text, numeric and date
      value1: '',
      value2: ''
    };
    const updated = [...whereFilters, newFilter];
    setWhereFilters(updated);
    notifyParent(updated, groupBy, aggregates, orderBy);
  };

  const updateWhereFilter = (id, field, value) => {
    const updated = whereFilters.map(filter =>
      filter.id === id ? { ...filter, [field]: value } : filter
    );
    setWhereFilters(updated);
    notifyParent(updated, groupBy, aggregates, orderBy);
  };

  const removeWhereFilter = (id) => {
    const updated = whereFilters.filter(filter => filter.id !== id);
    setWhereFilters(updated);
    notifyParent(updated, groupBy, aggregates, orderBy);
  };

  // ----------------- Group By ----------------- //
  const toggleGroupBy = (column) => {
    let updated;
    if (groupBy.includes(column)) {
      updated = groupBy.filter(col => col !== column);
    } else {
      updated = [...groupBy, column];
    }
    setGroupBy(updated);
    notifyParent(whereFilters, updated, aggregates, orderBy);
  };

  // ----------------- Aggregates ----------------- //
  const addAggregate = () => {
    const newAgg = {
      id: Date.now(),
      column: '',
      func: 'COUNT'
    };
    const updated = [...aggregates, newAgg];
    setAggregates(updated);
    notifyParent(whereFilters, groupBy, updated, orderBy);
  };

  const updateAggregate = (id, field, value) => {
    const updated = aggregates.map(agg =>
      agg.id === id ? { ...agg, [field]: value } : agg
    );
    setAggregates(updated);
    notifyParent(whereFilters, groupBy, updated, orderBy);
  };

  const removeAggregate = (id) => {
    const updated = aggregates.filter(agg => agg.id !== id);
    setAggregates(updated);
    notifyParent(whereFilters, groupBy, updated, orderBy);
  };

  // ----------------- Order By ----------------- //
  const addOrderBy = () => {
    const newOrder = {
      id: Date.now(),
      column: '',
      direction: 'ASC'
    };
    const updated = [...orderBy, newOrder];
    setOrderBy(updated);
    notifyParent(whereFilters, groupBy, aggregates, updated);
  };

  const updateOrderBy = (id, field, value) => {
    const updated = orderBy.map(order =>
      order.id === id ? { ...order, [field]: value } : order
    );
    setOrderBy(updated);
    notifyParent(whereFilters, groupBy, aggregates, updated);
  };

  const removeOrderBy = (id) => {
    const updated = orderBy.filter(order => order.id !== id);
    setOrderBy(updated);
    notifyParent(whereFilters, groupBy, aggregates, updated);
  };

  // ----------------- Notify Parent ----------------- //
  // Build a "where" filters object that the backend can understand.
  // For numeric ranges or date ranges, the value is a string "min,max".
  const buildWhereFiltersObject = (filtersArray) => {
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
        } else if (filter.dataType === 'date') {
          if (filter.operator === 'between' && filter.value1 && filter.value2) {
            filtersObject[filter.column] = `${filter.value1},${filter.value2}`;
          } else if (filter.operator === '=' && filter.value1) {
            filtersObject[filter.column] = filter.value1;
          }
        }
      }
    });
    return filtersObject;
  };

  // Notify parent with all advanced filter settings
  const notifyParent = (whereFilters, groupBy, aggregates, orderBy) => {
    const filtersObject = buildWhereFiltersObject(whereFilters);
    onFiltersUpdate({
      filters: filtersObject,
      groupBy,
      aggregates,
      orderBy
    });
  };

  return (
    <div className="advanced-filters">
      <h3>Advanced Filters</h3>

      {/* --------- WHERE Filters Section --------- */}
      <h4>Where Filters</h4>
      {whereFilters.map(filter => (
        <div key={filter.id} className="filter-row" style={{ marginBottom: '1rem' }}>
          {/* Column Selector */}
          <select
            value={filter.column}
            onChange={(e) => updateWhereFilter(filter.id, 'column', e.target.value)}
          >
            <option value="">Select Column</option>
            {availableColumns.map((col, index) => (
              <option key={index} value={col}>{col}</option>
            ))}
          </select>

          {/* Data Type Selector */}
          <select
            value={filter.dataType}
            onChange={(e) => updateWhereFilter(filter.id, 'dataType', e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="text">Text</option>
            <option value="numeric">Numeric</option>
            <option value="date">Date</option>
          </select>

          {/* Operator Selector */}
          {(filter.dataType === 'numeric' || filter.dataType === 'date') && (
            <select
              value={filter.operator}
              onChange={(e) => updateWhereFilter(filter.id, 'operator', e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            >
              <option value="=">=</option>
              {filter.dataType === 'numeric' && <option value="range">Range</option>}
              {filter.dataType === 'date' && <option value="between">Between</option>}
            </select>
          )}

          {/* Input for single value */}
          {(filter.dataType === 'text' ||
            (filter.dataType === 'numeric' && filter.operator === '=') ||
            (filter.dataType === 'date' && filter.operator === '=')) && (
            <input
              type={filter.dataType === 'date' ? 'date' : filter.dataType === 'numeric' ? 'number' : 'text'}
              placeholder={
                filter.dataType === 'numeric' ? 'Value' :
                filter.dataType === 'date' ? 'Date' :
                'Keyword'
              }
              value={filter.value1}
              onChange={(e) => updateWhereFilter(filter.id, 'value1', e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            />
          )}

          {/* Inputs for range values */}
          {((filter.dataType === 'numeric' && filter.operator === 'range') ||
            (filter.dataType === 'date' && filter.operator === 'between')) && (
            <>
              <input
                type={filter.dataType === 'date' ? 'date' : 'number'}
                placeholder={filter.dataType === 'date' ? 'Start' : 'Min'}
                value={filter.value1}
                onChange={(e) => updateWhereFilter(filter.id, 'value1', e.target.value)}
                style={{ marginLeft: '0.5rem' }}
              />
              <input
                type={filter.dataType === 'date' ? 'date' : 'number'}
                placeholder={filter.dataType === 'date' ? 'End' : 'Max'}
                value={filter.value2}
                onChange={(e) => updateWhereFilter(filter.id, 'value2', e.target.value)}
                style={{ marginLeft: '0.5rem' }}
              />
            </>
          )}

          <button onClick={() => removeWhereFilter(filter.id)} style={{ marginLeft: '0.5rem' }}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={addWhereFilter}>Add Where Filter</button>

      {/* --------- Group By Toggle Button --------- */}
      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => setShowGroupBy(!showGroupBy)}>
          {showGroupBy ? 'Hide Group By' : 'Group By'}
        </button>
      </div>

      {/* --------- Group By Section (conditionally rendered) --------- */}
      {showGroupBy && (
        <div>
          <h4 style={{ marginTop: '1rem' }}>Group By</h4>
          {availableColumns.map((col, index) => (
            <div key={`groupby-${index}`}>
              <label>
                <input
                  type="checkbox"
                  checked={groupBy.includes(col)}
                  onChange={() => toggleGroupBy(col)}
                />
                {col}
              </label>
            </div>
          ))}
        </div>
      )}

      {/* --------- Aggregates Section --------- */}
      <h4 style={{ marginTop: '1rem' }}>Aggregates</h4>
      {aggregates.map(agg => (
        <div key={agg.id} style={{ marginBottom: '1rem' }}>
          <select
            value={agg.func}
            onChange={(e) => updateAggregate(agg.id, 'func', e.target.value)}
          >
            <option value="COUNT">COUNT</option>
            <option value="SUM">SUM</option>
            <option value="AVG">AVG</option>
            <option value="MIN">MIN</option>
            <option value="MAX">MAX</option>
          </select>
          <select
            value={agg.column}
            onChange={(e) => updateAggregate(agg.id, 'column', e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="">Select Column</option>
            {availableColumns.map((col, index) => (
              <option key={index} value={col}>{col}</option>
            ))}
          </select>
          <button onClick={() => removeAggregate(agg.id)} style={{ marginLeft: '0.5rem' }}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={addAggregate}>Add Aggregate</button>

      {/* --------- Order By Section --------- */}
      <h4 style={{ marginTop: '1rem' }}>Order By</h4>
      {orderBy.map(order => (
        <div key={order.id} style={{ marginBottom: '1rem' }}>
          <select
            value={order.column}
            onChange={(e) => updateOrderBy(order.id, 'column', e.target.value)}
          >
            <option value="">Select Column</option>
            {availableColumns.map((col, index) => (
              <option key={index} value={col}>{col}</option>
            ))}
          </select>
          <select
            value={order.direction}
            onChange={(e) => updateOrderBy(order.id, 'direction', e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
          <button onClick={() => removeOrderBy(order.id)} style={{ marginLeft: '0.5rem' }}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={addOrderBy}>Add Order By</button>
    </div>
  );
};

export default AdvancedFilters;
