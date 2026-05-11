export function shouldCaptureTouchTap(isTouchDevice: boolean, visible: boolean) {
  return isTouchDevice && !visible
}
