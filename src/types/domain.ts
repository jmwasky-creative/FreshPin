export type ShelfLifeUnit = "DAY" | "MONTH" | "YEAR";
export type ItemStatus = "ACTIVE" | "USED" | "DISCARDED";
export type ReminderKind = "BEFORE_EXPIRE" | "EXPIRE_TODAY";

export interface ItemPreview {
  id: string;
  name: string;
  imagePath: string | null;
  imageUrl: string | null;
  expireDate: string | null;
  status: ItemStatus;
}

export interface LocationView {
  id: string;
  name: string;
  xRatio: number;
  yRatio: number;
  items: ItemPreview[];
}

export interface SpaceView {
  id: string;
  name: string;
  imagePath: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  createdAt: string;
  locations: LocationView[];
}

export interface RecognitionDraft {
  name: string | null;
  produceDate: string | null;
  shelfLife: {
    value: number;
    unit: ShelfLifeUnit;
  } | null;
  expireDate: string | null;
  rawText: string | null;
  warnings: string[];
  provider: string;
}

export interface ItemCreateInput {
  locationId: string;
  name: string;
  imagePath: string | null;
  produceDate: string | null;
  shelfLifeValue: number | null;
  shelfLifeUnit: ShelfLifeUnit | null;
  expireDate: string | null;
  remindDaysBefore: number;
  sourceRawText: string | null;
}

export interface RecentItemView {
  id: string;
  name: string;
  imagePath: string | null;
  imageUrl: string | null;
  expireDate: string | null;
  status: ItemStatus;
  createdAt: string;
  location: unknown;
}
