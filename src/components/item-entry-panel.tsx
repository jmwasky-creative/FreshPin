"use client";

import { type FormEvent, useState } from "react";

import {
  type ItemValidationErrorCode,
  type ValidatedItemInput,
  validateItemInput
} from "@/lib/items/item-input";

type ItemEntryPanelProps = {
  selectedLocation: { id: string; name: string } | null;
  onSubmit: (item: ValidatedItemInput) => void;
};

const itemInputErrorMessage: Record<ItemValidationErrorCode, string> = {
  ITEM_INPUT_INVALID: "物品信息无效，请检查后重试。",
  ITEM_NAME_INVALID: "请输入 1–100 个字符的物品名称。",
  ITEM_NAME_REQUIRED: "请输入 1–100 个字符的物品名称。",
  ITEM_NAME_TOO_LONG: "请输入 1–100 个字符的物品名称。",
  ITEM_LOCATION_ID_INVALID: "请先选择一个有效的位置。",
  ITEM_LOCATION_ID_REQUIRED: "请先选择一个有效的位置。",
  ITEM_EXPIRY_DATE_INVALID: "请输入有效的到期日（YYYY-MM-DD）。"
};

export function ItemEntryPanel({
  selectedLocation,
  onSubmit
}: ItemEntryPanelProps) {
  const [expiryDate, setExpiryDate] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLocation) {
      return;
    }

    const result = validateItemInput({
      expiryDate: expiryDate || null,
      locationId: selectedLocation.id,
      name
    });

    if (!result.ok) {
      setErrorMessage(itemInputErrorMessage[result.error.code]);
      return;
    }

    setErrorMessage(null);
    onSubmit(result.data);
  }

  return (
    <section
      aria-labelledby="item-entry-panel-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2
        className="text-lg font-semibold tracking-tight text-slate-900"
        id="item-entry-panel-title"
      >
        录入物品
      </h2>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        {selectedLocation ? (
          <>
            <p className="text-sm font-medium text-emerald-800" role="status">
              已选择位置：{selectedLocation.name}
            </p>

            <label className="block text-sm font-medium text-slate-800">
              物品名称
              <input
                aria-describedby={errorMessage ? "item-entry-error" : undefined}
                aria-invalid={errorMessage ? true : undefined}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
                onChange={(event) => {
                  setErrorMessage(null);
                  setName(event.target.value);
                }}
                value={name}
              />
            </label>

            <label className="block text-sm font-medium text-slate-800">
              到期日（可选）
              <input
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
                onChange={(event) => {
                  setErrorMessage(null);
                  setExpiryDate(event.target.value);
                }}
                type="date"
                value={expiryDate}
              />
            </label>
          </>
        ) : (
          <p className="text-sm font-medium text-amber-800" role="status">
            请先选择一个位置
          </p>
        )}

        {errorMessage ? (
          <p className="text-sm font-medium text-rose-700" id="item-entry-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          disabled={!selectedLocation}
          type="submit"
        >
          保存物品
        </button>
      </form>
    </section>
  );
}
