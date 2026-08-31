# -*- coding: utf-8 -*-
"""
Gera docs/security-audit/relatorio-auditoria-seguranca.pdf a partir de
findings_data.py. Roda dentro do venv local (docs/security-audit/venv) --
sem instalacao global. Re-execute apos editar findings_data.py para
regenerar o relatorio.

Uso:
    ./venv/Scripts/python.exe generate_report.py
"""
import io
import os
import re
import textwrap
from collections import Counter, defaultdict
from datetime import date

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, KeepTogether, HRFlowable, Preformatted,
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from findings_data import (
    COLORS, SEV_ORDER, SEV_LABEL, CATEGORIES, FINDINGS, STRENGTHS, RECOMMENDATIONS,
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PDF = os.path.join(HERE, "relatorio-auditoria-seguranca.pdf")
REPORT_NAME = "Relatório de Auditoria de Segurança — psicoSAAS (UseCognia)"
TODAY = date(2026, 8, 31).strftime("%d/%m/%Y")

INK = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#F3F4F6")
BORDER = colors.HexColor("#E5E7EB")
SAGE = colors.HexColor("#0F766E")

# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("CoverTitle", fontName="Helvetica-Bold", fontSize=26, leading=32, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle("CoverSub", fontName="Helvetica", fontSize=13, leading=18, textColor=MUTED, spaceAfter=4))
styles.add(ParagraphStyle("H1", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=INK, spaceBefore=6, spaceAfter=10))
styles.add(ParagraphStyle("H2", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=INK, spaceBefore=14, spaceAfter=6))
styles.add(ParagraphStyle("H3", fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=INK, spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle("Body", fontName="Helvetica", fontSize=9.3, leading=13.2, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=5))
styles.add(ParagraphStyle("BodySmall", fontName="Helvetica", fontSize=8.3, leading=11.5, textColor=MUTED, alignment=TA_JUSTIFY))
styles.add(ParagraphStyle("Cell", fontName="Helvetica", fontSize=8, leading=10.5, textColor=INK))
styles.add(ParagraphStyle("CellBold", fontName="Helvetica-Bold", fontSize=8, leading=10.5, textColor=INK))
styles.add(ParagraphStyle("Mono", fontName="Courier", fontSize=7.6, leading=10, textColor=INK, backColor=LIGHT))
styles.add(ParagraphStyle("MetaCover", fontName="Helvetica", fontSize=9.5, leading=15, textColor=INK))
styles.add(ParagraphStyle("IssueTitle", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=INK, spaceBefore=10, spaceAfter=4))
styles.add(ParagraphStyle("IssueMono", fontName="Courier", fontSize=7.6, leading=10.5, textColor=INK, backColor=colors.HexColor("#0B1220"), spaceAfter=2))


def wrap_code(text, width=96):
    out_lines = []
    for cl in text.split("\n"):
        if len(cl) <= width:
            out_lines.append(cl)
        else:
            indent = len(cl) - len(cl.lstrip())
            pad = " " * (indent + 2)
            pieces = textwrap.wrap(cl.strip(), width=width - 2, subsequent_indent=pad,
                                   initial_indent=" " * indent, break_long_words=False)
            out_lines.extend(pieces if pieces else [cl])
    return "\n".join(out_lines)


def esc(s):
    """Escape text that will be embedded inside a reportlab Paragraph (mini-XML)."""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def sev_color(sev):
    return colors.HexColor(COLORS.get(sev, "#6B7280"))


def chip(text, bg_hex):
    return Table(
        [[Paragraph(f'<font color="white"><b>{text}</b></font>', ParagraphStyle("chip", fontName="Helvetica-Bold", fontSize=7.5, textColor=colors.white, alignment=TA_CENTER))]],
        colWidths=[2.15 * cm], rowHeights=[0.48 * cm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg_hex)),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]),
    )


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------
def build_donut_severity():
    counts = Counter(f["severidade"] for f in FINDINGS if f["severidade"] in SEV_ORDER)
    labels = [SEV_LABEL[s] for s in SEV_ORDER if counts.get(s, 0) > 0]
    sizes = [counts[s] for s in SEV_ORDER if counts.get(s, 0) > 0]
    colors_ = [COLORS[s] for s in SEV_ORDER if counts.get(s, 0) > 0]

    fig, ax = plt.subplots(figsize=(4.1, 4.1), dpi=200)
    wedges, _ = ax.pie(sizes, colors=colors_, startangle=90, counterclock=False,
                        wedgeprops=dict(width=0.42, edgecolor="white", linewidth=2))
    ax.set_aspect("equal")
    total = sum(sizes)
    ax.text(0, 0.08, str(total), ha="center", va="center", fontsize=26, fontweight="bold", color="#1F2937")
    ax.text(0, -0.18, "achados", ha="center", va="center", fontsize=10, color="#6B7280")
    legend_labels = [f"{l}  ({c})" for l, c in zip(labels, sizes)]
    ax.legend(wedges, legend_labels, loc="upper center", bbox_to_anchor=(0.5, -0.02),
              ncol=2, frameon=False, fontsize=9)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", transparent=True, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def build_bar_category():
    cat_counts = defaultdict(lambda: Counter())
    for f in FINDINGS:
        cat_counts[f["categoria"]][f["severidade"]] += 1

    cat_ids = sorted(CATEGORIES.keys())
    labels = [f"{cid}. {CATEGORIES[cid]}" for cid in cat_ids]
    labels = ["\n".join(textwrap.wrap(l, 26)) for l in labels]

    fig, ax = plt.subplots(figsize=(7.4, 4.0), dpi=200)
    bottom = [0] * len(cat_ids)
    for sev in SEV_ORDER:
        vals = [cat_counts[cid].get(sev, 0) for cid in cat_ids]
        ax.bar(labels, vals, bottom=bottom, color=COLORS[sev], label=SEV_LABEL[sev], width=0.55)
        bottom = [b + v for b, v in zip(bottom, vals)]

    ax.set_ylabel("Nº de achados", fontsize=9, color="#374151")
    ax.tick_params(axis="x", labelsize=7.3, colors="#374151")
    ax.tick_params(axis="y", labelsize=8, colors="#374151")
    max_total = max(bottom) if bottom else 1
    ax.set_yticks(range(0, max_total + 2))
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color("#D1D5DB")
    ax.spines["bottom"].set_color("#D1D5DB")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.28), ncol=4, frameon=False, fontsize=8.5)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", transparent=True, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


