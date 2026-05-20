/**
 * Header logo sizing — edit `width` to change display size.
 * SVG viewBox is cropped in logos/logo.svg (no extra canvas padding).
 */
export const HEADER_LOGO = {
  /** Tailwind width class — primary control for the wordmark */
  width: 'w-[5.5rem]',
  /** Optional max height cap */
  maxHeight: 'max-h-9',
};

export const headerLogoClassName = `block ${HEADER_LOGO.width} ${HEADER_LOGO.maxHeight} h-auto object-contain object-left`;
