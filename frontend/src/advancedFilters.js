import React, { useState } from 'react';

// Define the operator options per data type.
const operatorOptions = {
  text: [
    { value: '=', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: '!=', label: 'Not Equal' },
  ],
  numeric: [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not Equal' },
    { value: '<', label: 'Less Than' },
    { value: '<=', label: 'Less Than or Equal' },
    { value: '>', label: 'Greater Than' },
    { value: '>=', label: 'Greater Than or Equal' },
    { value: 'range', label: 'Range' },
  ],
  date: [
    { value: '=', label: 'Equals' },
    { value: '<', label: 'Before' },
    { value: '>', label: 'After' },
    { value: 'between', label: 'Between' },
  ],
};

const AdvancedFilters = ({ availableColumns, onFiltersUpdate }) => {
  // State for WHERE filters, Group By, Aggregates, and Order By
  const [whereFilters, setWhereFilters] = useState([]);
  const [groupBy, setGroupBy] = useState([]);
  const [aggregates, setAggregates] = useState([]);
  const [orderBy, setOrderBy] = useState([]);
  const [showGroupBy, setShowGroupBy] = useState(false);

  // ----------------------- Helper Functions -----------------------
  // These helpers let you work with either strings or objects.
  const getColumnValue = (col) =>
    typeof col === 'object' ? col.name : col;
  const getColumnLabel = (col) =>
    typeof col === 'object' ? col.label || col.name : col;

  // Instead of converting the array to a simple object,
  // we now output an array of filter objects so the backend
  // can see both the operator and the value(s).
  const buildWhereFiltersArray = (filtersArray) => {
    return filtersArray
      .filter((filter) => filter.column && filter.value1)
      .map((filter) => {
        if ((filter.operator === 'range' || filter.operator === 'between') && filter.value2) {
          return {
            column: filter.column,
            operator: filter.operator,
            value1: filter.value1,
            value2: filter.value2,
            dataType: filter.dataType,
          };
        } else {
          return {
            column: filter.column,
            operator: filter.operator,
            value: filter.value1,
            dataType: filter.dataType,
          };
        }
      });
  };

  // Notify the parent with the full advanced filters object.
  const notifyParent = (wFilters, groupBy, aggregates, orderBy) => {
    const filtersArray = buildWhereFiltersArray(wFilters);
    onFiltersUpdate({
      filters: filtersArray,
      groupBy,
      aggregates,
      orderBy,
    });
  };

  // ----------------------- WHERE Filters -----------------------
  const addWhereFilter = () => {
    const newFilter = {
      id: Date.now(),
      column: '',
      dataType: 'text',
      operator: '=', // default operator
      value1: '',
      value2: '',
    };
    const updated = [...whereFilters, newFilter];
    setWhereFilters(updated);
    notifyParent(updated, groupBy, aggregates, orderBy);
  };

  const updateWhereFilter = (id, field, value) => {
    const updated = whereFilters.map((filter) =>
      filter.id === id ? { ...filter, [field]: value } : filter
    );
    setWhereFilters(updated);
    notifyParent(updated, groupBy, aggregates, orderBy);
  };

  const removeWhereFilter = (id) => {
    const updated = whereFilters.filter((filter) => filter.id !== id);
    setWhereFilters(updated);
    notifyParent(updated, groupBy, aggregates, orderBy);
  };

  // ----------------------- Group By -----------------------
  const toggleGroupBy = (column) => {
    let updated;
    if (groupBy.includes(column)) {
      updated = groupBy.filter((col) => col !== column);
    } else {
      updated = [...groupBy, column];
    }
    setGroupBy(updated);
    notifyParent(whereFilters, updated, aggregates, orderBy);
  };

  // ----------------------- Aggregates -----------------------
  const addAggregate = () => {
    const newAgg = {
      id: Date.now(),
      column: '',
      func: 'COUNT',
    };
    const updated = [...aggregates, newAgg];
    setAggregates(updated);
    notifyParent(whereFilters, groupBy, updated, orderBy);
  };

  const updateAggregate = (id, field, value) => {
    const updated = aggregates.map((agg) =>
      agg.id === id ? { ...agg, [field]: value } : agg
    );
    setAggregates(updated);
    notifyParent(whereFilters, groupBy, updated, orderBy);
  };

  const removeAggregate = (id) => {
    const updated = aggregates.filter((agg) => agg.id !== id);
    setAggregates(updated);
    notifyParent(whereFilters, groupBy, updated, orderBy);
  };

  // ----------------------- Order By -----------------------
  const addOrderBy = () => {
    const newOrder = {
      id: Date.now(),
      column: '',
      direction: 'ASC',
    };
    const updated = [...orderBy, newOrder];
    setOrderBy(updated);
    notifyParent(whereFilters, groupBy, aggregates, updated);
  };

  const updateOrderBy = (id, field, value) => {
    const updated = orderBy.map((order) =>
      order.id === id ? { ...order, [field]: value } : order
    );
    setOrderBy(updated);
    notifyParent(whereFilters, groupBy, aggregates, updated);
  };

  const removeOrderBy = (id) => {
    const updated = orderBy.filter((order) => order.id !== id);
    setOrderBy(updated);
    notifyParent(whereFilters, groupBy, aggregates, updated);
  };

  // ----------------------- Render -----------------------
  return (
    <div className="advanced-filters">
      <h3>Advanced Filters</h3>

      {/* --------- WHERE Filters Section --------- */}
      <h4>Where Filters</h4>
      {whereFilters.map((filter) => (
        <div key={filter.id} className="filter-row" style={{ marginBottom: '1rem' }}>
          {/* Column Selector */}
          <select
            value={filter.column}
            onChange={(e) => updateWhereFilter(filter.id, 'column', e.target.value)}
          >
            <option value="">Select Column</option>
            {availableColumns.map((col, index) => {
              const colVal = getColumnValue(col);
              const colLabel = getColumnLabel(col);
              return (
                <option key={index} value={colVal}>
                  {colLabel}
                </option>
              );
            })}
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
          <select
            value={filter.operator}
            onChange={(e) => updateWhereFilter(filter.id, 'operator', e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            {operatorOptions[filter.dataType].map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {/* Input(s) for Value(s) */}
          {(filter.operator === 'range' || filter.operator === 'between') ? (
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
          ) : (
            <input
              type={
                filter.dataType === 'date'
                  ? 'date'
                  : filter.dataType === 'numeric'
                  ? 'number'
                  : 'text'
              }
              placeholder="Value"
              value={filter.value1}
              onChange={(e) => updateWhereFilter(filter.id, 'value1', e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            />
          )}

          <button onClick={() => removeWhereFilter(filter.id)} style={{ marginLeft: '0.5rem' }}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={addWhereFilter}>Add Where Filter</button>

      {/* --------- Group By Section --------- */}
      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => setShowGroupBy(!showGroupBy)}>
          {showGroupBy ? 'Hide Group By' : 'Group By'}
        </button>
      </div>
      {showGroupBy && (
        <div>
          <h4 style={{ marginTop: '1rem' }}>Group By</h4>
          {availableColumns.map((col, index) => {
            const colVal = getColumnValue(col);
            const colLabel = getColumnLabel(col);
            return (
              <div key={`groupby-${index}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={groupBy.includes(colVal)}
                    onChange={() => toggleGroupBy(colVal)}
                  />
                  {colLabel}
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* --------- Aggregates Section --------- */}
      <h4 style={{ marginTop: '1rem' }}>Aggregates</h4>
      {aggregates.map((agg) => (
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
            {availableColumns.map((col, index) => {
              const colVal = getColumnValue(col);
              const colLabel = getColumnLabel(col);
              return (
                <option key={index} value={colVal}>
                  {colLabel}
                </option>
              );
            })}
          </select>
          <button onClick={() => removeAggregate(agg.id)} style={{ marginLeft: '0.5rem' }}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={addAggregate}>Add Aggregate</button>

      {/* --------- Order By Section --------- */}
      <h4 style={{ marginTop: '1rem' }}>Order By</h4>
      {orderBy.map((order) => (
        <div key={order.id} style={{ marginBottom: '1rem' }}>
          <select
            value={order.column}
            onChange={(e) => updateOrderBy(order.id, 'column', e.target.value)}
          >
            <option value="">Select Column</option>
            {availableColumns.map((col, index) => {
              const colVal = getColumnValue(col);
              const colLabel = getColumnLabel(col);
              return (
                <option key={index} value={colVal}>
                  {colLabel}
                </option>
              );
            })}
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
