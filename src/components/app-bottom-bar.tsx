import { Plus, House, Settings } from '@/lib/icons';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';

import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { BlurView } from 'expo-blur';
import { useSplitDataStore } from '@/stores/split-data-store';
import { QuickAddGroupSheet } from './ui/quick-add-group-sheet';

const items = [
  { key: 'groups', label: 'Gruplar', href: '/groups' as const, Icon: House, isAction: false },
  { key: 'add', label: 'Ekle', Icon: Plus, isAction: true },
  { key: 'profile', label: 'Profil', href: '/profile' as const, Icon: Settings, isAction: false },
];

// The bar is mounted per-screen, so the active pill position is kept at module
// scope to persist across remounts (via getter/setter to avoid reassigning an
// outer variable inside the component).
let pillMemoryIndex = 0;
const getPillMemory = () => pillMemoryIndex;
const setPillMemory = (index: number) => {
  pillMemoryIndex = index;
};

export function AppBottomBar() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const { sessionUserId, listGroupsForUser } = useSplitDataStore();
  const myGroups = sessionUserId ? listGroupsForUser(sessionUserId) : [];
  const [popoverVisible, setPopoverVisible] = useState(false);

  const activeIndex = pathname.startsWith('/profile') ? 2 : 0;

  // Tab bar container parameters
  const pillWidth = 64;
  const tabWidth = 72;
  const paddingX = 4;
  const barWidth = paddingX * 2 + tabWidth * items.length;

  // Calculate center X offset for a given tab index
  const getPillX = (index: number) => {
    return paddingX + index * tabWidth + (tabWidth - pillWidth) / 2;
  };

  // Precompute pill positions as plain numbers so worklets never call getPillX
  // synchronously on the UI thread (that throws "Remote Function" errors).
  const pillPositions = items.map((_, i) => getPillX(i));
  const minX = pillPositions[0];
  const maxX = pillPositions[items.length - 1];
  const activePillX = pillPositions[activeIndex];

  const [initialIndex] = useState(getPillMemory);
  const translateX = useSharedValue(getPillX(initialIndex));
  const isDragging = useSharedValue(false);
  const lastHoveredIndex = useSharedValue(initialIndex);

  const handleActionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (myGroups.length === 0) {
      Toast.show({ type: 'info', text1: 'Harcama eklemek için bir grubunuz olmalı.' });
    } else if (myGroups.length === 1) {
      router.push(href(`/groups/${myGroups[0].id}/add-expense`));
    } else {
      setPopoverVisible(!popoverVisible);
    }
  };

  const navigateToIndex = (index: number) => {
    const item = items[index];
    if (item.isAction) {
      handleActionPress();
      return;
    }
    
    setPillMemory(activeIndex);
    router.push(href(item.href!));
  };

  const triggerHaptic = () => {
    Haptics.selectionAsync();
  };

  // Pan gesture to track horizontal drag over the bar
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      lastHoveredIndex.value = activeIndex;
    })
    .onUpdate((event) => {
      const fingerX = event.x;
      const targetX = fingerX - pillWidth / 2;
      // Let the pill follow the finger within tab limits
      translateX.value = Math.max(minX, Math.min(maxX, targetX));

      const hoveredIndex = fingerX >= (barWidth / 2) ? 1 : 0;
      if (hoveredIndex !== lastHoveredIndex.value) {
        lastHoveredIndex.value = hoveredIndex;
        runOnJS(triggerHaptic)();
      }
    })
    .onEnd((event) => {
      isDragging.value = false;
      const fingerX = event.x;
      let selectedIndex = 0;
      if (fingerX >= barWidth * (2 / 3)) {
        selectedIndex = 2;
      } else if (fingerX >= barWidth / 3) {
        selectedIndex = 1;
      }
      
      // If dropped on action button, navigate but snap pill back to real active index
      if (selectedIndex === 1) {
        runOnJS(handleActionPress)();
        translateX.value = withSpring(activePillX, { damping: 25, stiffness: 180, overshootClamping: true });
        return;
      }
      
      const targetSnapX = selectedIndex === 0 ? minX : maxX;
      translateX.value = withSpring(targetSnapX, { damping: 25, stiffness: 180, overshootClamping: true });
      runOnJS(navigateToIndex)(selectedIndex);
    });

  const animatedPillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Sync activeIndex path changes with active pill position
  useEffect(() => {
    if (initialIndex !== activeIndex && !isDragging.value) {
      // Reanimated shared value; mutating .value in an effect is the intended usage.
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = withSpring(activePillX, { damping: 25, stiffness: 180, overshootClamping: true });
      setPillMemory(activeIndex);
    }
  }, [activeIndex, initialIndex, activePillX, isDragging, translateX]);

  const isDark = t.background === '#000000';
  const fallbackBg = isDark ? 'rgba(18, 18, 20, 0.82)' : 'rgba(255, 255, 255, 0.82)';

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.bar,
            {
              width: barWidth,
              bottom: Math.max(insets.bottom, 12),
              borderColor: t.border,
              backgroundColor: Platform.OS === 'android' ? fallbackBg : 'transparent',
            },
          ]}
        >
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 30,
                borderCurve: 'continuous',
              },
            ]}
          />
        )}

        {/* Sliding active pill indicator */}
        <Animated.View
          style={[
            styles.activePill,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            },
            animatedPillStyle,
          ]}
        />

        {items.map((item, index) => {
          const Icon = item.Icon;

          if (item.isAction) {
            return (
              <Pressable
                key={item.key}
                onPress={() => navigateToIndex(index)}
                style={styles.item}
                accessibilityRole="button"
                accessibilityLabel="Harcama Ekle"
              >
                <View style={[styles.addButton, { backgroundColor: t.primary }]}>
                  <Icon size={24} color={t.primaryForeground} strokeWidth={2.6} />
                </View>
              </Pressable>
            );
          }

          const active = index === activeIndex;
          const color = active ? t.primary : t.mutedForeground;
          return (
            <Pressable
              key={item.key}
              onPress={() => navigateToIndex(index)}
              style={styles.item}
            >
              <Icon size={28} color={color} />
            </Pressable>
          );
        })}
        </Animated.View>
      </GestureDetector>
      
      <QuickAddGroupSheet
        visible={popoverVisible}
        groups={myGroups}
        onClose={() => setPopoverVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    alignSelf: 'center', // This perfectly centers the absolute element!
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  activePill: {
    position: 'absolute',
    top: 4, // Center vertically: (60 - 52) / 2 = 4
    height: 52,
    width: 64,
    borderRadius: 26,
    borderCurve: 'continuous',
  },
  item: {
    width: 72,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