# ---------------------------------------------------------------------------
# Header / footer
# ---------------------------------------------------------------------------
def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, A4[1] - 1.15 * cm, REPORT_NAME)
    canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.15 * cm, TODAY)
    canvas.setStrokeColor(BORDER)
    canvas.line(2 * cm, A4[1] - 1.3 * cm, A4[0] - 2 * cm, A4[1] - 1.3 * cm)

    canvas.line(2 * cm, 1.35 * cm, A4[0] - 2 * cm, 1.35 * cm)
    canvas.drawString(2 * cm, 1.0 * cm, "psicoSAAS / UseCognia — Confidencial")
    canvas.drawRightString(A4[0] - 2 * cm, 1.0 * cm, f"Página {doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#0F766E"))
    canvas.rect(0, A4[1] - 0.9 * cm, A4[0], 0.9 * cm, fill=1, stroke=0)
    canvas.restoreState()


# ---------------------------------------------------------------------------
# Build story
# ---------------------------------------------------------------------------
def para(text, style="Body"):
    return Paragraph(text, styles[style])


def build_cover(story):
    story.append(Spacer(1, 2.6 * cm))
    story.append(para("RELATÓRIO DE AUDITORIA DE SEGURANÇA", "CoverSub"))
    story.append(para("psicoSAAS — UseCognia", "CoverTitle"))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", color=BORDER, thickness=1))
    story.append(Spacer(1, 0.6 * cm))

    meta_rows = [
        ["Data do relatório", TODAY],
        ["Escopo auditado", "Backend (NestJS + TypeORM + PostgreSQL), Frontend (React + Vite), "
                            "configuração de deploy (Docker, Railway, Vercel), CI/CD e histórico git"],
        ["Controllers backend cobertos", "33 de 33 (100% — sem amostragem)"],
        ["Metodologia", "6 auditorias sistemáticas paralelas: 3 lotes de controllers (isolamento de "
                        "tenant + IDOR), 1 auditoria de permissões frontend×backend, 1 auditoria de "
                        "segredos hardcoded (código + configs + histórico git + bundle), 1 auditoria "
                        "de XSS (frontend + templates de e-mail)"],
        ["Critério de achado", "Somente vulnerabilidades verificadas diretamente em código real, com "
                               "arquivo:linha e trecho de evidência — nenhum item especulativo"],
    ]
    tbl = Table(
        [[Paragraph(f"<b>{k}</b>", styles["Cell"]), Paragraph(v, styles["Cell"])] for k, v in meta_rows],
        colWidths=[4.6 * cm, 10.4 * cm],
    )
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.9 * cm))

    story.append(para("Como cada categoria foi mapeada para esta stack", "H3"))
    method_text = (
        "O projeto não usa Supabase/RLS — é um backend NestJS+TypeORM+PostgreSQL com autenticação "
        "Passport JWT. Antes de auditar, o mecanismo de isolamento de dados foi identificado: "
        "<b>não existe filtro automático de banco</b> — cada query precisa incluir manualmente "
        "<font face='Courier'>psychologistId</font>/<font face='Courier'>userId</font> vindo do "
        "usuário autenticado (<font face='Courier'>req.user.id</font>). As 5 categorias pedidas "
        "foram adaptadas assim: <b>(1) Banco sem tranca</b> → ausência desse filtro manual em "
        "queries de listagem/agregação/export; <b>(2) Permissão no navegador</b> → gates de UI "
        "(admin, Pro, etc.) cruzados contra os guards reais do NestJS "
        "(<font face='Courier'>AdminGuard</font>, <font face='Courier'>@RequirePlan</font>, "
        "<font face='Courier'>NoImpersonationGuard</font>) em cada endpoint correspondente; "
        "<b>(3) IDOR</b> → todo handler com <font face='Courier'>:id</font> auditado individualmente "
        "quanto ao cruzamento de posse na query; <b>(4) Chaves expostas</b> → código-fonte, configs "
        "de Docker/Railway/Vercel, CI, histórico git completo e bundle do frontend; <b>(5) XSS</b> → "
        "frontend (sem framework de templating server-side) e templates de e-mail HTML no backend, "
        "onde a saída não é escapada automaticamente pelo React."
    )
    story.append(para(method_text, "Body"))
    story.append(PageBreak())


