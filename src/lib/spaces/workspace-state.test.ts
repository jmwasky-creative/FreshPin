import { describe, expect, it } from "vitest";

import type { ValidatedItemInput } from "../items/item-input";
import { validateSpaceInput } from "./space-input";
import {
  addWorkspaceItem,
  addWorkspaceLocation,
  createWorkspaceSpace,
  getWorkspaceItemsForLocation,
  type WorkspaceSpace
} from "./workspace-state";

function createValidatedSpaceFixture() {
  const result = validateSpaceInput({
    name: "  Kitchen  ",
    image: {
      mimeType: "image/jpeg",
      sizeBytes: 42
    }
  });

  if (!result.ok) {
    throw new Error("Expected the shared space fixture to be valid.");
  }

  return result.data;
}

const validatedSpace = createValidatedSpaceFixture();

const validatedItem: ValidatedItemInput = {
  name: "Milk",
  locationId: "location-fridge",
  expiryDate: "2026-08-03"
};

function createKitchenWorkspace() {
  const result = createWorkspaceSpace(null, {
    id: "space-kitchen",
    input: validatedSpace,
    imageUrl: "blob:kitchen"
  });

  if (!result.ok || result.state === null) {
    throw new Error("Expected a workspace space to be created.");
  }

  return result.state;
}

function createKitchenWorkspaceWithFridge() {
  const result = addWorkspaceLocation(createKitchenWorkspace(), {
    id: "location-fridge",
    name: "  Fridge  ",
    coordinate: {
      xRatio: 0.25,
      yRatio: 0.5
    }
  });

  if (!result.ok || result.state === null) {
    throw new Error("Expected a workspace location to be created.");
  }

  return result.state;
}

function expectWorkspaceSnapshotToBeDeeplyFrozen(state: WorkspaceSpace) {
  expect(Object.isFrozen(state)).toBe(true);
  expect(Object.isFrozen(state.image)).toBe(true);
  expect(Object.isFrozen(state.locations)).toBe(true);
  expect(Object.isFrozen(state.items)).toBe(true);

  for (const location of state.locations) {
    expect(Object.isFrozen(location)).toBe(true);
    expect(Object.isFrozen(location.coordinate)).toBe(true);
  }

  for (const item of state.items) {
    expect(Object.isFrozen(item)).toBe(true);
  }
}

