import { mode } from '@chakra-ui/theme-tools'

export const AlertStyle = {
  parts: ['container', 'description'],
  // Styles for the base style
  baseStyle: {},
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    'update-box': (props: Record<string, any>) => ({
      container: {
        bg: mode('white', 'gray.700')(props),
        color: mode('black', 'white')(props),
        boxShadow: mode('md', 'dark-bg')(props)
      }
    })
  },
  // The default `size` or `variant` values
  defaultProps: {}
}
