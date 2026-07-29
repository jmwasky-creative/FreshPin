"use client";

import { type MouseEvent, useId } from "react";

import {
  getNormalizedLocationFromClick,
  isNormalizedLocation,
  toMarkerPosition,
  type MarkerPosition,
  type NormalizedLocationCoordinate
} from "@/lib/locations/coordinates";

type SpaceImage = {
  alt: string;
  height: number;
  src: string;
  width: number;
};

export type SpaceLocation = NormalizedLocationCoordinate & {
  id: string;
  name: string;
};

type RenderableLocation = {
  location: SpaceLocation;
  position: MarkerPosition;
};

type SpaceCanvasProps = {
  image: SpaceImage;
  locations: readonly unknown[];
  onCreateLocation?: (coordinate: NormalizedLocationCoordinate) => void;
  onSelectLocation?: (location: SpaceLocation) => void;
};

function getLocationEntries(value: unknown): readonly unknown[] {
  try {
    return Array.isArray(value) ? Array.from(value) : [];
  } catch {
    return [];
  }
}

function getRenderableLocation(value: unknown): RenderableLocation | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  try {
    const { id, name, xRatio, yRatio } = value as Record<string, unknown>;

    if (
      typeof id !== "string" ||
      !id.trim() ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return null;
    }

    const coordinate = { xRatio, yRatio };

    if (!isNormalizedLocation(coordinate)) {
      return null;
    }

    const position = toMarkerPosition(coordinate);

    if (!position) {
      return null;
    }

    return {
      location: { id, name, ...coordinate },
      position
    };
  } catch {
    return null;
  }
}

const markerClassName =
  "absolute z-10 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-emerald-500 shadow-lg";

export function SpaceCanvas({
  image,
  locations,
  onCreateLocation,
  onSelectLocation
}: SpaceCanvasProps) {
  const createLocationHelpId = useId();
  const locationEntries = getLocationEntries(locations);

  function handleImageClick(event: MouseEvent<HTMLImageElement>) {
    event.stopPropagation();

    const bounds = event.currentTarget.getBoundingClientRect();
    const coordinate = getNormalizedLocationFromClick(
      {
        clientX: event.clientX,
        clientY: event.clientY
      },
      {
        height: bounds.height,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width
      }
    );

    if (coordinate) {
      onCreateLocation?.(coordinate);
    }
  }

  function handleCreateLocationActivation(
    event: MouseEvent<HTMLButtonElement>
  ) {
    if (event.target !== event.currentTarget) {
      return;
    }

    onCreateLocation?.({ xRatio: 0.5, yRatio: 0.5 });
  }

  return (
    <div className="relative isolate rounded-2xl border border-slate-200 bg-slate-100">
      <button
        aria-describedby={createLocationHelpId}
        aria-label="在空间图片中创建位置"
        className="relative block w-full overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        onClick={handleCreateLocationActivation}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={image.alt}
          className="block h-auto w-full cursor-crosshair select-none"
          height={image.height}
          onClick={handleImageClick}
          src={image.src}
          width={image.width}
        />
        <span id={createLocationHelpId} className="sr-only">
          点击图片可在对应位置创建；使用 Enter 或空格键时将在图片中心创建位置。
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/10 to-transparent"
        />
      </button>
      {locationEntries.map((value, index) => {
        const renderableLocation = getRenderableLocation(value);

        if (!renderableLocation) {
          return null;
        }

        const { location, position } = renderableLocation;
        const marker = <span aria-hidden="true" className="block size-full rounded-full bg-emerald-500/70" />;

        if (onSelectLocation) {
          return (
            <button
              aria-label={`选择位置：${location.name}`}
              className={`${markerClassName} transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300`}
              key={`${location.id}-${index}`}
              onClick={() => onSelectLocation(location)}
              style={position}
              type="button"
            >
              {marker}
            </button>
          );
        }

        return (
          <span
            aria-label={`位置标记：${location.name}`}
            className={`${markerClassName} pointer-events-none`}
            key={`${location.id}-${index}`}
            role="img"
            style={position}
          >
            {marker}
          </span>
        );
      })}
    </div>
  );
}
