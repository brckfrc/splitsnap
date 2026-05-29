import DateTimePicker from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  value: Date;
  maximumDate?: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

/**
 * Native spinner date picker in a bottom sheet. UIDatePicker is narrower than the sheet;
 * we center it horizontally so leftover space is symmetric (not a lump on the right).
 */
export function DatePickerModal({ visible, value, maximumDate, minimumDate, onConfirm, onCancel }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const draft = useDraft(value, visible);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: t.card, paddingBottom: insets.bottom + Spacing.four },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: t.border }]}>
            <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="İptal" hitSlop={12}>
              <Text style={[styles.headerBtn, { color: t.mutedForeground }]}>İptal</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: t.foreground }]}>Tarih Seç</Text>
            <Pressable
              onPress={() => onConfirm(draft.current)}
              accessibilityRole="button"
              accessibilityLabel="Tamam"
              hitSlop={12}
            >
              <Text style={[styles.headerBtn, { color: t.primary }]}>Tamam</Text>
            </Pressable>
          </View>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={draft.current}
              mode="date"
              display="spinner"
              locale="tr-TR"
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={(_e, d) => { if (d) draft.set(d); }}
              style={styles.pickerSpinner}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function useDraft(initial: Date, visible: boolean) {
  const [current, setCurrent] = useState(initial);
  const prevVisible = useRef(visible);
  if (visible && !prevVisible.current) {
    setCurrent(initial);
  }
  prevVisible.current = visible;
  return { current, set: setCurrent };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  pickerSpinner: {
    height: 216,
  },
});
