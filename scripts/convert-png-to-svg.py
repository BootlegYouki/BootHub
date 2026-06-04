import os
import sys
from PIL import Image

def vectorize_png(img_path, svg_path, component_path=None, threshold=40, trace_dark=False):
    if not os.path.exists(img_path):
        print(f"Error: Source image not found at {img_path}")
        return False
        
    print(f"Loading image {img_path} (tracing {'dark' if trace_dark else 'light'} pixels)...")
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    
    rects = []
    
    for y in range(height):
        in_segment = False
        start_x = 0
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            # Foreground check: check if it's transparent and matches color threshold
            if trace_dark:
                is_foreground = (r + g + b < threshold) and (a > 30)
            else:
                is_foreground = (r + g + b > threshold) and (a > 30)
            
            if is_foreground:
                if not in_segment:
                    in_segment = True
                    start_x = x
            else:
                if in_segment:
                    rects.append((start_x, y, x - start_x, 1))
                    in_segment = False
        if in_segment:
            rects.append((start_x, y, width - start_x, 1))
            
    # Write SVG
    print(f"Writing SVG to {svg_path}...")
    os.makedirs(os.path.dirname(svg_path), exist_ok=True)
    with open(svg_path, 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">\n')
        f.write('  <g fill="currentColor">\n')
        for rx, ry, rw, rh in rects:
            f.write(f'    <rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" />\n')
        f.write('  </g>\n')
        f.write('</svg>\n')
    print(f"Generated SVG with {len(rects)} optimized rectangles.")
    
    # Write React Native Component if requested
    if component_path:
        print(f"Writing React Native SVG Component to {component_path}...")
        os.makedirs(os.path.dirname(component_path), exist_ok=True)
        
        # Capitalize the component name based on filename
        component_name = "IconSvg" if "icon" in component_path.lower() else "BannerSvg"
        
        component_lines = [
            "import React from 'react';",
            "import Svg, { G, Rect, SvgProps } from 'react-native-svg';",
            "",
            f"export const {component_name}: React.FC<SvgProps & {{ color?: string }}> = ({{ color, ...props }}) => {{",
            "  return (",
            f"    <Svg viewBox=\"0 0 {width} {height}\" width={{props.width || \"100%\"}} height={{props.height || \"100%\"}} {{...props}}>",
            "      <G fill={color || 'currentColor'}>",
        ]
        
        for rx, ry, rw, rh in rects:
            component_lines.append(f"        <Rect x=\"{rx}\" y=\"{ry}\" width=\"{rw}\" height=\"{rh}\" />")
            
        component_lines.extend([
            "      </G>",
            "    </Svg>",
            "  );",
            "};",
        ])
        
        with open(component_path, 'w') as f:
            f.write("\n".join(component_lines) + "\n")
        print(f"Successfully generated React component {component_name}.")
        
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert-png-to-svg.py <input_png> <output_svg> [output_tsx] [threshold] [dark]")
        print("Example: python convert-png-to-svg.py assets/icon.png assets/icon.svg src/components/icon-svg.tsx 200 dark")
        sys.exit(1)
        
    in_png = sys.argv[1]
    out_svg = sys.argv[2]
    out_tsx = None
    threshold = 40
    trace_dark = False
    
    # Parse remaining arguments
    for arg in sys.argv[3:]:
        if arg.endswith('.tsx'):
            out_tsx = arg
        elif arg.isdigit():
            threshold = int(arg)
        elif arg in ['dark', '--dark']:
            trace_dark = True
            
    vectorize_png(in_png, out_svg, out_tsx, threshold, trace_dark)
