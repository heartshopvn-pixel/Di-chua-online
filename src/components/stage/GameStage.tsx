import React, { useEffect, useRef, useState } from 'react';
import {
  BurnerLotusBurstFX,
  CameraFocusState,
  CustomAssetsConfig,
  DonorEntry,
  FloatingToastItem,
  FlyingLotusFX,
  GameConfig,
  HudBoxPosition,
  KneelSlot,
  OfferingGiftType,
  PilgrimData,
  Point2D,
  RectBounds,
  TempleMonkData,
} from '../../types/game';
import { TempleArt } from './TempleArt';
import { PilgrimSprite } from './PilgrimSprite';
import { MonkSprite } from './MonkSprite';
import { HudBoxKey, ResizeCorner, StageHud } from './StageHud';
import { OfferingModelArt } from './OfferingModelArt';

export type ZoneKey = 'monk' | 'leftPray' | 'rightPray';
export type RectEdge = 'top' | 'bottom' | 'left' | 'right';

export type SeatNodeKey = `vip:${number}` | `normal:${number}`;

interface GameStageProps {
  config: GameConfig;
  vipSlots: KneelSlot[];
  normalSlots: KneelSlot[];
  pilgrims: PilgrimData[];
  monks: TempleMonkData[];
  donors: DonorEntry[];
  floatingToasts: FloatingToastItem[];
  customAssets: CustomAssetsConfig;
  grandEventProgress: number;
  goldenLotusRainUntil: number;
  latestAltarOffering: OfferingGiftType;
  burnerLotusBursts: BurnerLotusBurstFX[];
  flyingLotuses: FlyingLotusFX[];
  eventBarFlashKey?: number;
  cameraFocus: CameraFocusState;
  controlledTarget?: string | null;
  onMoveWaypoint: (
    kind: 'burner' | 'tray' | 'vip' | 'normal',
    index: number,
    pos: Point2D
  ) => void;
  onMoveWaypointsBatch?: (
    updates: Array<{ kind: 'vip' | 'normal'; index: number; pos: Point2D }>
  ) => void;
  onUpdateHudBox: (boxKey: HudBoxKey, nextBox: HudBoxPosition) => void;
  onUpdateZoneBounds: (zoneKey: ZoneKey, nextBounds: RectBounds) => void;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  speed: number;
}

interface FloatingLotus {
  x: number;
  y: number;
  r: number;
  vy: number;
  alpha: number;
}

interface GoldenLotusRainDrop {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  rot: number;
  vRot: number;
  swayPhase: number;
}

function drawGoldenLotusBlossom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rot: number,
  alpha: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;

  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 1.45);
  glow.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
  glow.addColorStop(0.6, 'rgba(250, 204, 21, 0.25)');
  glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.45, 0, Math.PI * 2);
  ctx.fill();

  const petalAngles = [-0.85, -0.42, 0, 0.42, 0.85];
  petalAngles.forEach((ang, idx) => {
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.25);
    ctx.quadraticCurveTo(-size * 0.42, -size * 0.35, 0, -size);
    ctx.quadraticCurveTo(size * 0.42, -size * 0.35, 0, size * 0.25);
    ctx.fillStyle = idx === 2 ? '#fef08a' : idx % 2 === 1 ? '#facc15' : '#eab308';
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, size * 0.1, size * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = '#fde047';
  ctx.fill();

  ctx.restore();
}

interface EditableZoneRectProps {
  zoneKey: ZoneKey;
  bounds: RectBounds;
  label: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  handleColorClass: string;
  onStartDragEdge: (
    zoneKey: ZoneKey,
    edge: RectEdge,
    e: React.MouseEvent | React.TouchEvent
  ) => void;
}

