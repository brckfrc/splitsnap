import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const OPEN_ANIMATION = {
  duration: 210,
  easing: Easing.out(Easing.cubic),
};

const CLOSE_ANIMATION = {
  duration: 170,
  easing: Easing.in(Easing.cubic),
};

const SETTLE_SPRING = {
  mass: 0.7,
  damping: 30,
  stiffness: 320,
  overshootClamping: true,
};

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const gestureStartY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      // Kullanıcı animasyon devam ederken dokunursa animasyonla savaşmasın.
      cancelAnimation(translateY);
      gestureStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Yukarı doğru over-drag yapılmasını engelle.
      translateY.value = Math.max(
        0,
        gestureStartY.value + event.translationY,
      );
    })
    .onEnd((event) => {
      const shouldClose =
        translateY.value > 140 ||
        event.velocityY > 900;

      if (shouldClose) {
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          CLOSE_ANIMATION,
          (finished) => {
            if (finished) {
              runOnJS(onClose)();
            }
          },
        );
      } else {
        translateY.value = withSpring(0, {
          ...SETTLE_SPRING,
          velocity: event.velocityY,
        });
      }
    });

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, OPEN_ANIMATION);
    } else {
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        CLOSE_ANIMATION,
      );
    }
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [0.55, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]} />
        </Pressable>

        {/* Sheet Container with Keyboard Avoid */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.sheetWrapper, animatedStyle]}>
                <View
                  style={[
                    styles.sheet,
                    {
                      backgroundColor: t.card,
                      borderColor: t.border,
                      paddingBottom: Math.max(insets.bottom, Spacing.four) + 100,
                      marginBottom: -100,
                    },
                  ]}
                >
                  {/* Handle */}
                  <View style={styles.handleContainer}>
                    <View style={[styles.handle, { backgroundColor: t.mutedForeground + '50' }]} />
                  </View>

                  {/* Header */}
                  {title && (
                    <View style={[styles.header, { borderBottomColor: t.border }]}>
                      <Text style={[styles.title, { color: t.foreground }]}>{title}</Text>
                    </View>
                  )}

                  {/* Content */}
                  <View style={styles.content}>{children}</View>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrapper: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 24,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    alignItems: 'center',
    paddingBottom: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.four,
  },
});
