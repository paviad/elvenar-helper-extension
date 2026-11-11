import React from 'react';
import { Box } from '@mui/material';
import { ENCOUNTERS_PER_PROVINCE, Province, PROVINCE_STATUS_LABELS } from './deriveWorldMap';
import { Hex, hexCentre, hexPoints, isCityAt } from './worldMapGeometry';
import { DIFFICULTY_LABELS, formatDuration, GOOD_COLOURS, goodName, hexStyle } from './worldMapStyle';

const HEX_SIZE = 14;
const HEX = hexPoints(HEX_SIZE - 0.8);
const CITY_HEX = hexPoints(HEX_SIZE * 0.45);
/** Hexes of empty map kept around the provinces. */
const MARGIN = 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 12;

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WorldMapHexesProps {
  home: Hex;
  provinces: Province[];
  /** Whether a province passes the filters; the others are dimmed. */
  matches: (province: Province) => boolean;
  goodsNames: Record<string, string>;
  now: number;
}

const describe = (province: Province, goodsNames: Record<string, string>, now: number) => {
  const lines = [`${goodName(goodsNames, province.good)} · ${PROVINCE_STATUS_LABELS[province.status]}`];
  if (province.status === 'incomplete') {
    lines.push(`${province.done} of ${ENCOUNTERS_PER_PROVINCE} encounters done`);
  }
  if (province.endsAt !== undefined) {
    lines.push(`Scout arrives in ${formatDuration(Math.max(0, province.endsAt - now) / 1000)}`);
  }
  if (province.cost !== undefined && province.time !== undefined) {
    lines.push(`Scouting: ${province.cost.toLocaleString()} coins, ${formatDuration(province.time)}`);
  }
  if (province.difficulty) {
    lines.push(`Difficulty: ${DIFFICULTY_LABELS[province.difficulty] ?? province.difficulty}`);
  }
  lines.push(`Distance ${province.distance}`);
  return lines.join('\n');
};

/**
 * The provinces as hexes, laid out as on the game's map, coloured by good and drawn by state.
 * Dragging pans and the wheel zooms.
 */
export const WorldMapHexes = ({ home, provinces, matches, goodsNames, now }: WorldMapHexesProps) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  // The whole extent, in drawing units. City sites are drawn within it for bearings.
  const extent = React.useMemo(() => {
    const hexes: Hex[] = [home, ...provinces];
    const rs = hexes.map((h) => h.r);
    const qs = hexes.map((h) => h.q);
    const rMin = Math.min(...rs) - MARGIN;
    const rMax = Math.max(...rs) + MARGIN;
    const qMin = Math.min(...qs) - MARGIN;
    const qMax = Math.max(...qs) + MARGIN;
    const topLeft = hexCentre({ r: rMin, q: qMin }, HEX_SIZE);
    const bottomRight = hexCentre({ r: rMax, q: qMax + 1 }, HEX_SIZE);

    const cities: Hex[] = [];
    for (let r = rMin; r <= rMax; r++) {
      for (let q = qMin; q <= qMax; q++) {
        if (isCityAt(r, q) && !(r === home.r && q === home.q)) {
          cities.push({ r, q });
        }
      }
    }
    return {
      box: { x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y },
      cities,
    };
  }, [home, provinces]);

  const [viewBox, setViewBox] = React.useState<ViewBox>(extent.box);
  // A different city, or one whose map grew, starts over on the whole of it.
  const extentKey = `${extent.box.x},${extent.box.y},${extent.box.width},${extent.box.height}`;
  const [shownExtentKey, setShownExtentKey] = React.useState(extentKey);
  if (shownExtentKey !== extentKey) {
    setShownExtentKey(extentKey);
    setViewBox(extent.box);
  }

  // The wheel listener has to be able to stop the page scrolling, which React's own cannot.
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const fx = (event.clientX - rect.left) / rect.width;
      const fy = (event.clientY - rect.top) / rect.height;
      setViewBox((current) => {
        const zoom = extent.box.width / current.width;
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2)));
        const width = extent.box.width / nextZoom;
        const height = extent.box.height / nextZoom;
        return {
          x: current.x + (current.width - width) * fx,
          y: current.y + (current.height - height) * fy,
          width,
          height,
        };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [extent.box.width, extent.box.height]);

  const drag = React.useRef<{ x: number; y: number } | undefined>(undefined);
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const from = drag.current;
    if (!from || event.buttons === 0) {
      drag.current = undefined;
      return;
    }
    // The picture is fitted inside the element, so one scale serves both directions.
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setViewBox((current) => {
      const scale = Math.max(current.width / rect.width, current.height / rect.height);
      return { ...current, x: current.x - dx * scale, y: current.y - dy * scale };
    });
  };
  const onPointerUp = () => {
    drag.current = undefined;
  };

  const homeCentre = hexCentre(home, HEX_SIZE);

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#f6f4f5', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        style={{ display: 'block', width: '100%', height: '70vh', cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => setViewBox(extent.box)}
      >
        {extent.cities.map((city) => {
          const { x, y } = hexCentre(city, HEX_SIZE);
          return (
            <polygon key={`${city.r},${city.q}`} points={CITY_HEX} transform={`translate(${x} ${y})`} fill='#ced4d8' />
          );
        })}
        {provinces.map((province) => {
          const { x, y } = hexCentre(province, HEX_SIZE);
          const incomplete = province.status === 'incomplete';
          return (
            <g key={province.key} transform={`translate(${x} ${y})`} opacity={matches(province) ? 1 : 0.12}>
              <polygon points={HEX} {...hexStyle(province.status, GOOD_COLOURS[province.good])} />
              {(incomplete || province.status === 'scouting') && (
                <text
                  textAnchor='middle'
                  dominantBaseline='central'
                  fontSize={HEX_SIZE * 0.6}
                  fontWeight={700}
                  fill='#26313b'
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {incomplete ? `${province.done}/${ENCOUNTERS_PER_PROVINCE}` : '…'}
                </text>
              )}
              <title>{describe(province, goodsNames, now)}</title>
            </g>
          );
        })}
        <g transform={`translate(${homeCentre.x} ${homeCentre.y})`}>
          <polygon points={HEX} fill='#26313b' stroke='#fff' strokeWidth={1} />
          <text
            textAnchor='middle'
            dominantBaseline='central'
            fontSize={HEX_SIZE}
            fill='#fff'
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            ⌂
          </text>
          <title>Your city</title>
        </g>
      </svg>
    </Box>
  );
};
