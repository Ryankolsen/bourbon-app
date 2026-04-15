import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

interface SearchablePickerProps {
  data: string[];
  value: string;
  onChange: (value: string) => void;
  onSearchChange?: (text: string) => void;
  /** When true, shows an "Add '[text]'" option for unmatched search text. */
  allowCreate?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  testID?: string;
}

type PickerItem = { label: string; value: string; _isNew?: boolean };

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
 *
 * When `allowCreate` is true, an "Add '[text]'" option is appended to the
 * suggestions list whenever the search text has no exact match, giving the
 * user an explicit way to confirm a new entry.
 */
export function SearchablePicker({
  data,
  value,
  onChange,
  onSearchChange,
  allowCreate = false,
  placeholder = 'Search...',
  isLoading = false,
  testID,
}: SearchablePickerProps) {
  // Separate local state for the Dropdown's selected value so that free-text
  // typed by the user (propagated to the parent via onChange) doesn't feed
  // back into the Dropdown's value prop and reset the internal search input.
  const [dropdownValue, setDropdownValue] = useState<string | null>(value || null);
  // Tracks the current search text so we can append an "Add" option.
  const [searchText, setSearchText] = useState('');
  const isOpenRef = useRef(false);
  const justSelectedRef = useRef(false);

  // Sync external value changes (e.g. form reset) only when dropdown is closed.
  useEffect(() => {
    if (!isOpenRef.current) {
      setDropdownValue(value || null);
    }
  }, [value]);

  // Build item list, appending a create option when there is no exact match.
  const baseItems: PickerItem[] = data.map((d) => ({ label: d, value: d }));
  const hasExactMatch = data.some(
    (d) => d.toLowerCase() === searchText.toLowerCase()
  );
  const createItem: PickerItem | null =
    allowCreate && searchText.trim().length > 0 && !hasExactMatch
      ? { label: searchText, value: searchText, _isNew: true }
      : null;
  const items: PickerItem[] = createItem
    ? [...baseItems, createItem]
    : baseItems;

  const handleChange = (item: PickerItem) => {
    justSelectedRef.current = true;
    setDropdownValue(item.value);
    onChange(item.value);
  };

  const handleSearchChange = (text: string) => {
    // react-native-element-dropdown fires onChangeText("") immediately after a
    // selection to clear its internal search box. Ignore that event so it
    // doesn't wipe the value we just set via handleChange.
    if (justSelectedRef.current && text === '') {
      justSelectedRef.current = false;
      return;
    }
    justSelectedRef.current = false;
    setSearchText(text);
    // Free-text fallback: propagate the typed value so that submitting without
    // selecting a suggestion still saves the typed string. Do NOT update
    // dropdownValue here — that would re-enter the search text as a selected
    // value and glitch the Dropdown's internal search input.
    onChange(text);
    // Notify the parent of the current search text separately so it can drive
    // its suggestions query without coupling to the form value.
    onSearchChange?.(text);
  };

  const renderItem = (item: PickerItem) => {
    if (item._isNew) {
      return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: '#f59e0b', fontSize: 14 }}>
            + Add "{item.label}"
          </Text>
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: '#e0e0ff', fontSize: 14 }}>{item.label}</Text>
      </View>
    );
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
      renderItem={renderItem}
      renderRightIcon={() =>
        isLoading ? (
          <ActivityIndicator color="#e0e0ff" size="small" style={{ marginRight: 4 }} />
        ) : null
      }
    />
  );
}
