from pathlib import Path
from io import BytesIO
from xml.sax.saxutils import escape

from docx import Document
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph as DocxParagraph
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
MANUALS = ROOT / "client-manuals"
NAVY = colors.HexColor("#0B2545")
BLUE = colors.HexColor("#2E74B5")
MUTED = colors.HexColor("#5A6473")
LIGHT = colors.HexColor("#E8EEF5")


def block_items(parent):
    body = parent.element.body
    for child in body.iterchildren():
        if child.tag.endswith("}p"):
            yield DocxParagraph(child, parent)
        elif child.tag.endswith("}tbl"):
            yield DocxTable(child, parent)


def has_page_break(paragraph):
    return bool(paragraph._p.xpath('.//w:br[@w:type="page"]'))


def paragraph_images(paragraph):
    images = []
    for blip in paragraph._p.xpath('.//a:blip'):
        relation_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
        if relation_id and relation_id in paragraph.part.related_parts:
            images.append(paragraph.part.related_parts[relation_id].blob)
    return images


def styles():
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=10.5, leading=14, textColor=colors.black, spaceAfter=6),
        "kicker": ParagraphStyle("Kicker", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=BLUE, spaceBefore=55, spaceAfter=12),
        "cover": ParagraphStyle("Cover", parent=base["Title"], fontName="Helvetica-Bold", fontSize=25, leading=30, textColor=NAVY, alignment=TA_LEFT, spaceAfter=10),
        "subtitle": ParagraphStyle("Subtitle", parent=base["BodyText"], fontName="Helvetica", fontSize=13, leading=18, textColor=MUTED, spaceAfter=24),
        "h1": ParagraphStyle("H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLUE, spaceBefore=16, spaceAfter=9, keepWithNext=True),
        "h2": ParagraphStyle("H2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=BLUE, spaceBefore=12, spaceAfter=7, keepWithNext=True),
        "h3": ParagraphStyle("H3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=NAVY, spaceBefore=9, spaceAfter=5, keepWithNext=True),
        "bullet": ParagraphStyle("Bullet", parent=base["BodyText"], fontName="Helvetica", fontSize=10.5, leading=14, leftIndent=18, firstLineIndent=-10, spaceAfter=5),
        "number": ParagraphStyle("Number", parent=base["BodyText"], fontName="Helvetica", fontSize=10.5, leading=14, leftIndent=18, firstLineIndent=-14, spaceAfter=6),
        "cell": ParagraphStyle("Cell", parent=base["BodyText"], fontName="Helvetica", fontSize=9, leading=12, textColor=colors.black),
        "cellhead": ParagraphStyle("CellHead", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=NAVY),
    }


def rich_text(paragraph):
    parts = []
    for run in paragraph.runs:
        value = escape(run.text).replace("\n", "<br/>")
        if not value:
            continue
        if run.bold:
            value = f"<b>{value}</b>"
        if run.italic:
            value = f"<i>{value}</i>"
        parts.append(value)
    return "".join(parts) or escape(paragraph.text)


def footer(canvas, document, short_title):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(inch, 0.52 * inch, short_title)
    canvas.drawRightString(7.5 * inch, 0.52 * inch, f"Page {document.page}")
    canvas.restoreState()


def build(docx_path, pdf_path, short_title):
    source = Document(docx_path)
    token = styles()
    story = []
    list_number = 0
    cover_title = docx_path.stem.replace("_", " ")

    for block in block_items(source):
        if isinstance(block, DocxTable):
            data = []
            for row_index, row in enumerate(block.rows):
                cells = []
                for col_index, cell in enumerate(row.cells):
                    cell_text = "<br/>".join(escape(p.text) for p in cell.paragraphs if p.text)
                    cell_style = token["cellhead"] if col_index == 0 or (len(block.columns) == 4 and row_index == 0) else token["cell"]
                    cells.append(Paragraph(cell_text, cell_style))
                data.append(cells)
            if not data:
                continue
            widths = [6.5 * inch / len(data[0])] * len(data[0])
            table = Table(data, colWidths=widths, repeatRows=0, hAlign="LEFT")
            commands = [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#AAB4C2")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
            if len(data[0]) == 2:
                commands.append(("BACKGROUND", (0, 0), (0, -1), LIGHT))
                widths = [1.8 * inch, 4.7 * inch]
                table._argW = widths
            else:
                commands.append(("BACKGROUND", (0, 0), (-1, -1), LIGHT))
            table.setStyle(TableStyle(commands))
            story.extend([table, Spacer(1, 10)])
            list_number = 0
            continue

        text = block.text.strip()
        images = paragraph_images(block)
        if images:
            for blob in images:
                visual = Image(BytesIO(blob))
                visual._restrictSize(6.35 * inch, 7.2 * inch)
                visual.hAlign = "CENTER"
                story.extend([visual, Spacer(1, 5)])
            continue
        if has_page_break(block):
            story.append(PageBreak())
            list_number = 0
            continue
        if not text:
            story.append(Spacer(1, 4))
            continue

        name = block.style.name if block.style else "Normal"
        markup = rich_text(block)
        if text == "CLIENT OPERATIONS GUIDE":
            style = token["kicker"]
        elif text == cover_title:
            style = token["cover"]
        elif "Simple installation" in text or "Generic Ubuntu VPS" in text or "One-click setup" in text:
            style = token["subtitle"]
        elif name == "Heading 1":
            list_number = 0
            style = token["h1"]
        elif name == "Heading 2":
            list_number = 0
            style = token["h2"]
        elif name == "Heading 3":
            list_number = 0
            style = token["h3"]
        elif name == "List Bullet":
            style = token["bullet"]
            markup = f"&bull;&nbsp;&nbsp;{markup}"
        elif name == "List Number":
            list_number += 1
            style = token["number"]
            markup = f"{list_number}.&nbsp;&nbsp;{markup}"
        else:
            style = token["body"]
            list_number = 0
        story.append(Paragraph(markup, style))

    pdf = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        leftMargin=inch,
        rightMargin=inch,
        topMargin=0.8 * inch,
        bottomMargin=0.78 * inch,
        title=cover_title,
        author="Smart Clinic Project",
    )
    pdf.build(story, onFirstPage=lambda c, d: footer(c, d, short_title), onLaterPages=lambda c, d: footer(c, d, short_title))


if __name__ == "__main__":
    build(
        MANUALS / "Clinic_Computer_and_Local_Network_Manual.docx",
        MANUALS / "Clinic_Computer_and_Local_Network_Manual.pdf",
        "Clinic Computer and Local Network Manual",
    )
    build(
        MANUALS / "Online_Server_Deployment_Manual.docx",
        MANUALS / "Online_Server_Deployment_Manual.pdf",
        "Online Server Deployment Manual",
    )
    build(
        MANUALS / "Client_Evaluation_and_Guided_Tour_Manual.docx",
        MANUALS / "Client_Evaluation_and_Guided_Tour_Manual.pdf",
        "Client Evaluation and Guided Tour Manual",
    )
    print("Created matching PDF manuals")
