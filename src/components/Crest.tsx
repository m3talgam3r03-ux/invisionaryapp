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
  const suitSize = 8.6;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {variant === 'full' && (
        <>
          <Circle cx={50} cy={50} r={48} stroke={line} strokeWidth={1.4} fill="none" />
          <Circle cx={50} cy={50} r={44} stroke={line} strokeWidth={0.7} fill="none" />
        </>
      )}

      {/* Occhio (mandorla) */}
      <Path d="M 17 50 Q 50 27 83 50 Q 50 73 17 50 Z" stroke={line} strokeWidth={2} fill="none" />

      {/* Iris + croce divisoria */}
      <Circle cx={50} cy={50} r={15.5} stroke={line} strokeWidth={1.3} fill="none" />
      <Line x1={50} y1={35} x2={50} y2={65} stroke={line} strokeWidth={1.1} />
      <Line x1={35} y1={50} x2={65} y2={50} stroke={line} strokeWidth={1.1} />

      {/* Quattro assi (solo il seme, per leggibilità) */}
      <SvgText x={43} y={46.2} fontSize={suitSize} fontWeight="700" fill={line} textAnchor="middle">
        ♠
      </SvgText>
      <SvgText x={57} y={46.2} fontSize={suitSize} fontWeight="700" fill={red} textAnchor="middle">
        ♥
      </SvgText>
      <SvgText x={43} y={61.4} fontSize={suitSize} fontWeight="700" fill={red} textAnchor="middle">
        ♦
      </SvgText>
      <SvgText x={57} y={61.4} fontSize={suitSize} fontWeight="700" fill={line} textAnchor="middle">
        ♣
      </SvgText>

      {/* Pupilla centrale (fuoco dello sguardo) */}
      <Circle cx={50} cy={50} r={1.5} fill={red} />
    </Svg>
  );
});
