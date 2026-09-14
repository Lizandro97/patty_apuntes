// Single source of truth for new-file defaults (no hardcoded domain content elsewhere).
// User-facing strings come from i18n so they follow the active language.
import i18n from "@/i18n"

export const currentYear = () => new Date().getFullYear()

export const defaultTitle = () => i18n.t("records.newDefaultTitle")

export const DEFAULT_PERSONAL_COUNT = 2

export const newRecordPayload = () => ({
  title: defaultTitle(),
  review_type: "",
  period_start: currentYear(),
  period_end: currentYear(),
  staff_count: DEFAULT_PERSONAL_COUNT,
})
