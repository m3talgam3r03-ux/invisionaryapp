import { memo } from 'react';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme';

type CrestProps = {
  size?: number;
  /** `full` aggiunge il doppio anello esterno; `mark` è solo l'occhio + iris (per header). */
  variant?: 'full' | 'mark';
};

/**
 * Emblema del brand Invisionary: occhio (visione) con iris a crest dei quattro assi
 * (♠♥♦♣) divisi dalla croce. Linee color testo (bone), cuori/quadri in rosso carte.
 */
export const Crest = memo(function Crest({ size = 96, variant = 'mark' }: CrestProps) {
  const { colors } = useTheme();
  const line = colors.text;
  const red = colors.accent;
  const suitSize = 8.5;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {variant === 'full' && (
        <>
          <Circle cx={50} cy={50} r={48} stroke={line} strokeWidth={1.5} fill="none" />
          <Circle cx={50} cy={50} r={43} stroke={line} strokeWidth={0.9} fill="none" />
        </>
      )}

      {/* Occhio (mandorla) */}
      <Path d="M 16 50 Q 50 26 84 50 Q 50 74 16 50 Z" stroke={line} strokeWidth={2} fill="none" />

      {/* Iris + croce divisoria */}
      <Circle cx={50} cy={50} r={16} stroke={line} strokeWidth={1.4} fill="none" />
      <Line x1={50} y1={34} x2={50} y2={66} stroke={line} strokeWidth={1.3} />
      <Line x1={34} y1={50} x2={66} y2={50} stroke={line} strokeWidth={1.3} />

      {/* Quattro assi (solo il seme, per leggibilità) */}
      <SvgText x={42.3} y={45.6} fontSize={suitSize} fontWeight="700" fill={line} textAnchor="middle">
        ♠
      </SvgText>
      <SvgText x={57.7} y={45.6} fontSize={suitSize} fontWeight="700" fill={red} textAnchor="middle">
        ♥
      </SvgText>
      <SvgText x={42.3} y={61.2} fontSize={suitSize} fontWeight="700" fill={red} textAnchor="middle">
        ♦
      </SvgText>
      <SvgText x={57.7} y={61.2} fontSize={suitSize} fontWeight="700" fill={line} textAnchor="middle">
        ♣
      </SvgText>
    </Svg>
  );
});
