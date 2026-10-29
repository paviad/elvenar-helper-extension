import { useEffect, useMemo, useRef, useState } from 'react';
import { ChecklistStep } from '../../city/movePlan/checklist';
import { SimCity } from '../../city/movePlan/rulesSimulator';
import { Camera } from './camera/camera';
import { CameraStatus, cameraTracker } from './camera/cameraTracker';
import { removeMarks, showMarks } from './camera/gameMarkers';
import { Placed } from './camera/locateCamera';
import { loadBuildingSprite } from './sprites/buildingSprite';
import { Mark, stepMap } from './stepMapModel';

/**
 * Shows the step on the game's own map: the camera is followed only while there is a step to show,
 * as finding it takes work, and the marks go when the step does. The camera goes straight to the
 * marks, not through React: during a drag it changes with every mouse movement.
 *
 * Returns how the search for the camera is going, while there are marks to place.
 */
export const useGameMarkers = (
  step: ChecklistStep | undefined,
  city: SimCity | undefined,
  spriteId: ((kind: string, level: number, stage?: number) => string | undefined) | undefined,
) => {
  const showing = step !== undefined;
  const marks = useMemo(() => (step && city ? stepMap(step, city)?.marks : undefined), [step, city]);
  const marksRef = useRef<Mark[] | undefined>(marks);
  const cameraRef = useRef<Camera | undefined>(undefined);
  const [status, setStatus] = useState<CameraStatus>();

  useEffect(() => {
    marksRef.current = marks;
    showMarks(marks, cameraRef.current, false);
  }, [marks]);

  useEffect(() => {
    if (!showing) return;
    const unsubscribe = cameraTracker.subscribe((camera, moving) => {
      cameraRef.current = camera;
      showMarks(marksRef.current, camera, moving);
    });
    const unwatch = cameraTracker.onStatus(setStatus);
    return () => {
      unwatch();
      unsubscribe();
      cameraRef.current = undefined;
      showMarks(undefined, undefined, false);
    };
  }, [showing]);

  useEffect(() => {
    if (!showing || !city || !spriteId) return;
    let live = true;
    void Promise.all(
      [...city.buildings.values()].map(async (b): Promise<Placed> => {
        const id = spriteId(b.kind, b.level, b.stage);
        return {
          x: b.x,
          y: b.y,
          width: b.width,
          length: b.length,
          sprite: id ? await loadBuildingSprite(id) : undefined,
        };
      }),
    ).then((placed) => live && cameraTracker.setBuildings(placed));
    return () => {
      live = false;
    };
  }, [showing, city, spriteId]);

  useEffect(() => removeMarks, []);

  return showing && marks?.length ? status : undefined;
};
