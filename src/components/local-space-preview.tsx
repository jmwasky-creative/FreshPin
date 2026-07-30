"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState
} from "react";

import { ItemEntryPanel } from "./item-entry-panel";
import { SpaceCanvas, type SpaceLocation } from "./space-canvas";
import {
  getExpiryDisplayState,
  type ExpiryDisplayState
} from "@/lib/expiry/expiry";
import type { ValidatedItemInput } from "@/lib/items/item-input";
import type { NormalizedLocationCoordinate } from "@/lib/locations/coordinates";
import {
  validateSpaceInput,
  type SpaceValidationErrorCode
} from "@/lib/spaces/space-input";
import {
  addWorkspaceItem,
  addWorkspaceLocation,
  createWorkspaceSpace,
  getWorkspaceItemsForLocation,
  type WorkspaceSpace
} from "@/lib/spaces/workspace-state";

type PendingImage = {
  alt: string;
  file: File;
  generation: number;
  spaceName: string;
  src: string;
};

type LoadedImage = PendingImage & {
  height: number;
  width: number;
};

const defaultLocalSpaceName = "本地空间";
const reminderDays = 3;

const expiryStateLabel: Record<ExpiryDisplayState, string> = {
  DISCARDED: "已丢弃",
  EXPIRED: "已过期",
  EXPIRING_SOON: "临期",
  NORMAL: "正常",
  UNKNOWN: "待确认",
  USED: "已使用"
};

const localSpaceInputErrorMessage: Record<SpaceValidationErrorCode, string> = {
  SPACE_INPUT_INVALID: "无法创建本地空间，请检查空间名称和图片。",
  SPACE_NAME_INVALID: "请输入 1–50 个字符的空间名称。",
  SPACE_NAME_REQUIRED: "请输入 1–50 个字符的空间名称。",
  SPACE_NAME_TOO_LONG: "请输入 1–50 个字符的空间名称。",
  SPACE_IMAGE_INVALID: "请选择 JPEG、PNG 或 WebP 格式且不超过 5 MiB 的图片。",
  SPACE_IMAGE_SIZE_INVALID:
    "请选择 JPEG、PNG 或 WebP 格式且不超过 5 MiB 的图片。",
  UNSUPPORTED_SPACE_IMAGE_TYPE:
    "请选择 JPEG、PNG 或 WebP 格式且不超过 5 MiB 的图片。",
  SPACE_IMAGE_TOO_LARGE:
    "请选择 JPEG、PNG 或 WebP 格式且不超过 5 MiB 的图片。"
};

type LocalSpacePreviewProps = {
  today?: string;
};

function getBrowserLocalCalendarDate(): string {
  const currentDate = new Date();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");

  return `${currentDate.getFullYear()}-${month}-${day}`;
}

