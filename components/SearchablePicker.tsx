import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

interface SearchablePickerProps {
  data: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  testID?: string;
}

const dropdownStyle = {
  backgroundColor: '#1a1860',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 4,
};

const dropdownPlaceholderStyle = {
  color: '#7a3c19',
  fontSize: 16,
};

const dropdownSelectedTextStyle = {
  color: '#e0e0ff',
  fontSize: 16,
};

const dropdownContainerStyle = {
  backgroundColor: '#1a1860',
  borderRadius: 12,
  borderColor: '#2d2b8a',
};

const dropdownItemTextStyle = {
  color: '#e0e0ff',
  fontSize: 14,
};

const dropdownInputSearchStyle = {
  backgroundColor: '#0f0e4a',
  color: '#e0e0ff',
  borderRadius: 8,
  borderColor: '#2d2b8a',
  fontSize: 14,
};

/**
 * A searchable dropdown picker backed by react-native-element-dropdown.
 * Accepts a list of plain strings as `data`. Supports free-text fallback:
 * if the user types a value that isn't in the list and does not select a
 * suggestion, the typed value is passed directly to `onChange`.
 */
export function SearchablePicker({
  data,
  value,
  onChange,
  placeholder = 'Search...',
  isLoading = false,
  testID,
}: SearchablePickerProps) {
  // Separate local state for the Dropdown's selected value so that free-text
  // typed by the user (propagated to the parent via onChange) doesn't feed
  // back into the Dropdown's value prop and reset the internal search input.
  const [dropdownValue, setDropdownValue] = useState<string | null>(value || null);
  const isOpenRef = useRef(false);

  // Sync external value changes (e.g. form reset) only when dropdown is closed.
  useEffect(() => {
    if (!isOpenRef.current) {
      setDropdownValue(value || null);
    }
  }, [value]);

  // Map strings to the { label, value } shape react-native-element-dropdown expects.
  const items = data.map((d) => ({ label: d, value: d }));

  const handleChange = (item: { label: string; value: string }) => {
    setDropdownValue(item.value);
    onChange(item.value);
  };

  const handleSearchChange = (text: string) => {
    // Free-text fallback: propagate the typed value so that submitting without
    // selecting a suggestion still saves the typed string. Do NOT update
    // dropdownValue here — that would re-enter the search text as a selected
    // value and glitch the Dropdown's internal search input.
    onChange(text);
  };

  return (
    <Dropdown
      testID={testID}
      data={items}
      labelField="label"
      valueField="value"
      value={dropdownValue}
      onChange={handleChange}
      onFocus={() => { isOpenRef.current = true; }}
      onBlur={() => { isOpenRef.current = false; }}
      placeholder={placeholder}
      search
      searchPlaceholder="Type to search..."
      onChangeText={handleSearchChange}
      style={dropdownStyle}
      placeholderStyle={dropdownPlaceholderStyle}
      selectedTextStyle={dropdownSelectedTextStyle}
      containerStyle={dropdownContainerStyle}
      itemTextStyle={dropdownItemTextStyle}
      inputSearchStyle={dropdownInputSearchStyle}
      searchPlaceholderTextColor="#5a5a9a"
      renderRightIcon={() =>
        isLoading ? (
          <ActivityIndicator color="#e0e0ff" size="small" style={{ marginRight: 4 }} />
        ) : null
      }
    />
  );
}
