/**
 * Full-screen, zoomable image viewer.
 *
 * Receipts are tall and text-dense, so the inline thumbnails on the expense
 * screens are only ever a preview. This is where the image is actually
 * readable. Zooming is anchored to wherever the fingers are, so a total in the
 * bottom corner can be magnified without first dragging it to the middle.
 */

import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { X } from '@/lib/icons';
import { Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * How far the image may be dragged before its edge would pull inside the
 * screen. Measured against the full-screen image box rather than the letterboxed
 * photo inside it, since the photo's intrinsic size isn't known here.
 */
function maxOffset(atScale: number) {
  'worklet';
  return {
    x: (SCREEN_WIDTH * (atScale - 1)) / 2,
    y: (SCREEN_HEIGHT * (atScale - 1)) / 2,
  };
}

type ImageViewerModalProps = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
};

export function ImageViewerModal({ visible, uri, onClose }: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  // The point of the image (in unscaled coordinates, relative to its centre)
  // that sat under the fingers when a pinch began. Holding it in place while
  // the scale changes is what makes the zoom track the fingers.
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  // Reset on the way out rather than on open, so reopening never starts
  // mid-zoom from the previous session and there is no first-frame flash.
  const handleClose = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    onClose();
  };

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      const focusX = e.focalX - SCREEN_WIDTH / 2;
      const focusY = e.focalY - SCREEN_HEIGHT / 2;
      originX.value = (focusX - translateX.value) / scale.value;
      originY.value = (focusY - translateY.value) / scale.value;
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = clamp(savedScale.value * e.scale, 1, MAX_SCALE);
      const focusX = e.focalX - SCREEN_WIDTH / 2;
      const focusY = e.focalY - SCREEN_HEIGHT / 2;
      const max = maxOffset(next);
      scale.value = next;
      // Solving "the origin point stays under the focus" also absorbs any
      // movement of the fingers, so two-finger dragging comes along for free.
      translateX.value = clamp(focusX - next * originX.value, -max.x, max.x);
      translateY.value = clamp(focusY - next * originY.value, -max.y, max.y);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const pan = Gesture.Pan()
    // Two-finger movement is already handled by the pinch focus, so this only
    // needs to cover single-finger dragging once zoomed in.
    .maxPointers(1)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      const max = maxOffset(scale.value);
      translateX.value = clamp(savedTranslateX.value + e.translationX, -max.x, max.x);
      translateY.value = clamp(savedTranslateY.value + e.translationY, -max.y, max.y);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      const focusX = e.x - SCREEN_WIDTH / 2;
      const focusY = e.y - SCREEN_HEIGHT / 2;
      const pointX = (focusX - translateX.value) / scale.value;
      const pointY = (focusY - translateY.value) / scale.value;
      const max = maxOffset(DOUBLE_TAP_SCALE);
      const nextX = clamp(focusX - DOUBLE_TAP_SCALE * pointX, -max.x, max.x);
      const nextY = clamp(focusY - DOUBLE_TAP_SCALE * pointY, -max.y, max.y);

      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      translateX.value = withTiming(nextX);
      translateY.value = withTiming(nextY);
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
    });

  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={gesture}>
          <Animated.Image
            source={{ uri }}
            style={[styles.image, imageStyle]}
            resizeMode="contain"
            accessibilityLabel="Fiş fotoğrafı"
          />
        </GestureDetector>

        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={[styles.closeBtn, { top: insets.top + Spacing.two }]}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <View style={styles.closeCircle}>
            <X size={22} color="#fff" />
          </View>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.four,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
