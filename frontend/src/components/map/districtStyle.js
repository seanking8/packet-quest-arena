// Colour and size helpers shared by the District 3D scenes (gameplay + tutorial).
// Extracted from the scene components so their render functions stay flat and
// readable instead of carrying deep ternary chains. Behaviour is identical to
// the inline logic that used to live in each scene; the tutorial passes a few
// extra options to make broken links stand out.
import { nodeColor, linkColor } from './colors'

/** Node colour by its current route role, falling back to its type colour. */
export function districtNodeColor(node, { isSource, isDest, isSuggestedNext, isValidNext, inPath }) {
  if (isSource) return '#36c98d'
  if (isDest) return '#ff4f9a'
  if (isSuggestedNext) return '#b8f7ff'
  if (isValidNext) return '#66e6ff'
  if (inPath) return '#ffd479'
  return nodeColor(node)
}

/** Label role tag for a node, or null when it has no special role. */
export function nodeRouteRole({ isSource, isDest, isCurrent, isSuggestedNext, isValidNext }) {
  if (isSource) return 'start'
  if (isDest) return 'dest'
  if (isCurrent) return 'current'
  if (isSuggestedNext) return 'suggested'
  if (isValidNext) return 'next'
  return null
}

/** Radius by node type; satellites use a caller-supplied value. */
export function nodeTypeRadius(type, satelliteRadius) {
  if (type === 'SATELLITE') return satelliteRadius
  if (type === 'DATA_CENTRE' || type === 'CORE') return 8
  return 5
}

/** Emissive intensity for the node body material. */
export function nodeEmissiveIntensity(active, degraded, failed) {
  if (active) return 0.55
  if (degraded) return 0.35
  if (failed) return 0.04
  return 0.18
}

/** Body opacity for the node material. */
export function nodeMaterialOpacity(failed, dimmed) {
  if (failed) return 0.55
  if (dimmed) return 0.38
  return 1
}

/** Opacity for the status halo ring. */
export function haloOpacity(dimmed, active) {
  if (dimmed) return 0.12
  if (active) return 0.9
  return 0.38
}

/** Link colour. Pass brokenColor to make broken links jump out (tutorial). */
export function linkStrokeColor({ broken, inRoute, isValidNext, isSuggested, link, brokenColor }) {
  if (broken && brokenColor) return brokenColor
  if (inRoute) return '#ffd479'
  if (isValidNext) return '#66e6ff'
  if (isSuggested) return '#b8f7ff'
  return linkColor(link)
}

/** Link width. Pass brokenWidth to thicken broken links (tutorial). */
export function linkStrokeWidth({ broken, inRoute, isValidNext, isSuggested, status, isGround, brokenWidth }) {
  if (broken && brokenWidth) return brokenWidth
  if (inRoute) return 5.2
  if (isValidNext) return 4.5
  if (isSuggested) return 3.4
  if (status === 'OVERLOADED' || status === 'CONGESTED') return 3.8
  if (isGround) return 2.4
  return 1.8
}

/** Link opacity. brokenHighPriority lifts broken above route styling (tutorial). */
export function linkStrokeOpacity({
  dimmed,
  broken,
  inRoute,
  isValidNext,
  isSuggested,
  isGround,
  brokenOpacity = 0.48,
  brokenHighPriority = false,
}) {
  if (dimmed) return 0.2
  if (broken && brokenHighPriority) return brokenOpacity
  if (inRoute) return 1
  if (isValidNext) return 0.96
  if (isSuggested) return 0.62
  if (broken && !brokenHighPriority) return brokenOpacity
  if (isGround) return 0.92
  return 0.78
}

/** Opacity for the clickable mid-link handle. */
export function linkHandleOpacity(dimmed, isValidNext) {
  if (dimmed) return 0.04
  if (isValidNext) return 0.28
  return 0.16
}

/** Building base colour, respecting an explicit obj.color override. */
export function buildingColor(obj, construction, tall) {
  if (obj.color) return obj.color
  if (construction) return '#b77e36'
  if (tall) return '#636b78'
  return '#56616a'
}

/** Building face opacity. */
export function buildingOpacity(decorative, tall) {
  if (decorative) return 0.9
  if (tall) return 0.82
  return 0.88
}