const EditableZoneRect: React.FC<EditableZoneRectProps> = ({
  zoneKey,
  bounds,
  label,
  borderClass,
  bgClass,
  textClass,
  handleColorClass,
  onStartDragEdge,
}) => {
  const width = Math.max(24, bounds.maxX - bounds.minX);
  const height = Math.max(24, bounds.maxY - bounds.minY);

  const bindEdge =
    (edge: RectEdge) => (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      onStartDragEdge(zoneKey, edge, e);
    };

  return (
    <div
      className={`absolute border-2 border-dashed ${borderClass} ${bgClass} flex items-center justify-center text-[9px] font-bold ${textClass} select-none pointer-events-none`}
      style={{
        left: `${bounds.minX}px`,
        top: `${bounds.minY}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <span className="px-1.5 py-0.5 rounded bg-stone-950/75 text-center leading-tight">
        {label}
      </span>

      {/* Cạnh Trên (Top Edge) */}
      <div
        onMouseDown={bindEdge('top')}
        onTouchStart={bindEdge('top')}
        title="Kéo cạnh trên để chỉnh vùng giới hạn"
        className="pointer-events-auto absolute -top-2 inset-x-0 h-4 cursor-ns-resize flex items-center justify-center group"
      >
        <span
          className={`w-8 h-1.5 rounded-full ${handleColorClass} border border-stone-950 shadow group-hover:scale-125 transition-transform`}
        />
      </div>

      {/* Cạnh Dưới (Bottom Edge) */}
      <div
        onMouseDown={bindEdge('bottom')}
        onTouchStart={bindEdge('bottom')}
        title="Kéo cạnh dưới để chỉnh vùng giới hạn"
        className="pointer-events-auto absolute -bottom-2 inset-x-0 h-4 cursor-ns-resize flex items-center justify-center group"
      >
        <span
          className={`w-8 h-1.5 rounded-full ${handleColorClass} border border-stone-950 shadow group-hover:scale-125 transition-transform`}
        />
      </div>

      {/* Cạnh Trái (Left Edge) */}
      <div
        onMouseDown={bindEdge('left')}
        onTouchStart={bindEdge('left')}
        title="Kéo cạnh trái để chỉnh vùng giới hạn"
        className="pointer-events-auto absolute -left-2 inset-y-0 w-4 cursor-ew-resize flex items-center justify-center group"
      >
        <span
          className={`w-1.5 h-8 rounded-full ${handleColorClass} border border-stone-950 shadow group-hover:scale-125 transition-transform`}
        />
      </div>

      {/* Cạnh Phải (Right Edge) */}
      <div
        onMouseDown={bindEdge('right')}
        onTouchStart={bindEdge('right')}
        title="Kéo cạnh phải để chỉnh vùng giới hạn"
        className="pointer-events-auto absolute -right-2 inset-y-0 w-4 cursor-ew-resize flex items-center justify-center group"
      >
        <span
          className={`w-1.5 h-8 rounded-full ${handleColorClass} border border-stone-950 shadow group-hover:scale-125 transition-transform`}
        />
      </div>
    </div>
  );
};

export const GameStage: React.FC<GameStageProps> = ({
  config,
  vipSlots,
  normalSlots,
  pilgrims,
  monks,
  donors,
  floatingToasts,
  customAssets,
  grandEventProgress,
  goldenLotusRainUntil,
  latestAltarOffering,
  burnerLotusBursts,
  flyingLotuses,
  eventBarFlashKey,
  cameraFocus,
  controlledTarget,
  onMoveWaypoint,
  onMoveWaypointsBatch,
  onUpdateHudBox,
  onUpdateZoneBounds,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);

  // Dragging state for Waypoints (vòng tròn vị trí)
  const [draggingNode, setDraggingNode] = useState<{
    kind: 'burner' | 'tray' | 'vip' | 'normal';
    index: number;
  } | null>(null);

  // Multi-select seat circles state (Kéo chọn nhiều vòng chỗ ngồi & di chuyển cả cụm)
  const [selectedSeats, setSelectedSeats] = useState<Set<SeatNodeKey>>(new Set());
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);
  const [draggingSeatGroup, setDraggingSeatGroup] = useState<{
    startX: number;
    startY: number;
    initialPositions: Array<{
      kind: 'vip' | 'normal';
      index: number;
      x: number;
      y: number;
    }>;
  } | null>(null);

  // Dragging state for HUD Box position
  const [draggingHudBox, setDraggingHudBox] = useState<{
    boxKey: HudBoxKey;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Resizing state for HUD Box corners
  const [resizingHudBox, setResizingHudBox] = useState<{
    boxKey: HudBoxKey;
    corner: ResizeCorner;
    startX: number;
    startY: number;
    initialBox: HudBoxPosition;
  } | null>(null);

  // Dragging state for Movement Zone rectangle edges
  const [draggingZoneEdge, setDraggingZoneEdge] = useState<{
    zoneKey: ZoneKey;
    edge: RectEdge;
  } | null>(null);

  // Auto-fit 540x960 stage into available wrapper space
  useEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current) return;
      const availW = wrapperRef.current.clientWidth - 16;
      const availH = wrapperRef.current.clientHeight - 16;
      const nextScale = Math.min(availW / 540, availH / 960, 1.15);
      setScale(Math.max(0.28, nextScale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  // Keep latest props in ref for 60fps Canvas FX loop
  const fxStateRef = useRef({
    incenseBurner: config.incenseBurner,
    showWaypoints: config.showWaypoints,
    vipSlots,
    normalSlots,
    goldenLotusRainUntil,
  });
  useEffect(() => {
    fxStateRef.current = {
      incenseBurner: config.incenseBurner,
      showWaypoints: config.showWaypoints,
      vipSlots,
      normalSlots,
      goldenLotusRainUntil,
    };
  }, [config.incenseBurner, config.showWaypoints, vipSlots, normalSlots, goldenLotusRainUntil]);

  // Canvas 2D Smoke, Optional Position Circles & 3-Second Full-Screen Golden Lotus Rain Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const rainCanvas = rainCanvasRef.current;
    if (!canvas || !rainCanvas) return;
    const ctx = canvas.getContext('2d');
    const rainCtx = rainCanvas.getContext('2d');
    if (!ctx || !rainCtx) return;

    const createSmoke = (randomProgress = false): SmokeParticle => {
      const progress = randomProgress ? Math.random() : 0;
      const burner = fxStateRef.current.incenseBurner;
      return {
        x: burner.x + (Math.random() * 18 - 9),
        y: burner.y - progress * 220,
        vx: (Math.random() - 0.5) * 14,
        vy: -28 - Math.random() * 22,
        size: 8 + progress * 34,
        alpha: (1 - progress) * 0.36,
        life: progress,
        speed: 0.25 + (Math.random() * 18) / 100,
      };
    };

    const smokeParticles: SmokeParticle[] = Array.from({ length: 40 }, () =>
      createSmoke(true)
    );
    const floatingLotuses: FloatingLotus[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * 540,
      y: Math.random() * 420,
      r: 1.5 + Math.random() * 2.5,
      vy: -12 - Math.random() * 15,
      alpha: 0.3 + Math.random() * 0.6,
    }));

    const rainDrops: GoldenLotusRainDrop[] = Array.from({ length: 48 }, (_, i) => ({
      x: (i * 11.5 + Math.random() * 25) % 540,
      y: -Math.random() * 960,
      vy: 230 + Math.random() * 180,
      vx: (Math.random() - 0.5) * 35,
      size: 8 + Math.random() * 9,
      rot: (Math.random() - 0.5) * 0.5,
      vRot: (Math.random() - 0.5) * 1.4,
      swayPhase: Math.random() * Math.PI * 2,
    }));

    let wasRaining = false;
    let animId = 0;
    let lastTime = performance.now();

    const renderFx = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const timeSec = now / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Chỉ vẽ các vòng tròn đệm vị trí dưới sàn khi bật "Hiện vòng tròn vị trí" (showWaypoints)
      if (fxStateRef.current.showWaypoints) {
        fxStateRef.current.vipSlots.forEach((s) => {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(s.x, s.y + 3, 15, 5.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(30, 58, 138, 0.82)';
          ctx.fill();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = '#fbbf24';
          ctx.stroke();
          ctx.restore();
        });

        fxStateRef.current.normalSlots.forEach((s) => {
          const t = Math.max(0, Math.min(1, (s.y - 550) / (950 - 550)));
          const depthScale = 0.6 + t * 0.4;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(s.x, s.y + 3, 17 * depthScale, 6 * depthScale, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(153, 27, 27, 0.72)';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.stroke();
          ctx.restore();
        });
      }

      // Draw Incense Smoke
      smokeParticles.forEach((p, idx) => {
        p.life += p.speed * dt;
        if (p.life >= 1) {
          smokeParticles[idx] = createSmoke(false);
          return;
        }
        p.x += Math.sin(timeSec * 2 + idx) * 12 * dt + p.vx * dt;
        p.y += p.vy * dt;
        p.size = 8 + p.life * 38;
        const alpha = Math.sin(p.life * Math.PI) * 0.32;

        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(255, 250, 240, ${alpha})`);
        grad.addColorStop(1, 'rgba(255, 250, 240, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Floating Golden Light Spores
      floatingLotuses.forEach((sp) => {
        sp.y += sp.vy * dt;
        if (sp.y < 30) {
          sp.y = 420;
          sp.x = 60 + Math.random() * 420;
        }
        ctx.fillStyle = `rgba(253, 224, 71, ${sp.alpha})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Layer Mưa Hoa Sen Vàng toàn màn hình trong 3 giây khi đầy thanh Sự Kiện Đại Lễ
      const rainRemainingMs = fxStateRef.current.goldenLotusRainUntil - Date.now();
      if (rainRemainingMs > 0) {
        if (!wasRaining) {
          wasRaining = true;
          rainDrops.forEach((d, idx) => {
            d.x = ((idx * 37) % 510) + 15;
            d.y = -20 - (idx / rainDrops.length) * 680;
          });
        }
        rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);

        const fadeAlpha = Math.min(1, rainRemainingMs / 450);
        rainCtx.fillStyle = `rgba(254, 240, 138, ${0.08 * fadeAlpha})`;
        rainCtx.fillRect(0, 0, 540, 960);

        rainDrops.forEach((d) => {
          d.y += d.vy * dt;
          d.x += (d.vx + Math.sin(timeSec * 3 + d.swayPhase) * 28) * dt;
          d.rot += d.vRot * dt;
          if (d.y > 985) {
            d.y = -25;
            d.x = 15 + Math.random() * 510;
          }
          drawGoldenLotusBlossom(rainCtx, d.x, d.y, d.size, d.rot, 0.92 * fadeAlpha);
        });
      } else if (wasRaining) {
        wasRaining = false;
        rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
      }

      animId = requestAnimationFrame(renderFx);
    };

    animId = requestAnimationFrame(renderFx);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Unified pointer move handler for Waypoint nodes, Multi-seat marquee/group drag, HUD dragging, HUD corner resizing, and Zone edge resizing
  useEffect(() => {
    if (
      !draggingNode &&
      !draggingSeatGroup &&
      !marqueeBox &&
      !draggingHudBox &&
      !resizingHudBox &&
      !draggingZoneEdge
    ) {
      return;
    }

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!viewportRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = viewportRef.current.getBoundingClientRect();
      const scaleX = 540 / rect.width;
      const scaleY = 960 / rect.height;
      const stageX = (clientX - rect.left) * scaleX;
      const stageY = (clientY - rect.top) * scaleY;

      if (draggingSeatGroup) {
        const dx = stageX - draggingSeatGroup.startX;
        const dy = stageY - draggingSeatGroup.startY;
        const updates = draggingSeatGroup.initialPositions.map((item) => ({
          kind: item.kind,
          index: item.index,
          pos: {
            x: Math.round(Math.max(15, Math.min(525, item.x + dx))),
            y: Math.round(Math.max(120, Math.min(945, item.y + dy))),
          },
        }));
        if (onMoveWaypointsBatch) {
          onMoveWaypointsBatch(updates);
        } else {
          updates.forEach((u) => onMoveWaypoint(u.kind, u.index, u.pos));
        }
      } else if (marqueeBox) {
        const nextBox = { ...marqueeBox, curX: stageX, curY: stageY };
        setMarqueeBox(nextBox);
        const minX = Math.min(nextBox.startX, nextBox.curX);
        const maxX = Math.max(nextBox.startX, nextBox.curX);
        const minY = Math.min(nextBox.startY, nextBox.curY);
        const maxY = Math.max(nextBox.startY, nextBox.curY);

        const hits = new Set<SeatNodeKey>();
        vipSlots.forEach((s, i) => {
          if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) {
            hits.add(`vip:${i}`);
          }
        });
        normalSlots.forEach((s, i) => {
          if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) {
            hits.add(`normal:${i}`);
          }
        });
        setSelectedSeats(hits);
      } else if (draggingNode) {
        const nx = Math.round(Math.max(15, Math.min(525, stageX)));
        const ny = Math.round(Math.max(120, Math.min(945, stageY)));
        onMoveWaypoint(draggingNode.kind, draggingNode.index, { x: nx, y: ny });
      } else if (draggingHudBox) {
        const box =
          config.hudLayout[draggingHudBox.boxKey] || {
            x: 12,
            y: 154,
            width: 136,
            height: 34,
          };
        const nx = Math.round(
          Math.max(0, Math.min(540 - box.width, stageX - draggingHudBox.offsetX))
        );
        const ny = Math.round(
          Math.max(0, Math.min(960 - box.height, stageY - draggingHudBox.offsetY))
        );
        onUpdateHudBox(draggingHudBox.boxKey, { ...box, x: nx, y: ny });
      } else if (resizingHudBox) {
        const { boxKey, corner, startX, startY, initialBox } = resizingHudBox;
        const dx = stageX - startX;
        const dy = stageY - startY;
        const minW = 68;
        const minH = 26;

        let nextX = initialBox.x;
        let nextY = initialBox.y;
        let nextW = initialBox.width;
        let nextH = initialBox.height;

        if (corner === 'se') {
          nextW = Math.max(minW, Math.min(540 - initialBox.x, Math.round(initialBox.width + dx)));
          nextH = Math.max(minH, Math.min(960 - initialBox.y, Math.round(initialBox.height + dy)));
        } else if (corner === 'sw') {
          const rightEdge = initialBox.x + initialBox.width;
          nextX = Math.max(0, Math.min(rightEdge - minW, Math.round(initialBox.x + dx)));
          nextW = rightEdge - nextX;
          nextH = Math.max(minH, Math.min(960 - initialBox.y, Math.round(initialBox.height + dy)));
        } else if (corner === 'ne') {
          const bottomEdge = initialBox.y + initialBox.height;
          nextW = Math.max(minW, Math.min(540 - initialBox.x, Math.round(initialBox.width + dx)));
          nextY = Math.max(0, Math.min(bottomEdge - minH, Math.round(initialBox.y + dy)));
          nextH = bottomEdge - nextY;
        } else if (corner === 'nw') {
          const rightEdge = initialBox.x + initialBox.width;
          const bottomEdge = initialBox.y + initialBox.height;
          nextX = Math.max(0, Math.min(rightEdge - minW, Math.round(initialBox.x + dx)));
          nextW = rightEdge - nextX;
          nextY = Math.max(0, Math.min(bottomEdge - minH, Math.round(initialBox.y + dy)));
          nextH = bottomEdge - nextY;
        }

        onUpdateHudBox(boxKey, {
          x: nextX,
          y: nextY,
          width: nextW,
          height: nextH,
        });
      } else if (draggingZoneEdge) {
        const { zoneKey, edge } = draggingZoneEdge;
        const currentBounds: RectBounds =
          zoneKey === 'monk'
            ? config.monkZone
            : zoneKey === 'leftPray'
            ? config.redPrayZones.left
            : config.redPrayZones.right;

        const minSpan = 36;
        const next: RectBounds = { ...currentBounds };

        if (edge === 'top') {
          next.minY = Math.round(
            Math.max(100, Math.min(currentBounds.maxY - minSpan, stageY))
          );
        } else if (edge === 'bottom') {
          next.maxY = Math.round(
            Math.min(950, Math.max(currentBounds.minY + minSpan, stageY))
          );
        } else if (edge === 'left') {
          next.minX = Math.round(
            Math.max(4, Math.min(currentBounds.maxX - minSpan, stageX))
          );
        } else if (edge === 'right') {
          next.maxX = Math.round(
            Math.min(536, Math.max(currentBounds.minX + minSpan, stageX))
          );
        }

        onUpdateZoneBounds(zoneKey, next);
      }
    };

    const handlePointerUp = () => {
      setDraggingNode(null);
      setDraggingSeatGroup(null);
      setMarqueeBox(null);
      setDraggingHudBox(null);
      setResizingHudBox(null);
      setDraggingZoneEdge(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [
    draggingNode,
    draggingSeatGroup,
    marqueeBox,
    draggingHudBox,
    resizingHudBox,
    draggingZoneEdge,
    vipSlots,
    normalSlots,
    config.hudLayout,
    config.monkZone,
    config.redPrayZones,
    onMoveWaypoint,
    onMoveWaypointsBatch,
    onUpdateHudBox,
    onUpdateZoneBounds,
  ]);

  const getStageCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!viewportRef.current) return { stageX: 0, stageY: 0 };
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = viewportRef.current.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const scaleY = 960 / rect.height;
    return {
      stageX: (clientX - rect.left) * scaleX,
      stageY: (clientY - rect.top) * scaleY,
    };
  };

  const handleStartSeatDrag = (
    kind: 'vip' | 'normal',
    index: number,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    const key: SeatNodeKey = `${kind}:${index}`;
    const isShift = 'shiftKey' in e && e.shiftKey;

    if (isShift) {
      setSelectedSeats((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      return;
    }

    const { stageX, stageY } = getStageCoords(e);
    let activeSelection = selectedSeats;
    if (!selectedSeats.has(key)) {
      activeSelection = new Set([key]);
      setSelectedSeats(activeSelection);
    }

    if (activeSelection.size > 1) {
      const initialPositions: Array<{
        kind: 'vip' | 'normal';
        index: number;
        x: number;
        y: number;
      }> = [];
      activeSelection.forEach((seatKey) => {
        const [sKind, sIdxStr] = seatKey.split(':');
        const sIdx = Number(sIdxStr);
        if (sKind === 'vip' && vipSlots[sIdx]) {
          initialPositions.push({
            kind: 'vip',
            index: sIdx,
            x: vipSlots[sIdx].x,
            y: vipSlots[sIdx].y,
          });
        } else if (sKind === 'normal' && normalSlots[sIdx]) {
          initialPositions.push({
            kind: 'normal',
            index: sIdx,
            x: normalSlots[sIdx].x,
            y: normalSlots[sIdx].y,
          });
        }
      });
      setDraggingSeatGroup({
        startX: stageX,
        startY: stageY,
        initialPositions,
      });
    } else {
      setDraggingNode({ kind, index });
    }
  };

  const handleStartMarquee = (e: React.MouseEvent) => {
    if (!config.showWaypoints) return;
    if (e.button !== 0) return;
    const { stageX, stageY } = getStageCoords(e);
    setMarqueeBox({
      startX: stageX,
      startY: stageY,
      curX: stageX,
      curY: stageY,
    });
    if (!e.shiftKey) {
      setSelectedSeats(new Set());
    }
  };

  const handleStartDragHudBox = (
    boxKey: HudBoxKey,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    if (!viewportRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = viewportRef.current.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const scaleY = 960 / rect.height;
    const stageX = (clientX - rect.left) * scaleX;
    const stageY = (clientY - rect.top) * scaleY;
    const box = config.hudLayout[boxKey] || {
      x: 12,
      y: 154,
      width: 136,
      height: 34,
    };
    setDraggingHudBox({
      boxKey,
      offsetX: stageX - box.x,
      offsetY: stageY - box.y,
    });
  };

  const handleStartResizeHudBox = (
    boxKey: HudBoxKey,
    corner: ResizeCorner,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    if (!viewportRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = viewportRef.current.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const scaleY = 960 / rect.height;
    const stageX = (clientX - rect.left) * scaleX;
    const stageY = (clientY - rect.top) * scaleY;
    const box = config.hudLayout[boxKey] || {
      x: 12,
      y: 154,
      width: 136,
      height: 34,
    };
    setResizingHudBox({
      boxKey,
      corner,
      startX: stageX,
      startY: stageY,
      initialBox: { ...box },
    });
  };

  const handleStartDragZoneEdge = (
    zoneKey: ZoneKey,
    edge: RectEdge,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    setDraggingZoneEdge({ zoneKey, edge });
  };

  const isGrandEventActive = goldenLotusRainUntil > Date.now();
  const totalSeatCapacity =
    config.maxStageCapacity || vipSlots.length + normalSlots.length;
  const activePilgrimCount = pilgrims.filter(
    (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
  ).length;

  // Khóa camera zoom gần sát bên nhân vật trong 4s và đặt nhân vật ngay trọng tâm khung hình (270, 480)
  const isCameraZoomActive =
    Boolean(cameraFocus.pilgrimId) && Date.now() < cameraFocus.until;
  const focusedPilgrim = isCameraZoomActive
    ? pilgrims.find((p) => p.id === cameraFocus.pilgrimId)
    : undefined;

  const zoomScale = 2.45;
  const focusCenterX = focusedPilgrim ? focusedPilgrim.x : 270;
  const focusCenterY = focusedPilgrim ? focusedPilgrim.y - 44 : 480;
  const camTranslateX = focusedPilgrim ? 270 - focusCenterX : 0;
  const camTranslateY = focusedPilgrim ? 480 - focusCenterY : 0;

  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-w-[280px] h-full flex items-center justify-center p-2 relative overflow-hidden bg-stone-950"
    >
      <div
        ref={viewportRef}
        className="temple-stage-bg w-[540px] h-[960px] aspect-[9/16] relative overflow-hidden shrink-0 origin-center"
        style={{ transform: `scale(${scale})` }}
      >
        {/* World Camera Container (Zoom gần sát bên nhân vật 2.45x và đặt nhân vật đúng trọng tâm khung hình trong 4s) */}
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            transformOrigin: '270px 480px',
            transform: focusedPilgrim
              ? `scale(${zoomScale}) translate(${camTranslateX.toFixed(1)}px, ${camTranslateY.toFixed(1)}px)`
              : 'scale(1) translate(0px, 0px)',
          }}
        >
          {/* Layer 1: Temple Artwork */}
          <TempleArt
            customBgUrl={customAssets.customBgUrl}
            incenseBurner={config.incenseBurner}
          />

          {/* Layer 2: Canvas Smoke & Optional Position Cushions */}
          <canvas
            ref={canvasRef}
            width={540}
            height={960}
            className="absolute inset-0 pointer-events-none z-10"
          />

          {/* Layer 2.8: Hiệu ứng bung tỏa nhiều hoa sen hồng nhỏ tại lư hương khi lễ vật tan biến */}
          {burnerLotusBursts.map((burst) => (
            <div
              key={burst.id}
              className="absolute pointer-events-none z-30"
              style={{
                left: `${burst.x}px`,
                top: `${burst.y}px`,
              }}
            >
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
                (deg, idx) => {
                  const rad = (deg * Math.PI) / 180;
                  const dist = idx % 2 === 0 ? 48 : 34;
                  const tx = Math.round(Math.cos(rad) * dist);
                  const ty = Math.round(Math.sin(rad) * dist - 14);
                  return (
                    <span
                      key={deg}
                      className="burner-lotus-particle absolute left-0 top-0"
                      style={
                        {
                          '--tx': `${tx}px`,
                          '--ty': `${ty}px`,
                          '--rot': `${deg - 90}deg`,
                        } as React.CSSProperties
                      }
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 drop-shadow-[0_0_6px_#f472b6]">
                        <path
                          d="M12 3 C9 8 7 12 12 18 C17 12 15 8 12 3 Z"
                          fill="#f9a8d4"
                        />
                        <path
                          d="M12 18 C6 16 3 11 6 7 C9 10 10 14 12 18 Z"
                          fill="#f472b6"
                        />
                        <path
                          d="M12 18 C18 16 21 11 18 7 C15 10 14 14 12 18 Z"
                          fill="#ec4899"
                        />
                        <circle cx="12" cy="14" r="2" fill="#fef08a" />
                      </svg>
                    </span>
                  );
                }
              )}
            </div>
          ))}

          {/* Layer 3: Monks (Trụ trì, Chú tiểu lớn & Chú tiểu nhỏ) & Pilgrims (Y-sorted via z-index) */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {monks.map((m) => (
              <MonkSprite
                key={m.id}
                monk={m}
                characterScale={config.characterScale ?? 1}
                nameTagFontFamily={config.nameTagFontFamily}
                nameTagScale={config.nameTagScale ?? 1}
                chatBubbleFontFamily={config.chatBubbleFontFamily}
                chatBubbleScale={config.chatBubbleScale ?? 1}
                isControlled={controlledTarget === `monk:${m.id}`}
                abbotSpritesheetUrl={customAssets.abbotSpritesheetUrl}
                seniorNoviceSpritesheetUrl={customAssets.seniorNoviceSpritesheetUrl}
                juniorNoviceSpritesheetUrl={customAssets.juniorNoviceSpritesheetUrl}
              />
            ))}

            {pilgrims.map((p) => (
              <PilgrimSprite
                key={p.id}
                pilgrim={p}
                customAssets={customAssets}
                incenseBurner={config.incenseBurner}
                characterScale={config.characterScale ?? 1}
                nameTagFontFamily={config.nameTagFontFamily}
                nameTagScale={config.nameTagScale ?? 1}
                chatBubbleFontFamily={config.chatBubbleFontFamily}
                chatBubbleScale={config.chatBubbleScale ?? 1}
                alwaysShowBubble={(config.chatBubbleDurationSec ?? 12) >= 60}
                isControlled={controlledTarget === `pilgrim:${p.id}`}
              />
            ))}
          </div>
        </div>

        {/* Hiệu ứng khung viền Hào Quang Hoàng Kim khi đang khóa Camera Zoom 3s cho quà Đặc Biệt (>10 coin) */}
        {focusedPilgrim && (
          <div className="absolute inset-0 pointer-events-none z-28 border-4 border-yellow-300/80 shadow-[inset_0_0_45px_rgba(250,204,21,0.55)] animate-pulse">
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-950/90 border border-yellow-300 text-[11px] font-extrabold text-yellow-200 shadow-lg whitespace-nowrap">
              ✨ Đại Lễ Hào Quang: {focusedPilgrim.username} ✨
            </div>
          </div>
        )}

        {/* Layer 3.5: Mưa Hoa Sen Vàng rơi toàn màn hình trong 3 giây (Canvas Overlay siêu nhẹ) */}
        <canvas
          ref={rainCanvasRef}
          width={540}
          height={960}
          className="absolute inset-0 pointer-events-none z-25"
        />

        {/* Layer 3.8: Hoa sen kích thước vừa bay (có đuôi ánh hồng đẹp mắt) về nhập vào bảng Sự kiện Đại lễ sau khi bấm Like */}
        {flyingLotuses.map((fly) => {
          const dx = fly.targetX - fly.startX;
          const dy = fly.targetY - fly.startY;
          return (
            <div
              key={fly.id}
              className="flying-lotus-projectile absolute pointer-events-none z-35"
              style={
                {
                  left: `${fly.startX}px`,
                  top: `${fly.startY}px`,
                  '--dx': `${dx}px`,
                  '--dy': `${dy}px`,
                } as React.CSSProperties
              }
            >
              {/* Đuôi ánh hồng đẹp mắt kéo dài phía sau bông hoa sen vừa */}
              <div className="relative flex items-center justify-center">
                <span className="absolute translate-y-6 w-2 h-8 rounded-full bg-gradient-to-t from-transparent via-pink-400/75 to-pink-200 blur-[2px]" />
                <span className="absolute translate-y-3 w-3.5 h-5 rounded-full bg-pink-400/65 blur-[3px]" />
                <span className="absolute -inset-1.5 rounded-full bg-pink-400/50 blur-[4px]" />
                <svg
                  viewBox="0 0 36 36"
                  className="relative w-7 h-7 drop-shadow-[0_0_10px_#f472b6]"
                >
                  <path
                    d="M18 4 C13 11 10 18 18 26 C26 18 23 11 18 4 Z"
                    fill="#fbcfe8"
                  />
                  <path
                    d="M18 26 C9 23 5 15 9 9 C13 13 15 19 18 26 Z"
                    fill="#f472b6"
                  />
                  <path
                    d="M18 26 C27 23 31 15 27 9 C23 13 21 19 18 26 Z"
                    fill="#f472b6"
                  />
                  <path
                    d="M18 27 C7 27 2 21 4 15 C9 18 13 23 18 27 Z"
                    fill="#ec4899"
                  />
                  <path
                    d="M18 27 C29 27 34 21 32 15 C27 18 23 23 18 27 Z"
                    fill="#ec4899"
                  />
                  <circle cx="18" cy="21" r="2.8" fill="#fef08a" />
                </svg>
              </div>
            </div>
          );
        })}

        {/* Layer 4A: Vùng giới hạn di chuyển (Cho phép bấm vào 4 cạnh hình chữ nhật để kéo chỉnh kích thước vùng) */}
        {config.showZoneBounds && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            <EditableZoneRect
              zoneKey="monk"
              bounds={config.monkZone}
              label="Khu vực Trụ trì & Chú tiểu (Kéo 4 cạnh để chỉnh)"
              borderClass="border-fuchsia-400"
              bgClass="bg-fuchsia-500/15"
              textClass="text-fuchsia-200"
              handleColorClass="bg-fuchsia-400"
              onStartDragEdge={handleStartDragZoneEdge}
            />

            <EditableZoneRect
              zoneKey="leftPray"
              bounds={config.redPrayZones.left}
              label="Vùng ngồi bái lạy Trái (Kéo 4 cạnh)"
              borderClass="border-red-400"
              bgClass="bg-red-600/20"
              textClass="text-red-200"
              handleColorClass="bg-red-400"
              onStartDragEdge={handleStartDragZoneEdge}
            />

            <EditableZoneRect
              zoneKey="rightPray"
              bounds={config.redPrayZones.right}
              label="Vùng ngồi bái lạy Phải (Kéo 4 cạnh)"
              borderClass="border-red-400"
              bgClass="bg-red-600/20"
              textClass="text-red-200"
              handleColorClass="bg-red-400"
              onStartDragEdge={handleStartDragZoneEdge}
            />
          </div>
        )}

        {/* Layer 4B: Các vòng tròn vị trí (Hỗ trợ kéo quét chọn nhiều chỗ ngồi & kéo di chuyển cả cụm) */}
        {config.showWaypoints && (
          <div
            onMouseDown={handleStartMarquee}
            className="absolute inset-0 z-45 pointer-events-auto cursor-crosshair"
          >
            {/* Thanh công cụ nhanh khi đang bật Vòng vị trí */}
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-950/90 border border-emerald-400/60 shadow-lg text-[10px] text-stone-200 whitespace-nowrap"
            >
              <span className="text-emerald-300 font-bold">
                Đã chọn: {selectedSeats.size} ghế
              </span>
              <button
                type="button"
                onClick={() => {
                  const all = new Set<SeatNodeKey>();
                  vipSlots.forEach((_, i) => all.add(`vip:${i}`));
                  normalSlots.forEach((_, i) => all.add(`normal:${i}`));
                  setSelectedSeats(all);
                }}
                className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 font-bold cursor-pointer"
              >
                Chọn hết
              </button>
              <button
                type="button"
                onClick={() => {
                  const vips = new Set<SeatNodeKey>();
                  vipSlots.forEach((_, i) => vips.add(`vip:${i}`));
                  setSelectedSeats(vips);
                }}
                className="px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/35 border border-blue-400/40 text-blue-200 font-bold cursor-pointer"
              >
                Chỉ VIP
              </button>
              {selectedSeats.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSeats(new Set())}
                  className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            {/* Khung Marquee quét chọn nhiều ghế */}
            {marqueeBox && (
              <div
                className="absolute border-2 border-cyan-400 bg-cyan-400/15 pointer-events-none z-50"
                style={{
                  left: `${Math.min(marqueeBox.startX, marqueeBox.curX)}px`,
                  top: `${Math.min(marqueeBox.startY, marqueeBox.curY)}px`,
                  width: `${Math.abs(marqueeBox.curX - marqueeBox.startX)}px`,
                  height: `${Math.abs(marqueeBox.curY - marqueeBox.startY)}px`,
                }}
              />
            )}

            {/* Incense Burner Node */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingNode({ kind: 'burner', index: 0 });
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setDraggingNode({ kind: 'burner', index: 0 });
              }}
              title="Kéo để chỉnh vị trí Khói Lư Hương"
              className="pointer-events-auto absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-rose-500 text-white border-2 border-white text-[9px] font-black flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
              style={{
                left: `${config.incenseBurner.x}px`,
                top: `${config.incenseBurner.y}px`,
              }}
            >
              Lư
            </button>

            {/* VIP Slots (Hàng xanh dương phía trước) */}
            {vipSlots.map((slot, i) => {
              const isSelected = selectedSeats.has(`vip:${i}`);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onMouseDown={(e) => handleStartSeatDrag('vip', i, e)}
                  onTouchStart={(e) => handleStartSeatDrag('vip', i, e)}
                  title={`Vị trí VIP #${i + 1} (Kéo chọn nhiều ghế hoặc Shift+Click)`}
                  className={`pointer-events-auto absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full text-[8px] font-extrabold flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:scale-125 transition-transform font-mono ${
                    isSelected
                      ? 'bg-cyan-400 text-stone-950 border-2 border-yellow-300 ring-2 ring-cyan-300 scale-115'
                      : 'bg-blue-500 text-white border-2 border-white'
                  }`}
                  style={{ left: `${slot.x}px`, top: `${slot.y}px` }}
                >
                  V{i + 1}
                </button>
              );
            })}

            {/* Normal Slots */}
            {normalSlots.map((slot, i) => {
              const isSelected = selectedSeats.has(`normal:${i}`);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onMouseDown={(e) => handleStartSeatDrag('normal', i, e)}
                  onTouchStart={(e) => handleStartSeatDrag('normal', i, e)}
                  title={`Chiếu ngồi bái lạy #${i + 1} (Kéo chọn nhiều ghế hoặc Shift+Click)`}
                  className={`pointer-events-auto absolute w-4 h-4 -ml-2 -mt-2 rounded-full text-[8px] font-bold flex items-center justify-center shadow cursor-grab active:cursor-grabbing hover:scale-125 transition-transform font-mono ${
                    isSelected
                      ? 'bg-cyan-300 text-stone-950 border-2 border-yellow-300 ring-2 ring-cyan-300 scale-115'
                      : 'bg-emerald-400 text-stone-950 border border-white'
                  }`}
                  style={{ left: `${slot.x}px`, top: `${slot.y}px` }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Layer 5: Draggable & Corner-Resizable HUD Boxes (7 Bảng hiển thị) */}
        <StageHud
          hudLayout={config.hudLayout}
          customAssets={customAssets}
          donors={donors}
          floatingToasts={floatingToasts}
          grandEventProgress={grandEventProgress}
          grandEventTarget={config.grandEventTarget}
          isGrandEventActive={isGrandEventActive}
          eventBarFlashKey={eventBarFlashKey}
          currentPilgrimCount={activePilgrimCount}
          totalSeatCapacity={totalSeatCapacity}
          onStartDragHudBox={handleStartDragHudBox}
          onStartResizeHudBox={handleStartResizeHudBox}
        />
      </div>
    </div>
  );
};


