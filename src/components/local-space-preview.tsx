"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState
} from "react";

import { SpaceCanvas, type SpaceLocation } from "./space-canvas";
import type { NormalizedLocationCoordinate } from "@/lib/locations/coordinates";

type PendingImage = {
  alt: string;
  generation: number;
  src: string;
};

type LoadedImage = PendingImage & {
  height: number;
  width: number;
};

const maxPreviewImageBytes = 5 * 1024 * 1024;
const previewableImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export function LocalSpacePreview() {
  const activeObjectUrl = useRef<string | null>(null);
  const createLocationButton = useRef<HTMLButtonElement>(null);
  const imageGeneration = useRef(0);
  const locationNameInput = useRef<HTMLInputElement>(null);
  const nextLocationId = useRef(0);
  const shouldRestoreCanvasFocus = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationNameError, setLocationNameError] = useState<string | null>(
    null
  );
  const [locations, setLocations] = useState<SpaceLocation[]>([]);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [pendingLocation, setPendingLocation] =
    useState<NormalizedLocationCoordinate | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeObjectUrl.current) {
        URL.revokeObjectURL(activeObjectUrl.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingLocation) {
      locationNameInput.current?.focus();
    }
  }, [pendingLocation]);

  useEffect(() => {
    if (shouldRestoreCanvasFocus.current && !pendingLocation) {
      createLocationButton.current?.focus();
      shouldRestoreCanvasFocus.current = false;
    }
  }, [pendingLocation]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    event.currentTarget.value = "";

    if (
      !previewableImageMimeTypes.has(file.type) ||
      file.size > maxPreviewImageBytes
    ) {
      setErrorMessage("请选择 JPEG、PNG 或 WebP 格式且不超过 5 MiB 的图片。");
      return;
    }

    if (activeObjectUrl.current) {
      URL.revokeObjectURL(activeObjectUrl.current);
    }

    const src = URL.createObjectURL(file);
    activeObjectUrl.current = src;
    const generation = ++imageGeneration.current;
    setErrorMessage(null);
    setLoadedImage(null);
    setLocationName("");
    setLocationNameError(null);
    setLocations([]);
    setPendingImage({
      alt: `本地空间图片：${file.name}`,
      generation,
      src
    });
    setPendingLocation(null);
    setSelectionMessage(null);
    shouldRestoreCanvasFocus.current = false;
  }

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    if (
      !pendingImage ||
      pendingImage.generation !== imageGeneration.current ||
      event.currentTarget.src !== pendingImage.src
    ) {
      return;
    }

    const { naturalHeight: height, naturalWidth: width } = event.currentTarget;

    if (height <= 0 || width <= 0) {
      if (activeObjectUrl.current === pendingImage.src) {
        URL.revokeObjectURL(activeObjectUrl.current);
        activeObjectUrl.current = null;
      }

      setErrorMessage("无法读取这张图片的尺寸，请选择另一张图片。");
      setPendingImage(null);
      return;
    }

    setLoadedImage({ ...pendingImage, height, width });
  }

  function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
    if (
      !pendingImage ||
      pendingImage.generation !== imageGeneration.current ||
      event.currentTarget.src !== pendingImage.src
    ) {
      return;
    }

    if (activeObjectUrl.current === pendingImage.src) {
      URL.revokeObjectURL(activeObjectUrl.current);
      activeObjectUrl.current = null;
    }

    setErrorMessage("这张图片无法在浏览器中预览，请选择另一张图片。");
    setPendingImage(null);
  }

  function handleCreateLocation(coordinate: NormalizedLocationCoordinate) {
    setLocationName("");
    setLocationNameError(null);
    setPendingLocation(coordinate);
    setSelectionMessage(null);
  }

  function handleSaveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingLocation) {
      return;
    }

    const name = locationName.trim();

    if (!name) {
      setLocationNameError("请输入位置名称。");
      return;
    }

    const location = {
      id: `local-${++nextLocationId.current}`,
      name,
      ...pendingLocation
    };

    setLocations((currentLocations) => [...currentLocations, location]);
    setLocationName("");
    setLocationNameError(null);
    setPendingLocation(null);
    setSelectionMessage(`已创建位置：${name}`);
  }

  function handleSelectLocation(location: SpaceLocation) {
    setSelectionMessage(`已选择位置：${location.name}`);
  }

  function handleCancelLocation() {
    setPendingLocation(null);
    shouldRestoreCanvasFocus.current = true;
  }

  return (
    <section
      aria-labelledby="local-space-preview-title"
      className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="max-w-xl space-y-2">
        <h2
          className="text-xl font-semibold tracking-tight text-slate-900"
          id="local-space-preview-title"
        >
          本地空间预览
        </h2>
        <p className="leading-7 text-slate-600">
          选择一张冰箱、厨房或柜子的图片后，可在图片上添加位置标记。
        </p>
        <p className="text-sm leading-6 text-slate-500">
          刷新页面后，图片和位置标记会清空。
        </p>
      </div>

      <label className="mt-6 block text-sm font-semibold text-slate-800">
        选择空间图片
        <input
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          onChange={handleImageChange}
          type="file"
        />
      </label>

      {errorMessage ? (
        <p className="mt-4 text-sm font-medium text-rose-700" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {pendingImage && !loadedImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Browser object URLs are not compatible with Next image optimization.
        <img
          alt="正在加载空间图片"
          className="sr-only"
          key={pendingImage.src}
          onError={handleImageError}
          onLoad={handleImageLoad}
          src={pendingImage.src}
        />
      ) : null}

      {loadedImage ? (
        <>
          <div className="mt-6">
            <SpaceCanvas
              createLocationButtonRef={createLocationButton}
              image={loadedImage}
              locations={locations}
              onCreateLocation={handleCreateLocation}
              onSelectLocation={handleSelectLocation}
            />
          </div>

          {pendingLocation ? (
            <form
              className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
              onSubmit={handleSaveLocation}
            >
              <p className="text-sm font-semibold text-emerald-950">
                为新位置命名
              </p>
              <label className="mt-3 block text-sm font-medium text-slate-800">
                位置名称
                <input
                  aria-invalid={locationNameError ? true : undefined}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
                  onChange={(event) => {
                    setLocationName(event.target.value);
                    setLocationNameError(null);
                  }}
                  ref={locationNameInput}
                  value={locationName}
                />
              </label>
              {locationNameError ? (
                <p className="mt-2 text-sm font-medium text-rose-700" role="alert">
                  {locationNameError}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
                  type="submit"
                >
                  保存位置
                </button>
                <button
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
                  onClick={handleCancelLocation}
                  type="button"
                >
                  取消
                </button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}

      {selectionMessage ? (
        <p className="mt-4 text-sm font-medium text-emerald-800" role="status">
          {selectionMessage}
        </p>
      ) : null}
    </section>
  );
}
