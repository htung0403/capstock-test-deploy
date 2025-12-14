/*
  File: components/CategorySelect.jsx
  Purpose: Category select component with search and create new option
*/
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

function CategorySelect({
  options = [],
  value = '',
  onChange,
  onCreateNew,
  placeholder = 'Search or create category...',
  label = '',
  required = false,
  getOptionLabel = (option) => option.category_name || option.name || option,
  getOptionValue = (option) => option._id || option.id || option,
  normalizeValue = (value) => {
    return value.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, ' ');
  },
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Filter options based on search query
  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option).toLowerCase();
    return label.includes(searchQuery.toLowerCase());
  });

  // Check if search query matches any existing option
  const normalizedSearch = normalizeValue(searchQuery);
  const exactMatch = options.find(option => 
    getOptionLabel(option).toLowerCase() === normalizedSearch.toLowerCase()
  );
  const showCreateNew = searchQuery.trim() && !exactMatch && normalizedSearch.length >= 2;

  // Get selected option
  const selectedOption = options.find(opt => getOptionValue(opt) === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    const optionValue = getOptionValue(option);
    onChange(optionValue);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleCreateNew = async () => {
    if (!onCreateNew || !showCreateNew) return;
    
    try {
      const newOption = await onCreateNew(normalizedSearch);
      if (newOption) {
        const optionValue = getOptionValue(newOption);
        onChange(optionValue);
        setSearchQuery('');
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error creating new category:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const max = showCreateNew ? filteredOptions.length : filteredOptions.length - 1;
          return prev < max ? prev + 1 : 0;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const max = showCreateNew ? filteredOptions.length : filteredOptions.length - 1;
          return prev > 0 ? prev - 1 : max;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex === filteredOptions.length && showCreateNew) {
          handleCreateNew();
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className={`block text-sm font-semibold mb-2 ${
          isDark ? 'text-gray-200' : 'text-gray-900'
        }`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : (selectedOption ? getOptionLabel(selectedOption) : '')}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery(selectedOption ? getOptionLabel(selectedOption) : '');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2.5 rounded-md border shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 cursor-pointer ${
            isDark
              ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-400 focus:border-transparent'
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-400'
          }`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {isOpen ? '▲' : '▼'}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className={`absolute z-50 w-full mt-1 rounded-md shadow-lg border max-h-60 overflow-auto ${
            isDark
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-300'
          }`}>
            {filteredOptions.length === 0 && !showCreateNew ? (
              <div className={`px-3 py-2 text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No categories found
              </div>
            ) : (
              <>
                {filteredOptions.map((option, index) => {
                  const optionValue = getOptionValue(option);
                  const label = getOptionLabel(option);
                  const isSelected = value === optionValue;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={optionValue}
                      onClick={() => handleSelect(option)}
                      className={`px-3 py-2 cursor-pointer ${
                        isHighlighted
                          ? isDark ? 'bg-gray-700' : 'bg-gray-100'
                          : ''
                      } ${isSelected ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') : ''} hover:${
                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                      } transition-colors`}
                    >
                      <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                        {label}
                      </span>
                      {isSelected && (
                        <span className="ml-2 text-blue-500">✓</span>
                      )}
                    </div>
                  );
                })}

                {showCreateNew && (
                  <div
                    onClick={handleCreateNew}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 border-t ${
                      isDark ? 'border-gray-600' : 'border-gray-200'
                    } ${
                      highlightedIndex === filteredOptions.length
                        ? isDark ? 'bg-gray-700' : 'bg-gray-100'
                        : ''
                    } hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
                  >
                    <span className="text-blue-500">+</span>
                    <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                      Create "{normalizedSearch}"
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CategorySelect;

