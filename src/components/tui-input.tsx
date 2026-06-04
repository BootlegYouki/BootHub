import React, { useState, useRef } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, ViewStyle, Keyboard, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  showSecureToggle?: boolean;
}

export const TuiInput: React.FC<TuiInputProps> = ({
  label,
  error,
  style,
  containerStyle,
  onFocus,
  onBlur,
  showSecureToggle,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [legendWidth, setLegendWidth] = useState(0);
  const [isSecure, setIsSecure] = useState(props.secureTextEntry);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const handleClear = () => {
    if (props.onChangeText) {
      props.onChangeText('');
    }
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const borderColor = error
    ? colors.destructive
    : isFocused
    ? colors.primary
    : isDark
    ? colors.primary + '40'
    : '#000000';

  const backgroundColor = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor,
          },
          containerStyle,
        ]}
      >
        {/* Custom Segmented Borders to support legend label sitting on top border */}
        <View style={[styles.borderLeft, { backgroundColor: borderColor }]} />
        <View style={[styles.borderRight, { backgroundColor: borderColor }]} />
        <View style={[styles.borderBottom, { backgroundColor: borderColor }]} />
        
        {label ? (
          <>
            <View style={[styles.borderTopLeft, { backgroundColor: borderColor }]} />
            <View
              style={[
                styles.borderTopRight,
                {
                  backgroundColor: borderColor,
                  left: 12 + legendWidth,
                },
              ]}
            />
            {/* Legend Label */}
            <View
              onLayout={(e) => setLegendWidth(e.nativeEvent.layout.width)}
              style={styles.legendWrapper}
            >
              <TuiText
                weight="bold"
                size="sm"
                style={{
                  color: error
                    ? colors.destructive
                    : isFocused
                    ? colors.primary
                    : colors.mutedForeground,
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </TuiText>
            </View>
          </>
        ) : (
          <View style={[styles.borderTopSolid, { backgroundColor: borderColor }]} />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '100%' }}>
          <TextInput
            ref={inputRef}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.textInput,
              {
                color: colors.foreground,
                fontFamily: 'JetBrainsMono_400Regular',
                flex: 1,
              },
              style,
            ]}
            {...props}
            secureTextEntry={isSecure}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {showSecureToggle && (
              <Pressable
                onPress={() => setIsSecure(!isSecure)}
                style={{
                  padding: 6,
                  marginLeft: 4,
                }}
              >
                <TuiText
                  weight="bold"
                  size="xs"
                  style={{ color: colors.primary, fontFamily: 'JetBrainsMono_700Bold' }}
                >
                  {isSecure ? '[SHOW]' : '[HIDE]'}
                </TuiText>
              </Pressable>
            )}
            {(isFocused && !!props.value) ? (
              <Pressable
                onPress={handleClear}
                style={{
                  padding: 6,
                  marginLeft: 4,
                }}
              >
                <X size={16} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {error && (
        <TuiText size="xs" style={styles.error} variant="destructive">
          * {error}
        </TuiText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  inputWrapper: {
    paddingHorizontal: 12,
    height: 56,
    justifyContent: 'center',
    position: 'relative',
  },
  borderLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 5,
  },
  borderRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 5,
  },
  borderBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    zIndex: 5,
  },
  borderTopLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 12,
    height: 1.5,
    zIndex: 5,
  },
  borderTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: 1.5,
    zIndex: 5,
  },
  borderTopSolid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 5,
  },
  legendWrapper: {
    position: 'absolute',
    top: -11,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  textInput: {
    fontSize: 14,
    padding: 0,
    margin: 0,
  },
  error: {
    marginTop: 4,
  },
});
