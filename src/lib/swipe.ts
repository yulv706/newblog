export type HorizontalSwipeDirection = -1 | 0 | 1;

type HorizontalSwipeInput = {
  offsetX: number;
  offsetY?: number;
  velocityX?: number;
  velocityY?: number;
};

const MIN_DISTANCE_PX = 48;
const MIN_FLICK_DISTANCE_PX = 12;
const MIN_FLICK_VELOCITY_PX = 500;
const DIRECTION_BIAS = 1.1;

export function getHorizontalSwipeDirection({
  offsetX,
  offsetY = 0,
  velocityX = 0,
  velocityY = 0,
}: HorizontalSwipeInput): HorizontalSwipeDirection {
  const horizontalDistance = Math.abs(offsetX);
  const verticalDistance = Math.abs(offsetY);
  const horizontalVelocity = Math.abs(velocityX);
  const verticalVelocity = Math.abs(velocityY);

  const isHorizontalDistance =
    horizontalDistance >= MIN_DISTANCE_PX &&
    horizontalDistance >= verticalDistance * DIRECTION_BIAS;
  const isHorizontalFlick =
    horizontalDistance >= MIN_FLICK_DISTANCE_PX &&
    horizontalVelocity >= MIN_FLICK_VELOCITY_PX &&
    horizontalVelocity >= verticalVelocity * DIRECTION_BIAS;

  if (!isHorizontalDistance && !isHorizontalFlick) {
    return 0;
  }

  const intent = isHorizontalDistance ? offsetX : velocityX;
  return intent < 0 ? 1 : -1;
}
