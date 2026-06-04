import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiCalendarProps {
  value: string; // MM-DD-YYYY format
  onChange: (date: string) => void;
}

// Month names list
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Weekdays headers
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export const TuiCalendar: React.FC<TuiCalendarProps> = ({ value, onChange }) => {
  const { colors, isDark } = useTheme();

  // Parse MM-DD-YYYY into year, month, day state
  const parseDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const m = parseInt(parts[0], 10) - 1;
      const d = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
        return { day: d, month: m, year: y };
      }
    }
    const today = new Date();
    return { day: today.getDate(), month: today.getMonth(), year: today.getFullYear() };
  };

  const initialDate = parseDate(value);
  
  // Navigation states
  const [currentMonth, setCurrentMonth] = useState(initialDate.month);
  const [currentYear, setCurrentYear] = useState(initialDate.year);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Sync state if value prop changes
  useEffect(() => {
    const parsed = parseDate(value);
    setSelectedDate(parsed);
    setCurrentMonth(parsed.month);
    setCurrentYear(parsed.year);
  }, [value]);

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const newFormattedDate = `${mStr}-${dStr}-${currentYear}`;
    onChange(newFormattedDate);
  };

  // Generate grid cells
  const cells: { type: 'empty' | 'day'; day?: number }[] = [];

  // Padding cells for starting offset of the month
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ type: 'empty' });
  }

  // Active days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ type: 'day', day: i });
  }

  // Fill up grid with empty cells to match rows of 7 cells
  while (cells.length % 7 !== 0) {
    cells.push({ type: 'empty' });
  }

  const borderAccent = isDark ? colors.primary : '#000000';
  const gridSeparatorColor = isDark ? '#27272A' : '#E4E4E7';
  const today = new Date();

  return (
    <View style={[styles.calendarBox, { borderColor: borderAccent }]}>
      
      {/* 01: MONTH NAVIGATION HEADER */}
      <View style={[styles.navHeader, { borderBottomWidth: 1.5, borderColor: borderAccent }]}>
        <Pressable
          onPress={handlePrevMonth}
          style={({ pressed }) => [
            styles.navBtn,
            {
              borderColor: borderAccent,
              backgroundColor: pressed ? (isDark ? '#27272A' : '#E4E4E7') : 'transparent',
            }
          ]}
        >
          <ChevronLeft size={18} color={colors.primary} />
        </Pressable>

        <TuiText weight="bold" size="sm" style={[styles.monthYearText, { color: colors.primary }]}>
          {MONTHS[currentMonth]} {currentYear}
        </TuiText>

        <Pressable
          onPress={handleNextMonth}
          style={({ pressed }) => [
            styles.navBtn,
            {
              borderColor: borderAccent,
              backgroundColor: pressed ? (isDark ? '#27272A' : '#E4E4E7') : 'transparent',
            }
          ]}
        >
          <ChevronRight size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* 02: WEEKDAY HEADER ROW */}
      <View style={[styles.weekdaysRow, { borderBottomWidth: 1.5, borderColor: borderAccent, backgroundColor: isDark ? '#1F1F23' : '#F4F4F5' }]}>
        {WEEKDAYS.map((day, idx) => (
          <View key={day} style={[styles.cellWrapper, { borderRightWidth: idx === 6 ? 0 : 1, borderColor: gridSeparatorColor }]}>
            <TuiText size="xs" weight="bold" style={{ color: colors.mutedForeground, textAlign: 'center' }}>
              {day}
            </TuiText>
          </View>
        ))}
      </View>

      {/* 03: DAYS GRID */}
      <View style={styles.gridBody}>
        {/* Render rows in groups of 7 */}
        {Array.from({ length: cells.length / 7 }).map((_, rowIndex) => (
          <View
            key={rowIndex}
            style={[
              styles.gridRow,
              {
                borderBottomWidth: rowIndex === (cells.length / 7) - 1 ? 0 : 1,
                borderColor: gridSeparatorColor,
              }
            ]}
          >
            {cells.slice(rowIndex * 7, (rowIndex + 1) * 7).map((cell, cellIndex) => {
              if (cell.type === 'empty') {
                return (
                  <View
                    key={cellIndex}
                    style={[
                      styles.cellWrapper,
                      {
                        borderRightWidth: cellIndex === 6 ? 0 : 1,
                        borderColor: gridSeparatorColor,
                        backgroundColor: isDark ? '#131316' : '#FAFAFA',
                      }
                    ]}
                  >
                    <TuiText size="xs" style={{ color: 'transparent', textAlign: 'center' }}>00</TuiText>
                  </View>
                );
              }

              const isSelected =
                selectedDate.day === cell.day &&
                selectedDate.month === currentMonth &&
                selectedDate.year === currentYear;

              const isToday =
                today.getDate() === cell.day &&
                today.getMonth() === currentMonth &&
                today.getFullYear() === currentYear;

              return (
                <Pressable
                  key={cellIndex}
                  onPress={() => handleSelectDay(cell.day!)}
                  style={({ pressed }) => [
                    styles.cellWrapper,
                    {
                      borderRightWidth: cellIndex === 6 ? 0 : 1,
                      borderColor: gridSeparatorColor,
                      backgroundColor: isSelected
                        ? colors.primary
                        : pressed
                        ? (isDark ? '#27272A' : '#E4E4E7')
                        : 'transparent',
                    }
                  ]}
                >
                  <TuiText
                    size="xs"
                    weight={isSelected || isToday ? 'bold' : 'regular'}
                    style={{
                      color: isSelected
                        ? colors.primaryForeground
                        : isToday
                        ? colors.primary
                        : colors.foreground,
                      textAlign: 'center',
                    }}
                  >
                    {isToday && !isSelected
                      ? `[${cell.day}]`
                      : String(cell.day)}
                  </TuiText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  calendarBox: {
    borderWidth: 1.5,
    width: '100%',
    alignSelf: 'center',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
  },
  navBtn: {
    borderWidth: 1.5,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    letterSpacing: 0.5,
  },
  weekdaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  gridBody: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
  },
  cellWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
