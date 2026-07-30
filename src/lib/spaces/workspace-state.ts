import {
  validateItemInput,
  type ValidatedItemInput
} from "../items/item-input";
import {
  isNormalizedLocation,
  type NormalizedLocationCoordinate
} from "../locations/coordinates";
import {
  validateSpaceInput,
  type ValidatedSpaceInput
} from "./space-input";

export type WorkspaceLocation = {
  id: string;
  name: string;
  coordinate: NormalizedLocationCoordinate;
};

export type WorkspaceItem = ValidatedItemInput & {
  id: string;
};

export type WorkspaceSpace = {
  id: string;
  name: string;
  image: ValidatedSpaceInput["image"];
  imageUrl: string;
  locations: WorkspaceLocation[];
  items: WorkspaceItem[];
};

export type WorkspaceCommandResult =
  | {
      ok: true;
      state: WorkspaceSpace;
    }
  | {
      ok: false;
      state: WorkspaceSpace | null;
      error: {
        code:
          | "WORKSPACE_COMMAND_INVALID"
          | "WORKSPACE_SPACE_NOT_FOUND"
          | "WORKSPACE_LOCATION_NOT_FOUND";
        message: string;
      };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function readNormalizedCoordinate(
  value: unknown
): NormalizedLocationCoordinate | null {
  if (!isNormalizedLocation(value)) {
    return null;
  }

  try {
    const coordinate = {
      xRatio: value.xRatio,
      yRatio: value.yRatio
    };

    return isNormalizedLocation(coordinate) ? coordinate : null;
  } catch {
    return null;
  }
}

function readValidatedSpaceInput(
  value: unknown
): ValidatedSpaceInput | null {
  const result = validateSpaceInput(value);

  if (!result.ok) {
    return null;
  }

  return {
    name: result.data.name,
    image: {
      mimeType: result.data.image.mimeType,
      sizeBytes: result.data.image.sizeBytes
    }
  };
}

function readValidatedItemInput(value: unknown): ValidatedItemInput | null {
  const result = validateItemInput(value);

  if (!result.ok) {
    return null;
  }

  return {
    name: result.data.name,
    locationId: result.data.locationId,
    expiryDate: result.data.expiryDate
  };
}

function readWorkspaceLocation(value: unknown): WorkspaceLocation | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readNonEmptyText(value.id);
  const name = readNonEmptyText(value.name);
  const coordinate = readNormalizedCoordinate(value.coordinate);

  if (id === null || name === null || coordinate === null) {
    return null;
  }

  return { id, name, coordinate };
}

function readWorkspaceItem(value: unknown): WorkspaceItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readNonEmptyText(value.id);
  const item = readValidatedItemInput(value);

  if (id === null || item === null) {
    return null;
  }

  return { id, ...item };
}

function readWorkspaceState(value: unknown): WorkspaceSpace | null {
  if (!isRecord(value)) {
    return null;
  }

  try {
    const id = readNonEmptyText(value.id);
    const input = readValidatedSpaceInput({
      name: value.name,
      image: value.image
    });
    const imageUrl = readNonEmptyText(value.imageUrl);

    if (
      id === null ||
      input === null ||
      imageUrl === null ||
      !Array.isArray(value.locations) ||
      !Array.isArray(value.items)
    ) {
      return null;
    }

    const locations: WorkspaceLocation[] = [];
    const locationIds = new Set<string>();

    for (const valueLocation of value.locations) {
      const location = readWorkspaceLocation(valueLocation);

      if (location === null || locationIds.has(location.id)) {
        return null;
      }

      locationIds.add(location.id);
      locations.push(location);
    }

    const items: WorkspaceItem[] = [];
    const itemIds = new Set<string>();

    for (const valueItem of value.items) {
      const item = readWorkspaceItem(valueItem);

      if (
        item === null ||
        itemIds.has(item.id) ||
        !locationIds.has(item.locationId)
      ) {
        return null;
      }

      itemIds.add(item.id);
      items.push(item);
    }

    return {
      id,
      name: input.name,
      image: input.image,
      imageUrl,
      locations,
      items
    };
  } catch {
    return null;
  }
}

function freezeWorkspaceState(state: WorkspaceSpace): WorkspaceSpace {
  const image = Object.freeze({
    mimeType: state.image.mimeType,
    sizeBytes: state.image.sizeBytes
  });
  const locations = state.locations.map((location) =>
    Object.freeze({
      id: location.id,
      name: location.name,
      coordinate: Object.freeze({
        xRatio: location.coordinate.xRatio,
        yRatio: location.coordinate.yRatio
      })
    })
  );
  const items = state.items.map((item) =>
    Object.freeze({
      id: item.id,
      name: item.name,
      locationId: item.locationId,
      expiryDate: item.expiryDate
    })
  );

  Object.freeze(locations);
  Object.freeze(items);

  return Object.freeze({
    id: state.id,
    name: state.name,
    image,
    imageUrl: state.imageUrl,
    locations,
    items
  }) as WorkspaceSpace;
}

