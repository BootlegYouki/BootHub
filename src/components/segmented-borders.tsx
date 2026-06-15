import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SegmentedBordersProps {
  borderAccent: string;
  topSegmentWidth: number;
}

export const SegmentedBorders: React.FC<SegmentedBordersProps> = ({ borderAccent, topSegmentWidth }) => {
  return (
    <>
      <View style={[styles.borderLeft, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderRight, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderBottom, { backgroundColor: borderAccent }]} />
      <View style={[styles.borderTopLeft, { backgroundColor: borderAccent, width: topSegmentWidth }]} />
      <View style={[styles.borderTopRight, { backgroundColor: borderAccent, width: topSegmentWidth }]} />
    </>
  );
};

const styles = StyleSheet.create({
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
    height: 1.5,
    zIndex: 5,
  },
  borderTopRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 1.5,
    zIndex: 5,
  },
});
