import React from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  // Map strings to the { label, value } shape react-native-element-dropdown expects.
  const items = data.map((d) => ({ label: d, value: d }));

  const handleChange = (item: { label: string; value: string }) => {
    onChange(item.value);
  };

  const handleSearchChange = (text: string) => {
    // Free-text fallback: propagate the typed value immediately so that
    // submitting without selecting a suggestion still saves the typed string.
    onChange(text);
  };

  if (isLoading) {
    return (
      <View
        style={[dropdownStyle, { justifyContent: 'center', alignItems: 'center', height: 48 }]}
      >
        <ActivityIndicator color="#e0e0ff" size="small" />
      </View>
    );
  }

  return (
    <Dropdown
      testID={testID}
      data={items}
      labelField="label"
      valueField="value"
      value={value || null}
      onChange={handleChange}
      placeholder={placeholder}
      search
      searchPlaceholder="Type to search..."
      onChangeText={handleSearchChange}
      style={dropdownStyle}
      placeholderStyle={dropdownPlaceholderStyle}
      selectedTextStyle={dropdownSelectedTextStyle}
      containerStyle={dropdownContainerStyle}
      itemTextStyle={dropdownItemTextStyle}
    />
  );
}