function success(state: WorkspaceSpace): WorkspaceCommandResult {
  return {
    ok: true,
    state: freezeWorkspaceState(state)
  };
}

function failure(
  state: WorkspaceSpace | null,
  code: Extract<WorkspaceCommandResult, { ok: false }>["error"]["code"]
): WorkspaceCommandResult {
  const messageByCode = {
    WORKSPACE_COMMAND_INVALID: "The workspace command is invalid.",
    WORKSPACE_SPACE_NOT_FOUND: "An active workspace space is required.",
    WORKSPACE_LOCATION_NOT_FOUND: "The requested workspace location does not exist."
  } as const;

  return {
    ok: false,
    state,
    error: {
      code,
      message: messageByCode[code]
    }
  };
}

export function createWorkspaceSpace(
  currentState: WorkspaceSpace | null,
  command: unknown
): WorkspaceCommandResult {
  try {
    if (currentState !== null) {
      if (readWorkspaceState(currentState) === null) {
        return failure(null, "WORKSPACE_COMMAND_INVALID");
      }

      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    if (!isRecord(command)) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    const id = readNonEmptyText(command.id);
    const input = readValidatedSpaceInput(command.input);
    const imageUrl = readNonEmptyText(command.imageUrl);

    if (id === null || input === null || imageUrl === null) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    return success({
      id,
      name: input.name,
      image: input.image,
      imageUrl,
      locations: [],
      items: []
    });
  } catch {
    return failure(currentState, "WORKSPACE_COMMAND_INVALID");
  }
}

export function addWorkspaceLocation(
  currentState: WorkspaceSpace | null,
  command: unknown
): WorkspaceCommandResult {
  if (currentState === null) {
    return failure(currentState, "WORKSPACE_SPACE_NOT_FOUND");
  }

  try {
    const normalizedCurrentState = readWorkspaceState(currentState);

    if (normalizedCurrentState === null) {
      return failure(null, "WORKSPACE_COMMAND_INVALID");
    }

    if (!isRecord(command)) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    const id = readNonEmptyText(command.id);
    const name = readNonEmptyText(command.name);
    const coordinate = readNormalizedCoordinate(command.coordinate);

    if (id === null || name === null || coordinate === null) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    if (
      normalizedCurrentState.locations.some(
        (location) => location.id === id
      )
    ) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    return success({
      ...normalizedCurrentState,
      locations: [...normalizedCurrentState.locations, { id, name, coordinate }]
    });
  } catch {
    return failure(currentState, "WORKSPACE_COMMAND_INVALID");
  }
}

export function addWorkspaceItem(
  currentState: WorkspaceSpace | null,
  command: unknown
): WorkspaceCommandResult {
  if (currentState === null) {
    return failure(currentState, "WORKSPACE_SPACE_NOT_FOUND");
  }

  try {
    const normalizedCurrentState = readWorkspaceState(currentState);

    if (normalizedCurrentState === null) {
      return failure(null, "WORKSPACE_COMMAND_INVALID");
    }

    if (!isRecord(command)) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    const id = readNonEmptyText(command.id);
    const item = readValidatedItemInput(command.item);

    if (id === null || item === null) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    if (normalizedCurrentState.items.some((existingItem) => existingItem.id === id)) {
      return failure(currentState, "WORKSPACE_COMMAND_INVALID");
    }

    const locationExists = normalizedCurrentState.locations.some(
      (location) => location.id === item.locationId
    );

    if (!locationExists) {
      return failure(currentState, "WORKSPACE_LOCATION_NOT_FOUND");
    }

    return success({
      ...normalizedCurrentState,
      items: [...normalizedCurrentState.items, { id, ...item }]
    });
  } catch {
    return failure(currentState, "WORKSPACE_COMMAND_INVALID");
  }
}

export function getWorkspaceItemsForLocation(
  state: WorkspaceSpace | null,
  locationId: unknown
): WorkspaceItem[] {
  if (state === null) {
    return [];
  }

  try {
    const normalizedState = readWorkspaceState(state);

    if (normalizedState === null) {
      return [];
    }

    const normalizedLocationId = readNonEmptyText(locationId);

    if (normalizedLocationId === null) {
      return [];
    }

    return normalizedState.items
      .filter((item) => item.locationId === normalizedLocationId)
      .map((item) => ({ ...item }));
  } catch {
    return [];
  }
}
