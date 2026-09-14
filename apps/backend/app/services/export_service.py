"""Servicio de exportacion (Fase A): construye PDF/Excel fuera del router.

Movido verbatim desde routers/records.py. Limite de escala para evitar
DoS de memoria (20 años = mismo MAX de validacion).
"""

import io
from pathlib import Path

from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.export.filenames import export_filename
from app.models.attachment import Attachment
from app.models.cell import Cell
from app.models.record import Record
from app.models.record_row import RecordRow

MAX_EXPORT_YEARS = 20

TXT_STRINGS = {
    "en": {
        "months": ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
        "number": "No.",
        "company": "Company",
        "assignee": "Assignee",
        "notes": "Notes",
        "sheet": "Review",
        "untitled": "Untitled review",
        "companies": "Companies",
        "file": "review",
    },
    "es": {
        "months": ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
        "number": "N.º",
        "company": "Empresa",
        "assignee": "Responsable",
        "notes": "Observaciones",
        "sheet": "Revisión",
        "untitled": "Revisión sin título",
        "companies": "Empresas",
        "file": "revision",
    },
}


def strings(lang: str) -> dict:
    return TXT_STRINGS["en" if lang == "en" else "es"]


def years_for(record: Record) -> list[int]:
    return list(range(record.period_start, record.period_end + 1))


def build_excel(
    record: Record, rows: list[RecordRow], cells: list[Cell], txt: dict
) -> StreamingResponse:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

    cmap = {(c.row_id, c.year, c.month): c for c in cells}
    wb = Workbook()
    ws = wb.active
    assert ws is not None
    ws.title = txt["sheet"]
    header_fill = PatternFill(start_color="6366F1", end_color="6366F1", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=9)
    thin = Side(style="thin", color="E2E8F0")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    years = years_for(record)
    months = txt["months"]
    ws.merge_cells(start_row=1, start_column=1, end_row=2, end_column=1)
    ws.merge_cells(start_row=1, start_column=2, end_row=2, end_column=2)
    ws.cell(row=1, column=1, value=txt["number"]).font = header_font
    ws.cell(row=1, column=1).fill = header_fill
    ws.cell(row=1, column=1).alignment = Alignment(horizontal="center", vertical="center")
    ws.cell(row=1, column=2, value=txt["company"]).font = header_font
    ws.cell(row=1, column=2).fill = header_fill
    ws.cell(row=1, column=2).alignment = Alignment(horizontal="center", vertical="center")
    col = 3
    for y in years:
        ws.merge_cells(start_row=1, start_column=col, end_row=1, end_column=col + 11)
        c = ws.cell(row=1, column=col, value=str(y))
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center")
        col += 12
    col = 3
    for _ in years:
        for m in months:
            c = ws.cell(row=2, column=col, value=m)
            c.font = header_font
            c.fill = header_fill
            c.alignment = Alignment(horizontal="center")
            col += 1
    for hdr in (txt["assignee"], txt["notes"]):
        ws.merge_cells(start_row=1, start_column=col, end_row=2, end_column=col)
        c = ws.cell(row=1, column=col, value=hdr)
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center", vertical="center")
        col += 1
    r = 3
    for idx, row in enumerate(rows, 1):
        ws.cell(row=r, column=1, value=idx).alignment = Alignment(horizontal="center")
        ws.cell(row=r, column=2, value=row.name_snapshot)
        col = 3
        for y in years:
            for m_idx in range(1, 13):
                c = cmap.get((row.id, y, m_idx))
                v = "☑" if c and c.reviewed else "☐"
                cell = ws.cell(row=r, column=col, value=v)
                cell.alignment = Alignment(horizontal="center")
                if c and c.reviewed:
                    colr = (c.color or "6366F1").lstrip("#")
                    cell.font = Font(color=colr)
                    # style bold
                    if c.style and c.style.get("bold"):
                        cell.font = Font(color=colr, bold=True)
                col += 1
        ws.cell(row=r, column=col, value=row.assignee or "")
        ws.cell(row=r, column=col + 1, value=row.note or "")
        col += 2
        r += 1
    for row in ws.iter_rows(min_row=1, max_row=r - 1, max_col=col - 1):
        for cell in row:
            cell.border = border
    ws.freeze_panes = "C3"
    if ws.sheet_properties.pageSetUpPr is not None:
        ws.sheet_properties.pageSetUpPr.fitToPage = True
    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": (f"attachment; filename={export_filename(record.title, 'xlsx')}")
        },
    )


def build_pdf(
    db: Session, record: Record, rows: list[RecordRow], cells: list[Cell], txt: dict
) -> StreamingResponse:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    cmap = {(c.row_id, c.year, c.month): c for c in cells}
    bio = io.BytesIO()
    doc = SimpleDocTemplate(
        bio,
        pagesize=landscape(A4),
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm,
    )
    styles = getSampleStyleSheet()
    story = []
    doc_title = (
        f"{record.title or txt['untitled']} — "
        f"{record.period_start}-{record.period_end} | "
        f"{len(rows)} {txt['companies']}"
    )
    story.append(
        Paragraph(
            doc_title,
            styles["Title"],
        )
    )
    story.append(Spacer(1, 6))
    years = years_for(record)
    months = txt["months"]
    flat_header = [txt["number"], txt["company"]]
    for y in years:
        for m in months:
            flat_header.append(f"{y}-{m}")
    flat_header += [txt["assignee"], txt["notes"]]
    table_data = [flat_header]
    for idx, row in enumerate(rows, 1):
        entry = [str(idx), row.name_snapshot]
        for y in years:
            for m_idx in range(1, 13):
                c = cmap.get((row.id, y, m_idx))
                entry.append("☑" if c and c.reviewed else "☐")
        entry += [row.assignee or "", row.note or ""]
        table_data.append(entry)
    n_meses = len(flat_header) - 4
    col_widths = [12 * mm, 30 * mm] + [8 * mm] * n_meses + [20 * mm, 28 * mm]
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, 0), 6),
            ("FONTSIZE", (0, 1), (-1, -1), 5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]
    )
    t.setStyle(style)
    story.append(t)
    # Adjuntos de imagen como miniaturas al final del PDF.
    from reportlab.platypus import Image as _RLImage

    for att in db.query(Attachment).filter(Attachment.record_id == record.id).all():
        if not att.mime.startswith("image/"):
            continue
        for ext in (".jpg", ".png", ".webp"):
            p = Path(settings.attach_path) / record.id / f"{att.hash}{ext}"
            if not p.exists():
                continue
            try:
                from PIL import Image as _PILImage

                with _PILImage.open(p) as im:
                    im.verify()
                with _PILImage.open(p) as im:
                    w, h = im.size
                side = 30 * mm
                scale = side / max(w, h)
                story.append(Spacer(1, 6))
                story.append(_RLImage(str(p), width=w * scale, height=h * scale))
            except Exception:
                pass
            break
    doc.build(story)
    bio.seek(0)
    return StreamingResponse(
        bio,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (f"attachment; filename={export_filename(record.title, 'pdf')}")
        },
    )
