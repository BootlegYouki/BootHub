import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, Keyboard, Easing } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const SPRING_CONFIG_OPEN = {
  stiffness: 300,
  damping: 28,
  mass: 0.8,
  useNativeDriver: true,
};

interface TuiDrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  keyboardOffset?: number;
}

export const TuiDrawer: React.FC<TuiDrawerProps> = ({
  visible,
  onClose,
  title,
  children,
  keyboardOffset = 0,
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(300);
  const [legendWidth, setLegendWidth] = useState(0);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const nudgeAnim = useRef(new Animated.Value(0)).current;

  const borderTopLeftWidth = Math.max(0, (cardWidth - legendWidth) / 2);
  const borderTopRightLeft = Math.max(0, (cardWidth + legendWidth) / 2);

  // Interpolate backdrop opacity dynamically based on slide position
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, cardHeight || 300],
    outputRange: [0.65, 0],
    extrapolate: 'clamp',
  });



  // Sync nudge animation when keyboardOffset changes
  useEffect(() => {
    Animated.timing(nudgeAnim, {
      toValue: keyboardOffset,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [keyboardOffset]);

  // Sync animations with visible state changes
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(cardHeight || 300);
      Animated.spring(slideAnim, {
        toValue: 0,
        ...SPRING_CONFIG_OPEN,
      }).start();
    } else if (modalVisible) {
      Animated.timing(slideAnim, {
        toValue: cardHeight || 300,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const borderAccent = isDark ? colors.primary : '#000000';

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Dimmed backdrop view fading in/out during open/close transitions */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: '#000000', opacity: backdropOpacity }
          ]}
        />
        {/* Tap backdrop to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={styles.drawerKeyboardAvoidingView}>
          <Animated.View
            onLayout={(e) => {
              setCardWidth(e.nativeEvent.layout.width);
              setCardHeight(e.nativeEvent.layout.height);
            }}
            style={[
              styles.drawerContent,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: Animated.add(slideAnim, nudgeAnim) }],
              }
            ]}
          >
            {/* Dismiss keyboard when clicking empty space inside the drawer */}
            <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />

            {/* Custom Segmented Borders: only the top has a border to act as the shelf boundary */}
            <View style={[styles.borderTopLeft, { backgroundColor: borderAccent, width: borderTopLeftWidth }]} />
            <View 
              style={[
                styles.borderTopRight, 
                { 
                  backgroundColor: borderAccent, 
                  left: borderTopRightLeft,
                }
              ]} 
            />

            {/* Legend title resting on top border */}
            <View
              onLayout={(e) => setLegendWidth(e.nativeEvent.layout.width)}
              style={styles.legendWrapper}
            >
              <TuiText weight="bold" size="md" style={{ color: colors.primary }}>
                {title}
              </TuiText>
            </View>

            {/* Form/Children Content */}
            <View style={styles.content}>
              {children}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  drawerKeyboardAvoidingView: {
    width: '100%',
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    position: 'relative',
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
    top: 0,
    right: 0,
    height: 1.5,
    zIndex: 5,
  },
  legendWrapper: {
    position: 'absolute',
    top: -15,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 100,
  },
  content: {
    width: '100%',
    marginTop: 20,
  },
});
