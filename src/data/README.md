# Qur'an Dataset Origin

The `quran-uthmani.json` file in this directory is now sourced directly from the Tanzil project and reshaped locally into the same JSON structure the app already expects.

- **Primary Text Source:** Tanzil Uthmani XML export
- **Primary Metadata Source:** Tanzil Quran Metadata XML
- **Text Version:** `1.0.2`
- **Metadata Version:** `1.0`
- **Source URLs:** `https://tanzil.net/download`, `https://tanzil.net/docs/Quran_Metadata`
- **Date Rebuilt:** April 3, 2026

## Provenance Notes

- The file name remains `quran-uthmani.json` for compatibility with the existing import path.
- Tanzil data was converted into the app's current shape so no UI or typing logic changes were required.
- The Tanzil terms require preserving attribution and linking back to `tanzil.net` when the text is used in an application.

---

## Text Transformation Pipeline

The raw source text passes through the following pipeline before display and typing.

| Layer | Description |
|---|---|
| **Raw source** | Unmodified text from `quran-uthmani.json` per ayah |
| **Display text** | Raw source + approved display-only transformations (see below) |
| **Check string** | Simplified form of display text used for keystroke validation only |

### Approved Display Transformations

The display text differs from the raw source **only** in these two explicitly intended ways:

1. **Basmala separation** — For all surahs except Al-Fatihah (1) and At-Tawbah (9), the Basmala prefix is separated from Ayah 1 and rendered as a standalone display-only header above the typing area. It is not included in the typing target.
2. **Ayah-end marker insertion** — A Unicode End of Ayah marker (`\u06DD`) followed by the ayah number in Arabic-Indic digits is appended after each ayah's text for visual display.

No other mutations are applied to the display text.

### Normalization (Check Layer Only)

The `checkString` is derived from the display text by stripping diacritics (harakat), normalizing Alef variants, and removing Tatweel. This simplified form is used **only** for keystroke matching and never appears in the display layer.
