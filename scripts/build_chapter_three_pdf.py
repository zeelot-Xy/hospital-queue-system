from pathlib import Path
from io import BytesIO
from xml.sax.saxutils import escape

from docx import Document
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph as DocxParagraph
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "joe documentation" / "CHAPTER THREE - RESEARCH METHODOLOGY AND SYSTEM DESIGN.docx"
PDF = ROOT / "joe documentation" / "CHAPTER THREE - RESEARCH METHODOLOGY AND SYSTEM DESIGN.pdf"


def blocks(parent):
    for child in parent.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield DocxParagraph(child, parent)
        elif child.tag.endswith("}tbl"):
            yield DocxTable(child, parent)


def images(paragraph):
    for blip in paragraph._p.xpath(".//a:blip"):
        rid = blip.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
        if rid and rid in paragraph.part.related_parts:
            yield paragraph.part.related_parts[rid].blob


def has_page_break(p):
    return bool(p._p.xpath('.//w:br[@w:type="page"]'))


def styles():
    base=getSampleStyleSheet()
    return {
        "body":ParagraphStyle("Body",parent=base["BodyText"],fontName="Times-Roman",fontSize=12,leading=18,alignment=TA_JUSTIFY,firstLineIndent=.5*inch,spaceAfter=0),
        "number":ParagraphStyle("Number",parent=base["BodyText"],fontName="Times-Roman",fontSize=12,leading=18,alignment=TA_JUSTIFY,leftIndent=.3*inch,firstLineIndent=-.3*inch,spaceAfter=0),
        "h1":ParagraphStyle("H1",parent=base["Heading1"],fontName="Times-Bold",fontSize=12,leading=18,alignment=TA_CENTER,spaceAfter=0,keepWithNext=True),
        "h2":ParagraphStyle("H2",parent=base["Heading2"],fontName="Times-Bold",fontSize=12,leading=18,alignment=TA_LEFT,spaceAfter=0,keepWithNext=True),
        "h2c":ParagraphStyle("H2C",parent=base["Heading2"],fontName="Times-Bold",fontSize=12,leading=18,alignment=TA_CENTER,spaceAfter=0,keepWithNext=True),
        "h3":ParagraphStyle("H3",parent=base["Heading3"],fontName="Times-Bold",fontSize=12,leading=18,alignment=TA_LEFT,spaceAfter=0,keepWithNext=True),
        "caption":ParagraphStyle("Caption",parent=base["BodyText"],fontName="Times-Italic",fontSize=10.5,leading=13,alignment=TA_CENTER,spaceAfter=6,keepWithNext=True),
        "tabletitle":ParagraphStyle("TableTitle",parent=base["BodyText"],fontName="Times-Bold",fontSize=10.5,leading=13,alignment=TA_LEFT,spaceBefore=6,spaceAfter=3,keepWithNext=True),
        "ref":ParagraphStyle("Ref",parent=base["BodyText"],fontName="Times-Roman",fontSize=12,leading=18,alignment=TA_LEFT,leftIndent=.5*inch,firstLineIndent=-.5*inch,spaceAfter=0),
        "cell":ParagraphStyle("Cell",parent=base["BodyText"],fontName="Times-Roman",fontSize=8.2,leading=10.2,alignment=TA_LEFT),
        "cellh":ParagraphStyle("CellH",parent=base["BodyText"],fontName="Times-Bold",fontSize=8.2,leading=10.2,alignment=TA_LEFT),
    }


def rich(p):
    parts=[]
    for run in p.runs:
        val=escape(run.text).replace("\n","<br/>")
        if not val: continue
        if run.bold: val=f"<b>{val}</b>"
        if run.italic: val=f"<i>{val}</i>"
        parts.append(val)
    return "".join(parts) or escape(p.text)


def footer(canvas, doc):
    canvas.saveState(); canvas.setFont("Times-Roman",9); canvas.setFillColor(colors.HexColor("#4B5563"))
    canvas.drawCentredString(A4[0]/2, .48*inch, str(doc.page)); canvas.restoreState()


def build():
    src=Document(DOCX); st=styles(); story=[]; refs=False; pending_images=[]
    for block in blocks(src):
        if isinstance(block,DocxTable):
            if pending_images:
                story.extend(pending_images); pending_images=[]
            data=[]
            for ri,row in enumerate(block.rows):
                data.append([Paragraph("<br/>".join(escape(p.text) for p in cell.paragraphs if p.text),st["cellh" if ri==0 else "cell"]) for cell in row.cells])
            if not data: continue
            n=len(data[0]); usable=A4[0]-2.25*inch
            ratios={2:[.31,.69],3:[.15,.43,.42],4:[.21,.29,.30,.20]}.get(n,[1/n]*n)
            t=Table(data,colWidths=[usable*r for r in ratios],repeatRows=1,hAlign="LEFT")
            t.setStyle(TableStyle([("GRID",(0,0),(-1,-1),.5,colors.HexColor("#718096")),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#D9EAF4")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
            story.extend([t,Spacer(1,6)]); continue
        imgs=list(images(block))
        if imgs:
            for blob in imgs:
                im=Image(BytesIO(blob)); im._restrictSize(A4[0]-2.25*inch,6.3*inch); im.hAlign="CENTER"; pending_images.append(im)
            continue
        if has_page_break(block):
            if pending_images:
                story.extend(pending_images); pending_images=[]
            story.append(PageBreak()); refs=True; continue
        text=block.text.strip()
        if not text: continue
        name=block.style.name if block.style else "Normal"
        markup=rich(block)
        if name=="Heading 1": style=st["h1"]
        elif name=="Heading 2": style=st["h2c"] if text=="RESEARCH METHODOLOGY AND SYSTEM DESIGN" else st["h2"]
        elif name=="Heading 3": style=st["h3"]
        elif text.startswith("Figure 3."):
            caption=Paragraph(markup,st["caption"])
            if pending_images:
                # A one-column table is indivisible, so a figure cannot be stranded
                # on one page while its caption starts the next page.
                figure_block = Table([[item] for item in pending_images] + [[caption]],
                                     colWidths=[A4[0] - 2.25 * inch], hAlign="CENTER")
                figure_block.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]))
                story.append(figure_block); pending_images=[]
            else:
                story.append(caption)
            continue
        elif text.startswith("Table 3."):
            style=st["tabletitle"]
        elif refs: style=st["ref"]
        elif text[:2].rstrip(".").isdigit() and text[1:3]==". ": style=st["number"]
        else: style=st["body"]
        if pending_images:
            story.extend(pending_images); pending_images=[]
        story.append(Paragraph(markup,style))
    if pending_images:
        story.extend(pending_images)
    pdf=SimpleDocTemplate(str(PDF),pagesize=A4,leftMargin=1.25*inch,rightMargin=inch,topMargin=inch,bottomMargin=.78*inch,title="Chapter Three - Research Methodology and System Design",author="Smart Clinic Project")
    pdf.build(story,onFirstPage=footer,onLaterPages=footer)
    print(f"Created {PDF}")


if __name__=="__main__": build()