describe("workspace state", () => {
  it("creates one active space from validated name and image data", () => {
    const result = createWorkspaceSpace(null, {
      id: "space-kitchen",
      input: validatedSpace,
      imageUrl: "blob:kitchen"
    });

    expect(result).toEqual({
      ok: true,
      state: {
        id: "space-kitchen",
        name: "Kitchen",
        image: {
          mimeType: "image/jpeg",
          sizeBytes: 42
        },
        imageUrl: "blob:kitchen",
        locations: [],
        items: []
      }
    });
  });

  it("returns a deeply frozen snapshot from every successful workspace command", () => {
    const createdResult = createWorkspaceSpace(null, {
      id: "space-kitchen",
      input: validatedSpace,
      imageUrl: "blob:kitchen"
    });

    if (!createdResult.ok) {
      throw new Error("Expected the workspace space to be created.");
    }

    expectWorkspaceSnapshotToBeDeeplyFrozen(createdResult.state);

    const locationResult = addWorkspaceLocation(createdResult.state, {
      id: "location-fridge",
      name: "Fridge",
      coordinate: {
        xRatio: 0.25,
        yRatio: 0.5
      }
    });

    if (!locationResult.ok) {
      throw new Error("Expected the workspace location to be created.");
    }

    expectWorkspaceSnapshotToBeDeeplyFrozen(locationResult.state);

    const itemResult = addWorkspaceItem(locationResult.state, {
      id: "item-milk",
      item: validatedItem
    });

    if (!itemResult.ok) {
      throw new Error("Expected the workspace item to be created.");
    }

    expectWorkspaceSnapshotToBeDeeplyFrozen(itemResult.state);

    expect(() => {
      itemResult.state.locations.push({
        id: "location-pantry",
        name: "Pantry",
        coordinate: {
          xRatio: 0.75,
          yRatio: 0.25
        }
      });
    }).toThrow(TypeError);

    expect(() => {
      itemResult.state.locations[0]!.coordinate.xRatio = 0.75;
    }).toThrow(TypeError);

    expect(() => {
      itemResult.state.items[0]!.name = "Changed outside the workspace";
    }).toThrow(TypeError);

    expect(
      addWorkspaceLocation(itemResult.state, {
        id: "location-pantry",
        name: "Pantry",
        coordinate: {
          xRatio: 0.75,
          yRatio: 0.25
        }
      })
    ).toMatchObject({ ok: true });
  });

  it("rejects creation when a valid active workspace already exists", () => {
    const currentState = createKitchenWorkspace();

    const result = createWorkspaceSpace(currentState, {
      id: "space-kitchen",
      input: validatedSpace,
      imageUrl: "blob:replacement"
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
    expect(result.state).toBe(currentState);
  });

  it("rejects an unvalidated space command without replacing active state", () => {
    const currentState = createKitchenWorkspace();

    const result = createWorkspaceSpace(currentState, {
      id: "space-garage",
      input: {
        name: "Garage",
        image: {
          mimeType: "image/gif",
          sizeBytes: 42
        }
      },
      imageUrl: "blob:garage"
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(currentState);
    expect(result).toMatchObject({
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
  });

  it("adds a location with a trimmed name and normalized coordinate", () => {
    const currentState = createKitchenWorkspace();

    const result = addWorkspaceLocation(currentState, {
      id: "location-fridge",
      name: "  Fridge  ",
      coordinate: {
        xRatio: 0.25,
        yRatio: 0.5
      }
    });

    expect(result).toEqual({
      ok: true,
      state: {
        ...currentState,
        locations: [
          {
            id: "location-fridge",
            name: "Fridge",
            coordinate: {
              xRatio: 0.25,
              yRatio: 0.5
            }
          }
        ]
      }
    });
    expect(currentState.locations).toEqual([]);
  });

  it("rejects a location command with a non-normalized coordinate without changing state", () => {
    const currentState = createKitchenWorkspace();

    const result = addWorkspaceLocation(currentState, {
      id: "location-fridge",
      name: "Fridge",
      coordinate: {
        xRatio: 1.01,
        yRatio: 0.5
      }
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(currentState);
    expect(result).toMatchObject({
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
  });

  it("adds an already validated item to an existing location", () => {
    const currentState = createKitchenWorkspaceWithFridge();

    const result = addWorkspaceItem(currentState, {
      id: "item-milk",
      item: validatedItem
    });

    expect(result).toEqual({
      ok: true,
      state: {
        ...currentState,
        items: [
          {
            id: "item-milk",
            name: "Milk",
            locationId: "location-fridge",
            expiryDate: "2026-08-03"
          }
        ]
      }
    });
  });

  it("rejects an item for an unknown location without changing state", () => {
    const currentState = createKitchenWorkspaceWithFridge();

    const result = addWorkspaceItem(currentState, {
      id: "item-milk",
      item: {
        ...validatedItem,
        locationId: "location-unknown"
      }
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(currentState);
    expect(result).toMatchObject({
      error: {
        code: "WORKSPACE_LOCATION_NOT_FOUND"
      }
    });
  });

  it("rejects a malformed command without changing state", () => {
    const currentState = createKitchenWorkspace();

    const result = addWorkspaceLocation(currentState, {
      id: "location-fridge",
      name: " \t ",
      coordinate: {
        xRatio: 0.25,
        yRatio: 0.5
      }
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(currentState);
    expect(result).toMatchObject({
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
  });

  it("rejects an item that was not validated before reaching the workspace", () => {
    const currentState = createKitchenWorkspaceWithFridge();

    const result = addWorkspaceItem(currentState, {
      id: "item-milk",
      item: {
        name: "Milk",
        locationId: "location-fridge",
        expiryDate: "not-a-calendar-date"
      }
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(currentState);
    expect(result).toMatchObject({
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
  });

  it("returns only the items attached to the requested location", () => {
    const stateWithFridge = createKitchenWorkspaceWithFridge();
    const stateWithPantryResult = addWorkspaceLocation(stateWithFridge, {
      id: "location-pantry",
      name: "Pantry",
      coordinate: {
        xRatio: 0.75,
        yRatio: 0.25
      }
    });

    if (!stateWithPantryResult.ok || stateWithPantryResult.state === null) {
      throw new Error("Expected the pantry location to be created.");
    }

    const stateWithMilkResult = addWorkspaceItem(stateWithPantryResult.state, {
      id: "item-milk",
      item: validatedItem
    });

    if (!stateWithMilkResult.ok || stateWithMilkResult.state === null) {
      throw new Error("Expected the milk item to be created.");
    }

    const stateWithRiceResult = addWorkspaceItem(stateWithMilkResult.state, {
      id: "item-rice",
      item: {
        name: "Rice",
        locationId: "location-pantry",
        expiryDate: null
      }
    });

    if (!stateWithRiceResult.ok || stateWithRiceResult.state === null) {
      throw new Error("Expected the rice item to be created.");
    }

    expect(
      getWorkspaceItemsForLocation(stateWithRiceResult.state, "location-fridge")
    ).toEqual([
      {
        id: "item-milk",
        name: "Milk",
        locationId: "location-fridge",
        expiryDate: "2026-08-03"
      }
    ]);
  });

  it("returns item snapshots that cannot mutate the workspace state", () => {
    const stateWithFridge = createKitchenWorkspaceWithFridge();
    const result = addWorkspaceItem(stateWithFridge, {
      id: "item-milk",
      item: validatedItem
    });

    if (!result.ok || result.state === null) {
      throw new Error("Expected the milk item to be created.");
    }

    const selectedItems = getWorkspaceItemsForLocation(
      result.state,
      "location-fridge"
    );

    selectedItems[0]!.name = "Changed outside the workspace";

    expect(result.state.items[0]).toMatchObject({ name: "Milk" });
    expect(
      getWorkspaceItemsForLocation(result.state, "location-fridge")
    ).toMatchObject([{ name: "Milk" }]);
  });

  it.each([
    [
      "contains a forged coordinate",
      () => {
        const validState = createKitchenWorkspaceWithFridge();

        return {
          ...validState,
          locations: [
            {
              ...validState.locations[0]!,
              coordinate: {
                xRatio: 1.25,
                yRatio: 0.5
              }
            }
          ]
        } as WorkspaceSpace;
      }
    ],
    [
      "contains an invalid item",
      () => ({
        ...createKitchenWorkspaceWithFridge(),
        items: [
          {
            id: "item-invalid",
            name: "Milk",
            locationId: "location-fridge",
            expiryDate: "not-a-calendar-date"
          }
        ]
      }) as WorkspaceSpace
    ],
    [
      "contains an item pointing to a missing location",
      () => ({
        ...createKitchenWorkspaceWithFridge(),
        items: [
          {
            id: "item-orphaned",
            name: "Milk",
            locationId: "location-missing",
            expiryDate: null
          }
        ]
      }) as WorkspaceSpace
    ]
  ])("rejects a runtime state that %s", (_description, createInvalidState) => {
    const result = addWorkspaceLocation(createInvalidState(), {
      id: "location-pantry",
      name: "Pantry",
      coordinate: {
        xRatio: 0.75,
        yRatio: 0.25
      }
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
  });

  it("rejects a location command that repeats an existing location ID", () => {
    const currentState = createKitchenWorkspaceWithFridge();

    const result = addWorkspaceLocation(currentState, {
      id: "location-fridge",
      name: "Second fridge marker",
      coordinate: {
        xRatio: 0.75,
        yRatio: 0.25
      }
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
    expect(result.state).toBe(currentState);
  });

  it("rejects an item command that repeats an existing item ID", () => {
    const stateWithFridge = createKitchenWorkspaceWithFridge();
    const firstItemResult = addWorkspaceItem(stateWithFridge, {
      id: "item-milk",
      item: validatedItem
    });

    if (!firstItemResult.ok || firstItemResult.state === null) {
      throw new Error("Expected the first item to be created.");
    }

    const result = addWorkspaceItem(firstItemResult.state, {
      id: "item-milk",
      item: {
        ...validatedItem,
        name: "Yogurt"
      }
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_COMMAND_INVALID"
      }
    });
    expect(result.state).toBe(firstItemResult.state);
  });
});