def severity_summary_table():
    counts = Counter(f["severidade"] for f in FINDINGS)
    rows = [[Paragraph("<b>Severidade</b>", styles["CellBold"]), Paragraph("<b>Qtd.</b>", styles["CellBold"])]]
    data_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i, sev in enumerate(SEV_ORDER, start=1):
        rows.append([chip(SEV_LABEL[sev], COLORS[sev]), Paragraph(str(counts.get(sev, 0)), styles["Cell"])])
    info_count = sum(1 for f in FINDINGS if f["severidade"] == "informativa")
    if info_count:
        rows.append([Paragraph("Informativa", styles["Cell"]), Paragraph(str(info_count), styles["Cell"])])
    tbl = Table(rows, colWidths=[3.6 * cm, 1.6 * cm])
    tbl.setStyle(TableStyle(data_style))
    return tbl


def build_executive_summary(story):
    story.append(para("Resumo executivo", "H1"))

    counts = Counter(f["severidade"] for f in FINDINGS)
    total_scored = sum(counts.get(s, 0) for s in SEV_ORDER)
    n_info = counts.get("informativa", 0)
    n_strengths = len(STRENGTHS)
    summary_text = (
        f"A auditoria cobriu <b>100% dos 33 controllers</b> do backend (sem amostragem), o frontend "
        f"React completo e a configuração de deploy/CI. Foram identificados <b>{total_scored} achados</b> "
        f"verificados em código real: <b>{counts.get('critica',0)} crítico(s)</b>, "
        f"<b>{counts.get('alta',0)} alto(s)</b>, <b>{counts.get('media',0)} médio(s)</b> e "
        f"<b>{counts.get('baixa',0)} baixo(s)</b>"
        + (f", além de <b>{n_info} item informativo</b> (observação de manutenibilidade, sem risco de segurança ativo)" if n_info else "")
        + ". Em contrapartida, foram verificados e confirmados "
        f"<b>{n_strengths} pontos fortes</b> — padrões de segurança já corretamente implementados e "
        f"aplicados de forma consistente em toda a base, evidenciando que o isolamento de tenant e a "
        f"maioria dos guards de permissão estão bem desenhados."
    )
    story.append(para(summary_text, "Body"))

    n_fixed = sum(1 for f in FINDINGS if f.get("status") == "corrigido")
    n_already_ok = sum(1 for f in FINDINGS if f.get("status") == "ja_correto")
    remediation_text = (
        f"<font color='#059669'><b>Status de remediação (31/08/2026):</b></font> todos os "
        f"{total_scored} achados foram tratados no mesmo dia da auditoria — "
        f"<b>{n_fixed} corrigidos</b> diretamente no código"
        + (f" e <b>{n_already_ok} confirmado(s) já correto(s)</b> após revisão do service (falso positivo do achado inicial, que só olhou o controller)" if n_already_ok else "")
        + f". As correções foram verificadas com build limpo (<font face='Courier' size='7.6'>nest build</font>) "
        f"e suíte de testes completa (576/576 testes, 83 suítes). Os detalhes de cada correção estão "
        f"na seção \"Achados detalhados\", campo <b>Correção aplicada</b>."
    )
    story.append(Spacer(1, 0.15 * cm))
    story.append(para(remediation_text, "Body"))
    story.append(Spacer(1, 0.3 * cm))

    donut_buf = build_donut_severity()
    bar_buf = build_bar_category()
    donut_img = Image(donut_buf, width=7.2 * cm, height=7.2 * cm)
    tbl_sev = severity_summary_table()
    row = Table([[donut_img, tbl_sev]], colWidths=[8.4 * cm, 6.6 * cm])
    row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (1, 0), "CENTER")]))
    story.append(row)

    story.append(Spacer(1, 0.4 * cm))
    story.append(para("Achados por categoria", "H2"))
    bar_img = Image(bar_buf, width=15.0 * cm, height=8.1 * cm)
    story.append(bar_img)
    story.append(PageBreak())


def build_strengths_weaknesses(story):
    story.append(para("Pontos fortes verificados", "H1"))
    story.append(para(
        "Os itens abaixo foram lidos e confirmados diretamente no código durante a auditoria — não "
        "são suposições. Eles demonstram a cobertura real do trabalho e servem de linha de base para "
        "não regredir esses comportamentos em mudanças futuras.", "Body"))
    story.append(Spacer(1, 0.15 * cm))

    rows = [[Paragraph("<b>Área</b>", styles["CellBold"]), Paragraph("<b>Arquivo:linha</b>", styles["CellBold"]), Paragraph("<b>Verificado</b>", styles["CellBold"])]]
    for area, loc, desc in STRENGTHS:
        rows.append([Paragraph(esc(area), styles["Cell"]), Paragraph(esc(loc), styles["Cell"]), Paragraph(esc(desc), styles["Cell"])])
    tbl = Table(rows, colWidths=[3.6 * cm, 4.6 * cm, 7.8 * cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#059669")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0FDF4")]),
    ]))
    story.append(tbl)
    story.append(PageBreak())

    story.append(para("Riscos centrais (fraquezas)", "H1"))
    story.append(para(
        "<font color='#059669'><b>Todos os itens abaixo já foram corrigidos</b></font> no mesmo dia "
        "da auditoria (ver \"Status de remediação\" no resumo executivo e o campo \"Correção aplicada\" "
        "em cada achado detalhado). Mantidos aqui como registro do estado encontrado originalmente.", "BodySmall"))
    story.append(Spacer(1, 0.15 * cm))
    weaknesses = [
        ("XSS em templates de e-mail transacional", "5 achados (1 crítico, 1 alto, 3 baixos/médios) — "
         "vários templates de e-mail interpolam nome de usuário/paciente sem escapeHtml(), incluindo "
         "um ponto acessível sem autenticação (formulário público de agendamento)."),
        ("Endpoint de criação de template sem verificação de privilégio", "POST /templates permite a "
         "qualquer conta autenticada criar conteúdo marcado isDefault:true em uma tabela global, sem "
         "AdminGuard — risco de envenenamento de conteúdo servido a outros usuários."),
        ("Validação de segredos de produção incompleta", "A checagem de startup valida comprimento mas "
         "não valor — os placeholders do próprio .env.example passam despercebidos se copiados sem "
         "edição."),
        ("Desvios pontuais de padrão já estabelecido no projeto", "Comparação de token não-constante em "
         "1 webhook, quando o padrão timing-safe correto já existe e é usado em outro webhook do mesmo "
         "repositório — indica falta de um helper compartilhado obrigatório."),
    ]
    for title, desc in weaknesses:
        story.append(para(f"<b>{title}</b> — {desc}", "Body"))
    story.append(PageBreak())


