/**
 * Unit tests for SearchablePicker.
 *
 * Key regression covered:
 *   react-native-element-dropdown fires onChangeText("") immediately after
 *   onChange(item) when a suggestion is selected (it clears its internal
 *   search box). Without the justSelectedRef guard this wiped the RHF form
 *   value and left the field visually blank.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchablePicker } from './SearchablePicker';

// ── Mock ──────────────────────────────────────────────────────────────────────

// Simulates the real library behaviour:
//   - renders a search input that calls onChangeText on each keystroke
//   - renders each option as a pressable that calls onChange(item) then
//     immediately onChangeText("") — exactly what the library does after a pick
jest.mock('react-native-element-dropdown', () => {
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');
  return {
    Dropdown: ({
      data,
      value,
      onChange,
      onChangeText,
      onFocus,
      onBlur,
      placeholder,
      testID,
    }: any) => (
      <View testID={testID}>
        <Text testID={`${testID}-value`}>{value ?? ''}</Text>
        <TextInput
          testID={`${testID}-search`}
          onFocus={onFocus}
          onBlur={onBlur}
          onChangeText={onChangeText}
          placeholder={placeholder}
        />
        {(data ?? []).map((item: any) => (
          <TouchableOpacity
            key={item.value}
            testID={`${testID}-option-${item.value}`}
            onPress={() => {
              onChange(item);
              // Library clears its internal search box after selection
              onChangeText?.('');
              onBlur?.();
            }}
          >
            <Text>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISTILLERIES = ['Buffalo Trace', 'Heaven Hill', 'Wild Turkey'];

function renderPicker(onChange = jest.fn(), onSearchChange?: jest.Mock) {
  return {
    onChange,
    onSearchChange,
    ...render(
      <SearchablePicker
        testID="picker"
        data={DISTILLERIES}
        value=""
        onChange={onChange}
        onSearchChange={onSearchChange}
      />
    ),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SearchablePicker', () => {
  it('calls onChange with the selected value when an option is picked', () => {
    const onChange = jest.fn();
    renderPicker(onChange);

    fireEvent.press(screen.getByTestId('picker-option-Buffalo Trace'));

    expect(onChange).toHaveBeenCalledWith('Buffalo Trace');
  });

  it('does not overwrite the selected value when the library fires onChangeText("") after selection', () => {
    // Regression: the library fires onChangeText("") immediately after onChange
    // to clear its search box. This must not clobber the just-selected value.
    const onChange = jest.fn();
    renderPicker(onChange);

    fireEvent.press(screen.getByTestId('picker-option-Buffalo Trace'));

    // onChange should have been called exactly once with the selected value,
    // not a second time with "".
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Buffalo Trace');
  });

  it('propagates typed text to onChange (free-text fallback)', () => {
    const onChange = jest.fn();
    renderPicker(onChange);

    fireEvent(screen.getByTestId('picker-search'), 'focus');
    fireEvent.changeText(screen.getByTestId('picker-search'), 'buf');

    expect(onChange).toHaveBeenCalledWith('buf');
  });

  it('calls onSearchChange with typed text but not with the post-selection clear', () => {
    const onChange = jest.fn();
    const onSearchChange = jest.fn();
    renderPicker(onChange, onSearchChange);

    // Type to search
    fireEvent(screen.getByTestId('picker-search'), 'focus');
    fireEvent.changeText(screen.getByTestId('picker-search'), 'buf');
    expect(onSearchChange).toHaveBeenCalledWith('buf');

    onSearchChange.mockClear();

    // Select an option — post-selection onChangeText("") must not reach onSearchChange
    fireEvent.press(screen.getByTestId('picker-option-Buffalo Trace'));
    expect(onSearchChange).not.toHaveBeenCalled();
  });
});
