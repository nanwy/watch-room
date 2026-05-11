export function shouldCaptureTouchTap(isTouchDevice: boolean, visible: boolean) {
  return isTouchDevice && !visible
}

export type FullscreenAction =
  | "requestContainerFullscreen"
  | "enterWebKitVideoFullscreen"
  | "exitDocumentFullscreen"
  | "none"

export function getFullscreenAction(input: {
  isDocumentFullscreen: boolean
  canRequestContainerFullscreen: boolean
  canEnterWebKitVideoFullscreen: boolean
}): FullscreenAction {
  if (input.isDocumentFullscreen) return "exitDocumentFullscreen"
  if (input.canRequestContainerFullscreen) return "requestContainerFullscreen"
  if (input.canEnterWebKitVideoFullscreen) return "enterWebKitVideoFullscreen"
  return "none"
}