STATUS_LABEL = {"corrigido": "Corrigido", "ja_correto": "Já correto"}
STATUS_COLOR = {"corrigido": "#059669", "ja_correto": "#0F766E"}


def findings_table_for_category(cat_id):
    items = [f for f in FINDINGS if f["categoria"] == cat_id]
    if not items:
        return None
    rows = [[Paragraph("<b>Sev.</b>", styles["CellBold"]), Paragraph("<b>Status</b>", styles["CellBold"]), Paragraph("<b>Arquivo:linha</b>", styles["CellBold"]), Paragraph("<b>Descrição</b>", styles["CellBold"])]]
    for f in items:
        status = f.get("status")
        rows.append([
            chip(SEV_LABEL.get(f["severidade"], f["severidade"].title()), COLORS.get(f["severidade"], "#6B7280")),
            chip(STATUS_LABEL.get(status, "—"), STATUS_COLOR.get(status, "#6B7280")) if status else Paragraph("—", styles["Cell"]),
            Paragraph(f'{esc(f["id"])} — {esc(f["arquivo"])}' + (f'<br/>{esc(f["arquivo2"])}' if f.get("arquivo2") else ""), styles["Cell"]),
            Paragraph(f'<b>{esc(f["titulo"])}</b><br/>{esc(f["descricao"])}', styles["Cell"]),
        ])
    tbl = Table(rows, colWidths=[2.2 * cm, 2.3 * cm, 3.9 * cm, 7.6 * cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ]))
    return tbl


def build_detailed_findings(story):
    story.append(para("Achados detalhados por categoria", "H1"))
    for cat_id in sorted(CATEGORIES.keys()):
        items = [f for f in FINDINGS if f["categoria"] == cat_id]
        story.append(para(f"{cat_id}. {CATEGORIES[cat_id]}", "H2"))
        if not items:
            story.append(para(
                "Nenhum achado nesta categoria. Cobertura confirmada: todos os handlers relevantes "
                "foram lidos e os pontos verificados como corretos estão listados na seção "
                "\"Pontos fortes verificados\".", "Body"))
            continue
        tbl = findings_table_for_category(cat_id)
        story.append(tbl)
        story.append(Spacer(1, 0.25 * cm))

        # Evidence blocks (code excerpts) per finding
        for f in items:
            status = f.get("status")
            status_txt = f' — <font color="{STATUS_COLOR.get(status, "#6B7280")}"><b>{STATUS_LABEL.get(status, "")}</b></font>' if status else ""
            story.append(para(f'{esc(f["id"])} — Evidência e exploração{status_txt}', "H3"))
            story.append(Preformatted(wrap_code(f["trecho"]), styles["Mono"]))
            story.append(Spacer(1, 0.08 * cm))
            story.append(para(f'<b>Por que é explorável:</b> {esc(f["exploracao"])}', "BodySmall"))
            story.append(para(f'<b>Condições de explorabilidade:</b> {esc(f["condicoes"])}', "BodySmall"))
            if status == "corrigido" and f.get("correcao_aplicada"):
                story.append(para(f'<b>Correção aplicada:</b> {esc(f["correcao_aplicada"])}', "BodySmall"))
            elif status == "ja_correto" and f.get("correcao_aplicada"):
                story.append(para(f'<b>Observação:</b> {esc(f["correcao_aplicada"])}', "BodySmall"))
            story.append(Spacer(1, 0.2 * cm))
    story.append(PageBreak())


def build_recommendations(story):
    story.append(para("Recomendações priorizadas", "H1"))
    story.append(para(
        "Ordenadas por prioridade de correção (P1 = corrigir primeiro). O agrupamento por achado "
        "(coluna \"Refs.\") indica quais itens da seção anterior cada recomendação resolve.", "Body"))
    story.append(Spacer(1, 0.15 * cm))
    rows = [[Paragraph("<b>Prior.</b>", styles["CellBold"]), Paragraph("<b>Recomendação</b>", styles["CellBold"]), Paragraph("<b>Refs.</b>", styles["CellBold"]), Paragraph("<b>Justificativa</b>", styles["CellBold"])]]
    prio_bg = {"P1": "#B91C1C", "P2": "#D97706", "P3": "#2563EB"}
    for prio, rec, refs, why in RECOMMENDATIONS:
        rows.append([chip(prio, prio_bg[prio]), Paragraph(esc(rec), styles["Cell"]), Paragraph(esc(refs), styles["Cell"]), Paragraph(esc(why), styles["Cell"])])
    tbl = Table(rows, colWidths=[1.7 * cm, 5.3 * cm, 2.1 * cm, 6.9 * cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ]))
    story.append(tbl)
    story.append(PageBreak())


