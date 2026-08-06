/**
 * The overlay's stacking order, in one place because the pieces have to be reasoned about
 * together: MUI puts modals at 1300, which is under all of it, so anything of ours that is a
 * Modal has to say otherwise or it opens invisible.
 */

/** The panel itself. */
export const OVERLAY_PANEL_Z_INDEX = 9999;

/** The resize handle sitting on the panel's corner, above the panel's own content. */
export const OVERLAY_RESIZE_HANDLE_Z_INDEX = 10000;

/**
 * Menus that render inside the panel rather than on the body, so they only have to clear the
 * panel's own children — chiefly the resize handle.
 */
export const OVERLAY_MENU_Z_INDEX = 10001;

/**
 * Dialogs that portal to the body, and so are siblings of the panel rather than children of it.
 * They have to clear the panel itself or they open behind it.
 */
export const OVERLAY_DIALOG_Z_INDEX = 10002;
