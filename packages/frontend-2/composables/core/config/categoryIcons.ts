import type { FunctionalComponent } from 'vue'

interface SVGProps {
  class?: string
}

// Helper for paths
const createIcon = (paths: string[]): FunctionalComponent<SVGProps> => {
  return (props: SVGProps) =>
    h(
      'svg',
      {
        width: '16',
        height: '16',
        viewBox: '0 0 16 16',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        class: props.class
      },
      paths.map((path) =>
        h('path', {
          d: path,
          stroke: 'currentColor',
          'stroke-width': '0.75',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        })
      )
    )
}

export const UncategorizedIcon = createIcon([
  'M6.5 12.3V9.3C6.5 9.3 10.9 9.3 10.9 5.8C10.9 2.9 9.9 1.4 6.5 1.4C2.9 1.4 2.9 5.1 2.9 5.1M6.5 14.5V15.2' // Scaled and centered
])

export const WallIcon = createIcon([
  'M2 4.5L9 2M2 4.5V11M2 4.5L1 3.5M9 2V8.5L2 11M9 2L8 1L1 3.5M2 11L1 10V3.5'
])

export const FloorIcon = createIcon([
  'M2.5 3L4.5 4.5L1 6.5M2.5 3L6.5 1L11.5 4.5M2.5 3V4L3.73199 4.93886M4 8.5L11.5 4.5M4 8.5L1 6.5M4 8.5V9.5M11.5 4.5V5.5L4 9.5M1 6.5V7.5L4 9.5'
])

export const BuildingIcon = createIcon([
  // Main building shape
  'M13 6.5V10.2667C13 10.7971 12.7893 11.3058 12.4142 11.6809C12.0391 12.056 11.5304 12.2667 11 12.2667H5C4.46957 12.2667 3.96086 12.056 3.58579 11.6809C3.21071 11.3058 3 10.7971 3 10.2667V6.5',
  // Roof shape
  'M14 6.86322L13 6.19656L9 3.52989L8.36667 3.10989C8.25781 3.03821 8.13034 3 8 3C7.86966 3 7.74219 3.03821 7.63333 3.10989L7 3.52989L3 6.19656L2 6.86322',
  // Windows and doors
  'M5 12V8M9 10V8M5 8H7M9 8H11M9 10H11M7 12V8M11 10V8'
])

export const WindowIcon = createIcon([
  'M11 13V6M11 13H7M11 13H12M11 6V3H3V13M11 6H3M7 13H3M7 13V3M3 13H2'
])

export const DoorIcon = createIcon(['M4.8 8.5H5.8M10 14V7.33333V3H3V14H7H10Z'])

export const StructuralFramingIcon = createIcon([
  'M3.83482 9.55655V11.4315M12.375 5.87498L13.8348 6.84821L4.45982 11.8482L3 10.875L3.58594 10.5625M13.1049 6.36159V5.36251M4.45982 9.97322L13.8348 4.97323L12.375 4L3 9.00001L4.45982 9.97322Z'
])

export const DuctIcon = createIcon([
  'M2 4.7L2 9.3L4.7 9.3L4.7 7.3L15.3 7.3L15.3 4.7L12.7 4.7L12.7 1.3L10.7 1.3L10.7 4.7L8.7 4.7L8.7 1.3L6.7 1.3L6.7 4.7L2 4.7Z'
])

export const PipeIcon = createIcon([
  'M2.4 13L3.9 13L3.9 10.9L10.8 10.9M13.9 14.5L10.8 14.5L10.8 10.9M10.8 10.9L10.8 5.8L12.6 5.8L12.6 3.6L12.6 1.5M8.9 10.9L8.9 4.4L10.4 4.4L10.4 1.5'
])

export const CableTrayIcon = createIcon([
  'M1.6 12L7.9 12L7.9 6.4L9.6 6.4L9.6 1.6M1.6 10.4L6.4 10.4L6.4 4.8L7.9 4.8L7.9 1.6M1.6 13.6L9.6 13.6L9.6 8L14.4 8'
])

export const ConduitIcon = createIcon([
  'M1.6 12L5.6 12C5.6 12 8.6 12.4 9.6 10.4C10.4 8.8 9.0 8.6 9.6 6.4C10.4 3.2 13.6 1.6 13.6 1.6M1.6 10.4C1.6 10.4 1.9 10.4 3.2 10.4C4.5 10.4 6.4 9.6 7.2 8.8C7.6 8.4 7.9 6 7.9 4.8C7.9 3.6 7.9 2.8 7.9 1.6M1.6 13.6C1.6 13.6 5.6 13.6 7.2 13.6C8.8 13.6 12.8 12.8 12 8.8C11.2 4.8 14.4 4 14.4 4'
])

export const categoryIconMapping: Record<string, FunctionalComponent<SVGProps>> = {
  Uncategorized: UncategorizedIcon,
  Walls: WallIcon,
  Floors: FloorIcon,
  'Structural Framing': StructuralFramingIcon,
  Building: BuildingIcon,
  Windows: WindowIcon,
  Doors: DoorIcon,
  Ducts: DuctIcon,
  Pipes: PipeIcon,
  'Cable Trays': CableTrayIcon,
  Conduits: ConduitIcon
  // Add more mappings as you create icons
}

// Default icon for categories without specific icons
export const DefaultIcon = createIcon(['M2 2H10M2 2V10M2 2L10 10M10 2V10M10 10H2'])

// Helper function to get icon for a category
export function getCategoryIcon(category: string): FunctionalComponent<SVGProps> {
  return categoryIconMapping[category] || DefaultIcon
}