# ---------------------------------------------------------------------------
# GitHub issues
# ---------------------------------------------------------------------------
ISSUES = [
    {
        "title": "[Segurança] XSS armazenado em e-mails de indicação (referral) via nome de usuário não escapado",
        "labels": "security, critical",
        "refs": ["F01"],
        "body": """## Problema
`sendReferralWelcomeBonus` e `sendReferralReward` em `backend/src/modules/email/email.service.ts:387-419` interpolam o nome do usuário direto em HTML (`<strong>${referredName}</strong>`) sem passar por `escapeHtml()`, ao contrário de outros templates do mesmo arquivo que já escapam corretamente.

Os nomes vêm de `backend/src/modules/referral/referral.service.ts:84-88` e `:109-113`, sem sanitização entre a origem (perfil do usuário) e o template.

## Por que é explorável
O usuário A define o próprio nome de cadastro/perfil como um payload HTML (ex: `<img src=x onerror=...>`). Quando o usuário B usa o link de indicação de A, B recebe um e-mail com o nome de A cru. Quando B qualifica a indicação, A recebe um e-mail com o nome de B cru. **Atacante e vítima são contas diferentes.**

## Evidência
`backend/src/modules/email/email.service.ts:387-419`
```ts
html: this.wrap(`<p>Olá, ${referredName}! ...</p>` /* sem escapeHtml */)
```
`backend/src/modules/referral/referral.service.ts:84-88`
```ts
await this.email.sendReferralWelcomeBonus(
  newUser.name, newUser.email, master.referrer?.name ?? 'um colega'
)
```

## Impacto
Injeção de HTML arbitrário no corpo de um e-mail transacional recebido por outra conta — phishing visual, links falsos, defacement do template. Impacto de execução de script é parcialmente mitigado por sanitização de clientes de e-mail modernos, mas não deve ser a única defesa.

## Sugestão de correção
Aplicar `this.escapeHtml()` (já existente e usado em outros templates do mesmo arquivo) a `referredName` e a qualquer outro campo de nome interpolado nesses dois métodos.

## Critérios de aceite
- [ ] `sendReferralWelcomeBonus` escapa `referredName` (e demais campos de usuário) antes de interpolar no HTML
- [ ] `sendReferralReward` escapa `referrerName`/`referredName` antes de interpolar no HTML
- [ ] Teste automatizado cobrindo um nome contendo `<`, `>`, `&`, `"` confirmando que o HTML final não contém tags não escapadas
""",
    },
    {
        "title": "[Segurança] XSS via nome de paciente não autenticado no e-mail de solicitação de agendamento",
        "labels": "security, high",
        "refs": ["F02"],
        "body": """## Problema
`sendBookingRequest` em `backend/src/modules/email/email.service.ts:253-268` interpola `patientName`, `date` e `time` direto no HTML sem `escapeHtml()`. `patientName` vem do formulário público de agendamento (sem login).

## Por que é explorável
É a superfície de XSS mais exposta do sistema: o atacante **não precisa de conta**, só precisa preencher o campo nome do formulário público de agendamento (`/agendar/:slug`) com um payload HTML/JS. A vítima é o psicólogo dono da agenda, que recebe o e-mail com o payload não escapado.

## Evidência
`backend/src/modules/notifications/notifications.service.ts:1479-1484`
```ts
await this.email.sendBookingRequest(
  booking.patientName, page.psychologist.email, booking.date, booking.time, confirmUrl
)
```
`backend/src/modules/email/email.service.ts:253-268`
```ts
html: this.wrap(`<p>...<strong>${patientName}</strong> solicitou agendamento para <strong>${date}</strong> às <strong>${time}</strong>...</p>`)
```

## Impacto
Injeção de HTML/possível XSS contra o e-mail do psicólogo a partir de um input 100% não autenticado — maior prioridade de correção entre os achados de XSS.

## Sugestão de correção
Aplicar `escapeHtml()` a `patientName`, `date` e `time` em `sendBookingRequest` antes da interpolação.

## Critérios de aceite
- [ ] `sendBookingRequest` escapa `patientName` antes de interpolar no HTML
- [ ] Teste automatizado com nome contendo payload HTML confirmando saída escapada
- [ ] Revisão dos demais campos vindos do formulário público (`date`, `time`) quanto à mesma proteção
""",
    },
    {
        "title": "[Segurança] Templates de e-mail restantes sem escapeHtml (confirmação de agendamento, envio de documento, boas-vindas)",
        "labels": "security, medium",
        "refs": ["F04", "F08", "F09"],
        "body": """## Problema
Além dos dois casos críticos/altos já reportados em issues separadas, outros templates de e-mail em `backend/src/modules/email/email.service.ts` também interpolam campos de usuário sem `escapeHtml()`:

- `sendBookingConfirmation`, ramo padrão sem mensagem customizada (`:280-283`) — cross-user quando o profissional cria o agendamento em nome do paciente.
- `sendDocumentEmail` (`:456-492`) — `recipientName`, `docTitle`, `psychologistName` sem escape; cross-user (profissional → paciente).
- `sendWelcome`, `sendPasswordReset`, `sendEmailVerification`, `sendTrialEndingReminder` (linhas 189, 215, 238, 375) — sem escape, mas self-XSS (destinatário é o próprio dono do nome).

## Por que é explorável
Mesma classe de falta de tratamento de input das issues F01/F02, com impacto e probabilidade menores (self-XSS ou requer que o atacante seja o profissional, não o paciente). Agrupados aqui por serem correções mecânicas idênticas em pontos de menor exposição.

## Evidência
`backend/src/modules/email/email.service.ts:280-283`
```ts
: `<p>Olá, ${patientName.split(' ')[0]}! Sua sessão para <strong>${date}</strong> às <strong>${time}</strong> foi confirmada.</p>`
```
`backend/src/modules/email/email.service.ts:456-492` (`sendDocumentEmail`)
```ts
html: this.wrap(`<p>Olá, ${opts.recipientName}. Segue em anexo o documento <strong>${opts.docTitle}</strong>, emitido por <strong>${opts.psychologistName}</strong> ...`)
```

## Impacto
Baixo a médio — a maioria dos cenários é self-XSS; `sendDocumentEmail` é cross-user mas exige que o profissional (não o paciente) seja o atacante.

## Sugestão de correção
Aplicar `escapeHtml()` de forma consistente em todos os campos de usuário interpolados nesses 6 métodos, seguindo o padrão já usado em `sendBookingCancellation`/`sendSessionReminder`/`sendProUpgradeOffer` no mesmo arquivo.

## Critérios de aceite
- [ ] `sendBookingConfirmation` (ramo padrão) escapa `patientName`/`date`/`time`
- [ ] `sendDocumentEmail` escapa `recipientName`/`docTitle`/`psychologistName`
- [ ] `sendWelcome`/`sendPasswordReset`/`sendEmailVerification`/`sendTrialEndingReminder` escapam `name`/`firstName`
- [ ] Considerar extrair um helper de template (`safeInterpolate`) para eliminar a classe inteira de erro futura
""",
    },
    {
        "title": "[Segurança] POST /templates sem AdminGuard permite envenenar template global padrão",
        "labels": "security, high",
        "refs": ["F03"],
        "body": """## Problema
`backend/src/modules/templates/templates.controller.ts:24-28` expõe `POST /templates` protegido apenas por `JwtAuthGuard` + `CsrfGuard` (sem `AdminGuard`). A entidade `Template` não tem coluna de tenant — é uma tabela global servida a todos os usuários via `findAll()`/`findByType()`. `CreateTemplateDto` aceita `isDefault?: boolean` livremente.

## Por que é explorável
Qualquer conta autenticada (mesmo plano Free) pode criar um template com `isDefault: true` e conteúdo malicioso/phishing. Como o seed só roda em `onModuleInit` e `findByType()` ordena por `createdAt ASC`, o template do atacante passa a coexistir com os defaults reais e pode ser servido a **outros psicólogos**, inserindo conteúdo controlado pelo atacante em documentos/recibos/mensagens de WhatsApp que outros profissionais enviam a seus próprios pacientes.

## Evidência
`backend/src/modules/templates/templates.controller.ts:24-28`
```ts
@Post()
@UseGuards(JwtAuthGuard, CsrfGuard)
create(@Body() dto: CreateTemplateDto) {
  return this.templates.create(dto)
}
```
`backend/src/modules/templates/dto/create-template.dto.ts:19-21`
```ts
isDefault?: boolean
```

## Impacto
Conteúdo controlado por um atacante servido a outros usuários do produto (não apenas ao próprio atacante) — phishing, desinformação, ou quebra de confiança em documentos/recibos oficiais gerados pela plataforma.

## Sugestão de correção
Adicionar `AdminGuard` a `POST /templates` (e a qualquer outra mutação que aceite `isDefault: true`), ou introduzir um escopo de tenant para templates criados por usuários comuns, mantendo `isDefault` restrito a administradores.

## Critérios de aceite
- [ ] `POST /templates` exige `AdminGuard` (ou `isDefault` é ignorado/forçado a `false` para não-admins)
- [ ] Teste automatizado confirmando 403 para usuário comum tentando setar `isDefault: true`
- [ ] Auditoria manual dos templates atualmente marcados `isDefault: true` no banco de produção, para confirmar que nenhum foi criado por conta não-admin
""",
    },
    {
        "title": "[Segurança] Validação de startup não rejeita os valores-placeholder do .env.example para segredos críticos",
        "labels": "security, medium",
        "refs": ["F05"],
        "body": """## Problema
`backend/src/main.ts:25-33` rejeita o boot se `JWT_SECRET`/`SIGN_SECRET`/`ENCRYPTION_KEY` tiverem menos de 32 caracteres — mas os placeholders do próprio `backend/.env.example` (linhas 16, 23, 77) já têm mais de 32 caracteres, então passam na validação sem serem trocados.

## Por que é explorável
Se alguém copiar `.env.example` para `.env` em produção sem editar os valores, o boot passa normalmente com um segredo previsível e público (está no repositório). Um atacante que leia o `.env.example` forjaria JWTs válidos, assinaturas de documento e leria dados "criptografados" com a chave conhecida.

## Evidência
`backend/.env.example:16,23,77`
```
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
SIGN_SECRET=your-sign-secret-key-change-in-production-min-32-chars
ENCRYPTION_KEY=change-this-encryption-secret-min-32-chars
```

## Impacto
Compromisso total de autenticação/assinatura/criptografia se o erro operacional ocorrer — severidade condicional, mas alta caso se materialize.

## Sugestão de correção
Em `main.ts`, além do comprimento, comparar o valor lido contra a lista de placeholders conhecidos do `.env.example` e falhar o boot se houver coincidência.

## Critérios de aceite
- [ ] Boot falha se `JWT_SECRET`/`SIGN_SECRET`/`ENCRYPTION_KEY` for igual a um dos placeholders documentados
- [ ] Mensagem de erro clara indicando que o valor precisa ser gerado com `openssl rand -hex 32`
- [ ] Teste automatizado cobrindo o cenário de placeholder não trocado
""",
    },
    {
        "title": "[Segurança] Comparação de token não constant-time no webhook de prospecção",
        "labels": "security, medium",
        "refs": ["F07"],
        "body": """## Problema
`backend/src/modules/prospecting/webhooks/prospecting-webhook.controller.ts:29` usa `token !== expectedSecret` (comparação de string simples) em vez de `crypto.timingSafeEqual`, diferente do webhook do WhatsApp Cloud no mesmo repositório, que já usa comparação timing-safe corretamente.

## Por que é explorável
Permite teoricamente um ataque de timing para recuperar `PROSPECTING_WEBHOOK_SECRET` byte a byte. Viabilidade prática depende de jitter de rede/infra (risco baixo-médio em produção real), mas é um desvio do padrão correto já estabelecido no mesmo código.

## Evidência
`backend/src/modules/prospecting/webhooks/prospecting-webhook.controller.ts:29`
```ts
if (token !== expectedSecret) {
```

## Sugestão de correção
Trocar por `crypto.timingSafeEqual`, seguindo o padrão de `whatsapp-cloud-webhook.controller.ts:52-63` (checando comprimento antes da comparação para evitar exceção por tamanhos diferentes).

## Critérios de aceite
- [ ] Comparação usa `timingSafeEqual` com checagem de comprimento prévia
- [ ] Teste automatizado confirmando rejeição de token inválido de mesmo comprimento e de comprimento diferente
""",
    },
    {
        "title": "[Segurança] setApproved (depoimentos) não valida consentimento público no backend — risco de compliance/LGPD",
        "labels": "security, low, compliance",
        "refs": ["F12"],
        "body": """## Problema
`backend/src/modules/testimonial/testimonial.controller.ts:44-51` (`PATCH /feedback/admin/testimonials/:id`) não valida no backend se `body.approvedForPublic === true` só é permitido quando `publicConsent` do usuário é verdadeiro — essa regra existe apenas como botão desabilitado no frontend (`TestimonialsPage.tsx:44`).

## Por que é explorável
Não é uma escalação de privilégio (a rota já exige `AdminGuard`). É um risco de compliance/LGPD: um admin (ou um script/erro operacional) que chame a rota diretamente poderia publicar um depoimento sem o consentimento explícito do usuário.

## Evidência
`backend/src/modules/testimonial/testimonial.controller.ts:44-51`
```ts
@Patch('admin/testimonials/:id')
@UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
setApproved(@Param('id') id: string, @Body() dto: SetApprovedDto) { ... }
```

## Sugestão de correção
Adicionar checagem no service: rejeitar `approvedForPublic: true` se `publicConsent` do registro não for verdadeiro.

## Critérios de aceite
- [ ] Backend rejeita (400/403) tentativa de aprovar depoimento público sem `publicConsent: true`
- [ ] Teste automatizado cobrindo o cenário
""",
    },
    {
        "title": "[Segurança] Pequenos endurecimentos: e-mail admin hardcoded, entropia de signCode, RequirePlan ausente em preferences, duplicação de AdminGuard, fallback de token legado",
        "labels": "security, low",
        "refs": ["F06", "F10", "F11", "F13", "F14"],
        "body": """## Problema
Cinco desvios de baixa severidade, agrupados por serem correções pequenas e independentes:

1. **E-mail admin hardcoded** — `backend/src/common/guards/admin.guard.ts:4` e `backend/src/modules/billing/billing.controller.ts:128` usam `process.env.ADMIN_EMAILS ?? 'gilsonfilho96@outlook.com'` como fallback, concedendo privilégio de admin silenciosamente se a env var não for configurada.
2. **Entropia de signCode** — `backend/src/modules/documents/documents.service.ts:56-67` usa só 8 hex chars (32 bits) do HMAC para o código de verificação pública de documentos.
3. **RequirePlan ausente em preferences** — `backend/src/modules/auth/auth.controller.ts:224-229` permite gravar preferências de cobrança automática (Pro) mesmo para contas Free, embora a ação real de disparo já seja corretamente bloqueada no ponto de execução (`NotificationsService.sendWhatsApp`).
4. **Duplicação de AdminGuard** — `backend/src/modules/billing/billing.controller.ts:100-133` reimplementa a checagem de admin em vez de reusar `AdminGuard`.
5. **Fallback de token legado** — `backend/src/modules/booking/booking.service.ts:499-503,960-979` ainda compara `confirmationToken` em texto puro além do hash, para compatibilidade com registros antigos.

## Por que é explorável
Nenhum item é explorável isoladamente por um usuário comum hoje — são todos reforços de defesa em profundidade ou reduções de superfície residual.

## Sugestão de correção
- (1) Remover o fallback hardcoded; falhar o boot se `ADMIN_EMAILS` ausente em produção.
- (2) Aumentar `signCode` para 12-16 hex chars.
- (3) Adicionar `@RequirePlan('pro')` em `PATCH /auth/preferences` para os campos de cobrança automática.
- (4) Trocar `isMetricsAdmin()` por `@UseGuards(JwtAuthGuard, AdminGuard)` em `GET /billing/metrics`.
- (5) Confirmar ausência de registros legados com token em texto puro e remover o fallback.

## Critérios de aceite
- [ ] `ADMIN_EMAILS` obrigatória em produção (main.ts falha sem ela)
- [ ] `signCode` usa 12-16 hex chars
- [ ] `PATCH /auth/preferences` exige plano Pro para campos de cobrança automática
- [ ] `GET /billing/metrics` usa `AdminGuard`
- [ ] Fallback de token em texto puro removido (após confirmação de que não há registros legados)
""",
    },
]