export function LocalSpacePreview({ today }: LocalSpacePreviewProps) {
  const activeObjectUrl = useRef<string | null>(null);
  const createLocationButton = useRef<HTMLButtonElement>(null);
  const imageGeneration = useRef(0);
  const locationNameInput = useRef<HTMLInputElement>(null);
  const nextLocationId = useRef(0);
  const nextItemId = useRef(0);
  const shouldRestoreCanvasFocus = useRef(false);
  const [browserToday, setBrowserToday] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationNameError, setLocationNameError] = useState<string | null>(
    null
  );
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [pendingLocation, setPendingLocation] =
    useState<NormalizedLocationCoordinate | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState(defaultLocalSpaceName);
  const [workspace, setWorkspace] = useState<WorkspaceSpace | null>(null);

  const selectedLocation =
    workspace?.locations.find((location) => location.id === selectedLocationId) ??
    null;
  const canvasLocations: SpaceLocation[] = workspace
    ? workspace.locations.map((location) => ({
        id: location.id,
        name: location.name,
        ...location.coordinate
      }))
    : [];
  const selectedItems = getWorkspaceItemsForLocation(
    workspace,
    selectedLocation?.id
  );
  const expiryToday = today ?? browserToday;

  useEffect(() => {
    return () => {
      if (activeObjectUrl.current) {
        URL.revokeObjectURL(activeObjectUrl.current);
      }
    };
  }, []);

  useEffect(() => {
    if (today !== undefined) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBrowserToday(getBrowserLocalCalendarDate());
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [today]);

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

  function reportWorkspaceFailure() {
    setErrorMessage("本地空间操作失败，请检查输入后重试。");
  }

  function releaseActiveObjectUrl(src: string) {
    if (activeObjectUrl.current === src) {
      URL.revokeObjectURL(activeObjectUrl.current);
      activeObjectUrl.current = null;
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    event.currentTarget.value = "";

    const spaceInput = validateSpaceInput({
      image: {
        mimeType: file.type,
        sizeBytes: file.size
      },
      name: spaceName
    });

    if (!spaceInput.ok) {
      setErrorMessage(localSpaceInputErrorMessage[spaceInput.error.code]);
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
    setPendingImage({
      alt: `本地空间图片：${file.name}`,
      file,
      generation,
      spaceName: spaceInput.data.name,
      src
    });
    setWorkspace(null);
    setPendingLocation(null);
    setSelectedLocationId(null);
    setSelectionMessage(null);
    nextLocationId.current = 0;
    nextItemId.current = 0;
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
      releaseActiveObjectUrl(pendingImage.src);

      setErrorMessage("无法读取这张图片的尺寸，请选择另一张图片。");
      setPendingImage(null);
      return;
    }

    const creationResult = createWorkspaceSpace(null, {
      id: `local-space-${pendingImage.generation}`,
      imageUrl: pendingImage.src,
      input: {
        image: {
          mimeType: pendingImage.file.type,
          sizeBytes: pendingImage.file.size
        },
        name: pendingImage.spaceName
      }
    });

    if (!creationResult.ok) {
      releaseActiveObjectUrl(pendingImage.src);
      setLoadedImage(null);
      setPendingImage(null);
      setWorkspace(null);
      setSelectedLocationId(null);
      reportWorkspaceFailure();
      return;
    }

    setWorkspace(creationResult.state);
    setLoadedImage({ ...pendingImage, height, width });
    setPendingImage(null);
  }

  function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
    if (
      !pendingImage ||
      pendingImage.generation !== imageGeneration.current ||
      event.currentTarget.src !== pendingImage.src
    ) {
      return;
    }

    releaseActiveObjectUrl(pendingImage.src);

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

    const locationResult = addWorkspaceLocation(workspace, {
      coordinate: pendingLocation,
      id: `local-location-${imageGeneration.current}-${++nextLocationId.current}`,
      name
    });

    if (!locationResult.ok) {
      reportWorkspaceFailure();
      return;
    }

    setWorkspace(locationResult.state);
    setLocationName("");
    setLocationNameError(null);
    setPendingLocation(null);
    setSelectionMessage(`已创建位置：${name}`);
  }

  function handleSelectLocation(location: SpaceLocation) {
    if (!workspace?.locations.some((entry) => entry.id === location.id)) {
      return;
    }

    setSelectedLocationId(location.id);
    setSelectionMessage(`已选择位置：${location.name}`);
  }

  function handleSaveItem(item: ValidatedItemInput) {
    const itemResult = addWorkspaceItem(workspace, {
      id: `local-item-${imageGeneration.current}-${++nextItemId.current}`,
      item
    });

    if (!itemResult.ok) {
      reportWorkspaceFailure();
      return;
    }

    setWorkspace(itemResult.state);
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
          本地原型：关闭或刷新页面后，图片、位置标记和物品记录都会丢失。
        </p>
      </div>

      <label className="mt-6 block text-sm font-semibold text-slate-800">
        空间名称
        <input
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          maxLength={50}
          onChange={(event) => {
            setSpaceName(event.target.value);
            setErrorMessage(null);
          }}
          required
          value={spaceName}
        />
      </label>

      <label className="mt-4 block text-sm font-semibold text-slate-800">
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
          {workspace ? (
            <p className="mt-6 text-sm font-medium text-emerald-800">
              当前空间：{workspace.name}
            </p>
          ) : null}
          <div className="mt-6">
            <SpaceCanvas
              createLocationButtonRef={createLocationButton}
              image={loadedImage}
              locations={canvasLocations}
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

          {selectedLocation ? (
            <div className="mt-5 space-y-4">
              <ItemEntryPanel
                onSubmit={handleSaveItem}
                selectedLocation={selectedLocation}
              />

              <section
                aria-labelledby="selected-location-items-title"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <h3
                  className="text-base font-semibold text-slate-900"
                  id="selected-location-items-title"
                >
                  {selectedLocation.name}中的物品
                </h3>
                {selectedItems.length ? (
                  <ul className="mt-3 space-y-3">
                    {selectedItems.map((item) => {
                      const expiryState = expiryToday
                        ? getExpiryDisplayState({
                            expiryDate: item.expiryDate,
                            itemStatus: "ACTIVE",
                            reminderDays,
                            today: expiryToday
                          })
                        : "UNKNOWN";

                      return (
                        <li
                          className="rounded-xl bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
                          key={item.id}
                        >
                          <p className="font-semibold text-slate-950">{item.name}</p>
                          <p className="mt-1 text-slate-600">
                            到期状态：{expiryStateLabel[expiryState]}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    这个位置还没有物品记录。
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </>
      ) : null}

      {selectionMessage && !selectedLocation ? (
        <p className="mt-4 text-sm font-medium text-emerald-800" role="status">
          {selectionMessage}
        </p>
      ) : null}
    </section>
  );
}
