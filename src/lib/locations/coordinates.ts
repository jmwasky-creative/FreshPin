export type ClientClick = {
  clientX: number;
  clientY: number;
};

export type DisplayedImageContentBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type NormalizedLocationCoordinate = {
  xRatio: number;
  yRatio: number;
};

export type MarkerPosition = {
  left: string;
  top: string;
};

export function isNormalizedLocation(
  value: unknown
): value is NormalizedLocationCoordinate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  try {
    const { xRatio, yRatio } = value as Record<string, unknown>;

    return (
      typeof xRatio === "number" &&
      xRatio >= 0 &&
      xRatio <= 1 &&
      typeof yRatio === "number" &&
      yRatio >= 0 &&
      yRatio <= 1
    );
  } catch {
    return false;
  }
}

export function getNormalizedLocationFromClick(
  click: ClientClick,
  imageContentBox: DisplayedImageContentBox
): NormalizedLocationCoordinate | null {
  if (
    !Number.isFinite(imageContentBox.width) ||
    !Number.isFinite(imageContentBox.height) ||
    imageContentBox.width <= 0 ||
    imageContentBox.height <= 0
  ) {
    return null;
  }

  const coordinate = {
    xRatio: (click.clientX - imageContentBox.left) / imageContentBox.width,
    yRatio: (click.clientY - imageContentBox.top) / imageContentBox.height
  };

  if (!isNormalizedLocation(coordinate)) {
    return null;
  }

  return coordinate;
}

export function toMarkerPosition(
  coordinate: NormalizedLocationCoordinate
): MarkerPosition | null {
  if (!isNormalizedLocation(coordinate)) {
    return null;
  }

  return {
    left: `${coordinate.xRatio * 100}%`,
    top: `${coordinate.yRatio * 100}%`
  };
}
