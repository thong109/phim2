"""Use outlined Vietnamese glyphs so SVG-to-Canvas never shifts diacritics."""
import argparse,copy,html,re,unicodedata,xml.etree.ElementTree as ET
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)

def outline(file,font_path,size=None):
    file=Path(file);backup=file.with_suffix('.font-source.svg')
    if not backup.exists():backup.write_bytes(file.read_bytes())
    root=ET.fromstring(backup.read_text(encoding='utf-8-sig'))
    font=TTFont(font_path);glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
    count=0
    def walk(parent,styles):
        nonlocal count
        styles={**styles,**parent.attrib}
        for node in list(parent):
            if node.tag!=f'{{{NS}}}text':walk(node,styles);continue
            value=unicodedata.normalize('NFC',''.join(node.itertext()))
            if list(node):raise ValueError('Nested SVG text needs explicit layout.')
            missing=[c for c in value if ord(c) not in cmap]
            if missing:raise ValueError('Font lacks glyphs: '+repr(missing))
            px=float(size or node.get('font-size') or styles.get('font-size','30'))
            x=float(node.get('x','0'));y=float(node.get('y','0'));scale=px/units
            group=ET.Element(f'{{{NS}}}g',{'transform':f'translate({x:g} {y:g}) scale({scale:g} {-scale:g})','aria-label':value})
            for attr in ['fill','opacity','stroke']:
                if node.get(attr):group.set(attr,node.get(attr))
            title=ET.SubElement(group,f'{{{NS}}}title');title.text=value
            advance=0
            for char in value:
                name=cmap[ord(char)];pen=SVGPathPen(glyphs);glyphs[name].draw(pen);commands=pen.getCommands()
                if commands:ET.SubElement(group,f'{{{NS}}}path',{'d':commands,'transform':f'translate({advance} 0)'})
                advance+=font['hmtx'][name][0]
            index=list(parent).index(node);parent.remove(node);parent.insert(index,group);count+=1
    walk(root,{})
    file.write_text(ET.tostring(root,encoding='unicode'),encoding='utf-8')
    return count

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('files',nargs='+');p.add_argument('--font',default='C:/Windows/Fonts/segoeui.ttf');p.add_argument('--size',type=float)
    args=p.parse_args()
    for file in args.files:print(f'{Path(file).name}: {outline(file,args.font,args.size)} text lines outlined')
