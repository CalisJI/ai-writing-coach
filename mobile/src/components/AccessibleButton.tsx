import {Pressable, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';

type Props = PressableProps & {label: string; textStyle?: StyleProp<TextStyle>};

export function AccessibleButton({label, textStyle, style, ...props}: Props) {
  const {tokens} = useTheme();
  const baseStyle: StyleProp<ViewStyle> = [
    {
      minHeight: 48,
      minWidth: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: tokens.radius.control,
      backgroundColor: tokens.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  ];
  return (
    <Pressable
      {...props}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(state) => [baseStyle, typeof style === 'function' ? style(state) : style]}
    >
      <Text style={[{color: tokens.scheme === 'dark' ? '#0B1726' : '#FFFFFF', fontWeight: '700'}, textStyle]}>{label}</Text>
    </Pressable>
  );
}