def inline_md(text):
    """Escape then apply minimal inline markdown (**bold**, `code`) for a Paragraph."""
    t = esc(text)
    # `code` -> monospace font (do before ** so code spans aren't touched by bold regex)
    t = re.sub(r"`([^`]+)`", r'<font face="Courier" size="7.6">\1</font>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    return t


def render_markdown_body(text):
    """Render a markdown-ish issue body into wrapped flowables (headers, paragraphs,
    checklist bullets, and fenced ```code``` blocks kept as Preformatted)."""
    flows = []
    lines = text.strip("\n").split("\n")
    buf = []
    in_code = False
    code_buf = []

    def flush_para():
        if buf:
            joined = " ".join(l.strip() for l in buf if l.strip())
            if joined:
                flows.append(Paragraph(inline_md(joined), styles["Body"]))
            buf.clear()

    def flush_code():
        if code_buf:
            flows.append(Preformatted(wrap_code("\n".join(code_buf)), styles["Mono"]))
            flows.append(Spacer(1, 0.08 * cm))
            code_buf.clear()

    for raw in lines:
        line = raw.rstrip()
        if line.strip().startswith("```"):
            if in_code:
                flush_code()
                in_code = False
            else:
                flush_para()
                in_code = True
            continue
        if in_code:
            code_buf.append(line)
            continue
        if not line.strip():
            flush_para()
            continue
        if line.startswith("## "):
            flush_para()
            flows.append(Paragraph(inline_md(line[3:]), styles["H3"]))
            continue
        if line.strip().startswith("- [ ]") or line.strip().startswith("- [x]"):
            flush_para()
            flows.append(Paragraph("&#9744; " + inline_md(line.strip()[5:].strip()), styles["Body"]))
            continue
        if line.strip().startswith("- "):
            flush_para()
            flows.append(Paragraph("• " + inline_md(line.strip()[2:]), styles["Body"]))
            continue
        buf.append(line)
    flush_para()
    flush_code()
    return flows


def build_github_issues(story):
    story.append(para("Issues para o GitHub", "H1"))
    story.append(para(
        "Texto pronto para colar em issues do GitHub — um bloco por issue, delimitado por "
        "<font face='Courier'>--- ISSUE n ---</font> / <font face='Courier'>--- FIM ISSUE n ---</font>. "
        "Achados triviais relacionados foram agrupados na mesma issue para evitar spam.", "Body"))
    story.append(para(
        "<font color='#059669'><b>Nota:</b></font> todas as issues abaixo referem-se a achados que já "
        "foram corrigidos no código no mesmo dia desta auditoria (31/08/2026). O texto é mantido como "
        "registro pronto para abrir no GitHub já como issue fechada/histórico de correção, ou para "
        "servir de changelog — não representa mais um problema em aberto.", "BodySmall"))
    story.append(Spacer(1, 0.2 * cm))

    for i, issue in enumerate(ISSUES, start=1):
        block = [Preformatted(f"--- ISSUE {i} ---", styles["IssueMono"])]
        header_tbl = Table(
            [[Paragraph(f"<b>Título:</b> {esc(issue['title'])}", styles["Cell"])],
             [Paragraph(f"<b>Labels sugeridas:</b> {esc(issue['labels'])}", styles["Cell"])],
             [Paragraph(f"<b>Refs. achados:</b> {esc(', '.join(issue['refs']))}", styles["Cell"])]],
            colWidths=[16.9 * cm],
        )
        header_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        block.append(header_tbl)
        block.append(Spacer(1, 0.15 * cm))
        block.extend(render_markdown_body(issue["body"]))
        block.append(Preformatted(f"--- FIM ISSUE {i} ---", styles["IssueMono"]))
        block.append(Spacer(1, 0.4 * cm))
        # Keep the issue header glued together; body can flow across pages.
        story.append(block[0])
        story.append(block[1])
        story.extend(block[2:])


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    doc = SimpleDocTemplate(
        OUT_PDF, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
        title=REPORT_NAME, author="Auditoria de Segurança psicoSAAS",
    )
    story = []
    build_cover(story)
    build_executive_summary(story)
    build_strengths_weaknesses(story)
    build_detailed_findings(story)
    build_recommendations(story)
    build_github_issues(story)

    def on_page(canvas, doc_):
        header_footer(canvas, doc_)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF gerado: {OUT_PDF}")


if __name__ == "__main__":
    main()
