import { memo } from 'react';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme';

type CrestProps = {
  size?: number;
  /**
   * `full` = sigillo completo (doppio anello + testo ad arco + stelle + i quattro assi):
   * è il logo ufficiale, da usare grande (login, splash).
   * `mark` = solo occhio + semi, leggibile anche a 40-60 px (header, avatar).
   */
  variant?: 'full' | 'mark';
};

const TOP_TEXT = 'INVISIONARY';
const BOTTOM_TEXT = 'WINNING DREAM TEAM';

/**
 * Dispone i caratteri lungo un arco di cerchio.
 * `top`: gli angoli crescono da sinistra a destra passando sopra; in basso il verso
 * si inverte così il testo resta leggibile (lettere rivolte verso il centro).
 */
function arcLetters(text: string, radius: number, centerDeg: number, stepDeg: number, top: boolean) {
  const chars = [...text];
  const mid = (chars.length - 1) / 2;
  return chars.map((ch, i) => {
    const deg = top ? centerDeg + (i - mid) * stepDeg : centerDeg - (i - mid) * stepDeg;
    const rad = (deg * Math.PI) / 180;
    return {
      key: `${i}-${ch}`,
      ch,
      x: 50 + radius * Math.cos(rad),
      y: 50 + radius * Math.sin(rad),
      rot: top ? deg + 90 : deg - 90,
    };
  });
}

/** Stella a quattro punte (i separatori del sigillo, a ore 3 e ore 9). */
function star(cx: number, cy: number, r: number) {
  const i = r * 0.22;
  return `M ${cx} ${cy - r} Q ${cx + i} ${cy - i} ${cx + r} ${cy} Q ${cx + i} ${cy + i} ${cx} ${cy + r} Q ${cx - i} ${cy + i} ${cx - r} ${cy} Q ${cx - i} ${cy - i} ${cx} ${cy - r} Z`;
}

/**
 * Emblema del brand Invisionary: occhio (= visione) la cui iride è divisa in croce
 * nei quattro assi ♠♥♦♣ (= la mano vincente). Cuori e quadri in rosso carte,
 * tutto il resto nel colore testo (bone).
 */
export const Crest = memo(function Crest({ size = 96, variant = 'mark' }: CrestProps) {
  const { colors } = useTheme();
  const line = colors.text;
  const red = colors.accent;
  const full = variant === 'full';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {full && (
        <G>
          {/* Doppio anello esterno + anello interno che chiude la fascia del testo */}
          <Circle cx={50} cy={50} r={49} stroke={line} strokeWidth={0.8} fill="none" />
          <Circle cx={50} cy={50} r={46.5} stroke={line} strokeWidth={1.8} fill="none" />
          <Circle cx={50} cy={50} r={34} stroke={line} strokeWidth={1.2} fill="none" />

          {/* INVISIONARY (arco superiore) */}
          {arcLetters(TOP_TEXT, 36, 270, 11.5, true).map((l) => (
            <SvgText
              key={l.key}
              x={l.x}
              y={l.y}
              fontSize={9}
              fontWeight="800"
              fill={line}
              textAnchor="middle"
              rotation={l.rot}
              originX={l.x}
              originY={l.y}
            >
              {l.ch}
            </SvgText>
          ))}

          {/* WINNING DREAM TEAM (arco inferiore) */}
          {arcLetters(BOTTOM_TEXT, 44.5, 90, 6.6, false).map((l) => (
            <SvgText
              key={l.key}
              x={l.x}
              y={l.y}
              fontSize={5.5}
              fontWeight="700"
              fill={line}
              textAnchor="middle"
              rotation={l.rot}
              originX={l.x}
              originY={l.y}
            >
              {l.ch}
            </SvgText>
          ))}

          {/* Stelle separatrici */}
          <Path d={star(10, 50, 4.2)} fill={line} />
          <Path d={star(90, 50, 4.2)} fill={line} />
        </G>
      )}

      {/* Occhio (mandorla) */}
      <Path d="M 16 50 Q 50 16 84 50 Q 50 84 16 50 Z" stroke={line} strokeWidth={2} fill="none" />

      {/* Iride + croce divisoria */}
      <Circle cx={50} cy={50} r={16.5} stroke={line} strokeWidth={1.4} fill="none" />
      <Line x1={32} y1={50} x2={68} y2={50} stroke={line} strokeWidth={2.2} />
      <Line x1={50} y1={32} x2={50} y2={68} stroke={line} strokeWidth={2.2} />

      {full ? (
        /* I quattro assi: in alto A sopra il seme, in basso il seme sopra la A */
        <G>
          <SvgText x={42} y={42.3} fontSize={6.2} fontWeight="800" fill={line} textAnchor="middle">
            A
          </SvgText>
          <SvgText x={42} y={48.8} fontSize={6.6} fontWeight="700" fill={line} textAnchor="middle">
            ♠
          </SvgText>

          <SvgText x={58} y={42.3} fontSize={6.2} fontWeight="800" fill={red} textAnchor="middle">
            A
          </SvgText>
          <SvgText x={58} y={48.8} fontSize={6.6} fontWeight="700" fill={red} textAnchor="middle">
            ♥
          </SvgText>

          <SvgText x={42} y={55.8} fontSize={6.6} fontWeight="700" fill={red} textAnchor="middle">
            ♦
          </SvgText>
          <SvgText x={42} y={62.3} fontSize={6.2} fontWeight="800" fill={red} textAnchor="middle">
            A
          </SvgText>

          <SvgText x={58} y={55.8} fontSize={6.6} fontWeight="700" fill={line} textAnchor="middle">
            ♣
          </SvgText>
          <SvgText x={58} y={62.3} fontSize={6.2} fontWeight="800" fill={line} textAnchor="middle">
            A
          </SvgText>
        </G>
      ) : (
        /* Versione ridotta: solo i semi, più grandi per restare leggibili */
        <G>
          <SvgText x={43} y={46.4} fontSize={8.6} fontWeight="700" fill={line} textAnchor="middle">
            ♠
          </SvgText>
          <SvgText x={57} y={46.4} fontSize={8.6} fontWeight="700" fill={red} textAnchor="middle">
            ♥
          </SvgText>
          <SvgText x={43} y={61.6} fontSize={8.6} fontWeight="700" fill={red} textAnchor="middle">
            ♦
          </SvgText>
          <SvgText x={57} y={61.6} fontSize={8.6} fontWeight="700" fill={line} textAnchor="middle">
            ♣
          </SvgText>
        </G>
      )}
    </Svg>
  );
});
